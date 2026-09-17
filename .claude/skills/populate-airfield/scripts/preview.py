"""Étape 4 — page HTML autonome de relecture des données à insérer.

    python3 .claude/skills/populate-airfield/scripts/preview.py LFBJ

Écrit tmp/{ICAO}-preview.html : fiches, carte, et cases à cocher qui produisent
un bloc de retours à recoller dans le chat (cf. SKILL.md § Étape 5).
"""
import html
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
from validate import TYPE_CATEGORY  # noqa: E402


def render(node):
    """ProseMirror → HTML (schéma prompts/schema.md : doc, paragraph, text(+link), image)."""
    if node is None:
        return ''
    t = node.get('type')
    if t == 'doc':
        return ''.join(render(x) for x in node.get('content', []))
    if t == 'paragraph':
        inner = ''.join(render(x) for x in node.get('content', []))
        return f'<p>{inner}</p>' if inner else ''
    if t == 'text':
        text = html.escape(node.get('text', ''))
        for mark in node.get('marks', []):
            if mark.get('type') == 'link':
                href = html.escape(mark.get('attrs', {}).get('href', ''), quote=True)
                text = f'<a href="{href}" target="_blank" rel="noopener noreferrer nofollow">{text}</a>'
        return text
    if t == 'image':
        attrs = node.get('attrs', {})
        src = html.escape(attrs.get('src', ''), quote=True)
        alt = html.escape(attrs.get('alt') or '', quote=True)
        return f'<img src="{src}" alt="{alt}" loading="lazy">'
    return ''  # type inconnu : ignorer


def badge(label, cls='badge'):
    return f'<span class="{cls}">{html.escape(label)}</span>'


def osm_link(pos):
    lat, lon = pos.get('latitude'), pos.get('longitude')
    url = f'https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=15/{lat}/{lon}'
    return f'<a href="{url}" target="_blank" rel="noopener">{lat}, {lon}</a>'


def dup_index(activities, existing):
    """id d'activité → (nom en base, id en base) pour les doublons probables."""
    out = {}
    for a in activities:
        n = c.norm(a.get('name', ''))
        p = a.get('position') or {}
        for e in existing:
            near = (p.get('latitude') is not None
                    and abs(p['latitude'] - e['latitude']) < 0.0005
                    and abs(p['longitude'] - e['longitude']) < 0.0005)
            if c.similar_names(n, c.norm(e.get('name', ''))) or near:
                out[a.get('id')] = (e.get('name'), e.get('id'))
                break
    return out


def build(icao):
    af_path, act_path = c.tmp_path(icao, 'airfield.json'), c.tmp_path(icao, 'activities.json')
    ctx_path = c.tmp_path(icao, 'context.json')
    airfield = json.load(open(af_path)) if os.path.exists(af_path) else None
    activities = json.load(open(act_path)) if os.path.exists(act_path) else None
    ctx = json.load(open(ctx_path)) if os.path.exists(ctx_path) else {}

    entry = c.load_airfield(icao)
    clat, clon = c.center(entry)
    ville = ctx.get('city') or c.title_case(entry['name'])
    dups = dup_index(activities or [], ctx.get('existing_activities', []))

    parts = []

    if airfield:
        badges = [badge(f) for f in airfield.get('fuels', [])]
        toilet_map = {'public': 'Toilettes : publiques', 'private': 'Toilettes : privées',
                      'no': 'Toilettes : non'}
        if 'toilet' in airfield:
            badges.append(badge(toilet_map.get(airfield['toilet'], f"Toilettes : {airfield['toilet']}")))
        if airfield.get('nightVFR'):
            badges.append(badge('VFR de nuit'))
        website = ''
        if airfield.get('website'):
            w = html.escape(airfield['website'], quote=True)
            website = (f'<p class="website"><a href="{w}" target="_blank" rel="noopener">'
                       f'{html.escape(airfield["website"])}</a></p>')
        parts.append(f'''<section class="card airfield">
      <h2>Aérodrome {html.escape(icao)}</h2>
      <div class="badges">{''.join(badges) or '<em>aucun champ</em>'}</div>
      {website}
      <div class="desc">{render(airfield.get('description'))}</div>
    </section>''')

    map_points = []
    for i, a in enumerate(activities or [], 1):
        p = a.get('position') or {}
        if p.get('latitude') is not None and p.get('longitude') is not None:
            map_points.append({'i': i, 'name': a.get('name', a.get('id', '?')),
                               'lat': p['latitude'], 'lon': p['longitude']})
    map_center = {'lat': clat, 'lon': clon, 'icao': icao}
    parts.append('<section><h2>Carte</h2><div id="map"></div></section>')

    if activities:
        cards = []
        for i, a in enumerate(activities, 1):
            aid = html.escape(a.get('id', ''), quote=True)
            name = html.escape(a.get('name', a.get('id', '?')))
            types = ''.join(badge(t) for t in a.get('type', []))
            website = ''
            if a.get('website'):
                w = html.escape(a['website'], quote=True)
                website = (f'<p class="website"><a href="{w}" target="_blank" rel="noopener">'
                           f'{html.escape(a["website"])}</a></p>')
            p = a.get('position') or {}
            flags = ''
            dist = ''
            if p.get('latitude') is not None:
                d = c.dist_km(clat, clon, p['latitude'], p['longitude'])
                cats = {TYPE_CATEGORY[t] for t in (a.get('type') or []) if t in TYPE_CATEGORY}
                limit = max((c.CATEGORY_RADIUS_KM[x] for x in cats),
                            default=c.CATEGORY_RADIUS_KM['poi'])
                over = d > limit + c.RADIUS_TOLERANCE_KM
                cls = 'dist over' if over else 'dist'
                dist = f'<span class="{cls}">✈ {d:.1f} km (max {limit} km)</span>'
                if over:
                    flags += badge(f'hors rayon — {d:.1f} km', 'warn')
            if a.get('id') in dups:
                old_name, old_id = dups[a['id']]
                flags += badge(f'doublon possible : {old_name}', 'warn')
            if not c.has_image(a):
                flags += badge('sans image', 'warn')
            pos = f'<p class="pos">📍 {osm_link(p)} {dist}</p>' if p else ''
            cards.append(f'''<article class="card activity" data-id="{aid}" data-name="{name}">
          <div class="cardhead"><span class="idx">#{i}</span><h3>{name}</h3></div>
          <div class="badges">{types}</div>
          <div class="badges">{flags}</div>
          <div class="desc">{render(a.get('description'))}</div>
          {pos}
          {website}
          <div class="controls">
            <label class="chk del"><input type="checkbox" class="c-del"> 🗑 Supprimer</label>
            <label class="chk imp"><input type="checkbox" class="c-imp"> ✏️ À améliorer</label>
            <input type="text" class="note" placeholder="note (ce qu'il faut corriger / ajouter)…">
          </div>
        </article>''')
        parts.append(f'''<section>
      <h2>Activités à insérer ({len(activities)})</h2>
      <div class="grid">{''.join(cards)}</div>
    </section>''')

    body = '\n'.join(parts) or '<p><em>Aucune donnée à afficher.</em></p>'
    return body, map_points, map_center, ville


TOOLBAR = '''
<div class="toolbar">
  <div class="tbrow">
    <strong>Retours de relecture</strong>
    <span class="hint">Coche les cartes (Supprimer / À améliorer), puis copie le bloc et colle-le dans le chat.</span>
    <button id="copybtn" onclick="copyOut()">📋 Copier</button>
  </div>
  <textarea id="out" readonly rows="4" onclick="this.select()"></textarea>
</div>'''

SCRIPT = r'''
<script>
function build(){
  const del=[], imp=[];
  document.querySelectorAll('article.activity').forEach(a=>{
    const id=a.dataset.id, name=a.dataset.name;
    const note=(a.querySelector('.note').value||'').trim();
    if(a.querySelector('.c-del').checked){ del.push(id); }
    if(a.querySelector('.c-imp').checked){ imp.push('- '+id+(note?' : '+note:'')+'  ('+name+')'); }
  });
  let out='';
  if(del.length) out+='SUPPRIMER: '+del.join(', ')+'\n';
  if(imp.length) out+='AMÉLIORER:\n'+imp.join('\n')+'\n';
  if(!out) out='(rien de coché — coche « Supprimer » ou « À améliorer » sur les cartes)';
  document.getElementById('out').value=out;
}
function copyOut(){
  const t=document.getElementById('out'); t.select();
  navigator.clipboard.writeText(t.value).then(()=>{
    const b=document.getElementById('copybtn'); const o=b.textContent;
    b.textContent='✓ Copié'; setTimeout(()=>b.textContent=o,1500);
  });
}
document.addEventListener('change',e=>{ if(e.target.matches('.c-del,.c-imp')) build(); });
document.addEventListener('input',e=>{ if(e.target.matches('.note')) build(); });
document.addEventListener('DOMContentLoaded',build);
</script>'''

MAP_JS = r'''
(function(){
  if (typeof L === 'undefined') return;
  var map = L.map('map', { scrollWheelZoom: false });
  // Fond de carte CARTO et non les serveurs de tuiles publics d'OpenStreetMap :
  // ceux-ci sont une ressource communautaire dont la politique d'usage exclut les
  // applications non identifiables. Un aperçu ouvert en file:// n'envoie aucun
  // Referer et finit bloqué (tuile « 403 App is not following the tile usage policy »).
  L.tileLayer('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    detectRetina: true,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      + ' contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);
  var bounds = [];
  if (MAP_CENTER) {
    L.marker([MAP_CENTER.lat, MAP_CENTER.lon], {
      icon: L.divIcon({ className: 'apmark', html: '✈', iconSize: [28,28], iconAnchor: [14,14] })
    }).addTo(map).bindPopup('Aérodrome ' + MAP_CENTER.icao);
    bounds.push([MAP_CENTER.lat, MAP_CENTER.lon]);
  }
  MAP_POINTS.forEach(function(p){
    L.marker([p.lat, p.lon], {
      icon: L.divIcon({ className: 'nummark', html: String(p.i), iconSize: [24,24], iconAnchor: [12,12] })
    }).addTo(map).bindPopup('#' + p.i + ' ' + p.name);
    bounds.push([p.lat, p.lon]);
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [30,30], maxZoom: 14 });
})();
'''

CSS = '''
  body { font-family: system-ui, sans-serif; max-width: 1100px; margin: 0 auto;
          padding: 1.5rem 1.5rem 12rem; color: #1a1a1a; line-height: 1.5; }
  header h1 { margin: 0 0 .25rem; }
  header .sub { color: #666; margin: 0 0 1.5rem; }
  h2 { border-bottom: 2px solid #eee; padding-bottom: .3rem; }
  .card { border: 1px solid #e2e2e2; border-radius: 10px; padding: 1rem 1.2rem; margin: 1rem 0;
           background: #fafafa; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem; }
  .grid .card { margin: 0; display: flex; flex-direction: column; }
  .cardhead { display: flex; align-items: baseline; gap: .5rem; }
  .cardhead h3 { margin: .2rem 0; flex: 1; }
  .idx { background: #495057; color: #fff; border-radius: 6px; padding: .05rem .45rem;
          font-size: .8rem; font-weight: 700; }
  .badges { display: flex; flex-wrap: wrap; gap: .4rem; margin: .5rem 0; }
  .badges:empty { display: none; }
  .badge { background: #1971c2; color: #fff; border-radius: 999px; padding: .1rem .7rem;
            font-size: .8rem; }
  .warn { background: #fff3bf; color: #8a6d00; border: 1px solid #f0c000; border-radius: 999px;
          padding: .1rem .7rem; font-size: .8rem; }
  .desc img, .card img { max-width: 100%; height: auto; border-radius: 8px; margin: .5rem 0; }
  .desc p { margin: .5rem 0; }
  .website a, .pos a { font-size: .85rem; }
  .pos { color: #444; }
  .dist { color: #1971c2; font-size: .8rem; margin-left: .4rem; white-space: nowrap; }
  .dist.over { color: #c92a2a; font-weight: 700; }
  .controls { margin-top: auto; padding-top: .6rem; border-top: 1px dashed #ddd; display: flex;
               flex-wrap: wrap; gap: .6rem; align-items: center; }
  .chk { font-size: .85rem; cursor: pointer; user-select: none; }
  .chk.del { color: #c92a2a; } .chk.imp { color: #e8590c; }
  .note { flex: 1 1 100%; padding: .3rem .5rem; border: 1px solid #ccc; border-radius: 6px;
           font-size: .85rem; }
  article.activity:has(.c-del:checked) { background: #fff0f0; border-color: #f3b0b0; opacity: .75; }
  article.activity:has(.c-imp:checked) { background: #fff7ee; border-color: #f6c68a; }
  .toolbar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff;
              border-top: 2px solid #1971c2; box-shadow: 0 -4px 12px rgba(0,0,0,.08);
              padding: .7rem 1.5rem; z-index: 10; }
  .toolbar .tbrow { display: flex; align-items: center; gap: .8rem; max-width: 1100px;
                     margin: 0 auto .4rem; }
  .toolbar .hint { color: #666; font-size: .85rem; flex: 1; }
  .toolbar textarea { width: 100%; max-width: 1100px; display: block; margin: 0 auto;
                       font-family: ui-monospace, monospace; font-size: .85rem; border: 1px solid #ccc;
                       border-radius: 6px; padding: .5rem; box-sizing: border-box; }
  #copybtn { background: #1971c2; color: #fff; border: 0; border-radius: 6px; padding: .4rem .9rem;
              font-size: .9rem; cursor: pointer; }
  #map { height: 440px; border-radius: 10px; margin: 1rem 0; z-index: 0; }
  .nummark { background: #1971c2; color: #fff; border-radius: 50%; text-align: center;
              line-height: 24px; font-weight: 700; font-size: .8rem; border: 2px solid #fff;
              box-shadow: 0 1px 4px rgba(0,0,0,.4); }
  .apmark { background: #c92a2a; color: #fff; border-radius: 50%; text-align: center;
             line-height: 28px; font-size: 1rem; border: 2px solid #fff;
             box-shadow: 0 1px 4px rgba(0,0,0,.4); }
'''


def main():
    icao = c.icao_arg()
    body, map_points, map_center, ville = build(icao)
    data_js = ('const MAP_POINTS = ' + json.dumps(map_points, ensure_ascii=False) + ';\n'
               + 'const MAP_CENTER = ' + json.dumps(map_center, ensure_ascii=False) + ';')
    leaflet = ('<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>\n'
               '<script>' + data_js + '</script>\n'
               '<script>' + MAP_JS + '</script>')

    doc = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aperçu {html.escape(icao)} — {html.escape(ville)}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<style>{CSS}</style></head>
<body>
<header>
  <h1>Aperçu — {html.escape(icao)}</h1>
  <p class="sub">{html.escape(ville)}</p>
</header>
{body}
{TOOLBAR}
{leaflet}
{SCRIPT}
</body></html>'''

    os.makedirs('tmp', exist_ok=True)
    out = c.tmp_path(icao, 'preview.html')
    open(out, 'w').write(doc)
    print(f'Aperçu généré : {os.path.abspath(out)}')
    print(f'  open {out}')


if __name__ == '__main__':
    main()

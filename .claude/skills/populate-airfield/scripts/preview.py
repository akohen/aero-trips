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


def webcams_block(proposed, existing):
    """Webcams proposées (cochables) et déjà en base (pour mémoire), image en direct."""
    if not proposed:
        return ''
    cards = []
    for i, w in enumerate(proposed):
        url = w.get('url') or ''
        label = w.get('label') or (f'Webcam {i + 1}' if len(proposed) > 1 else 'Webcam')
        u = html.escape(url, quote=True)
        flags = ''.join(badge(p, 'warn') for p in c.webcam_url_problems(w))
        img = '<p class="hint">lien seul, sans aperçu</p>'
        if w.get('image') and not flags:
            status, ctype, age = c.webcam_image_info(w['image'])
            stale = age is not None and age > c.WEBCAM_STALE_H
            if status != 200 or not (ctype or '').startswith('image/'):
                flags += badge(f'image : HTTP {status} {ctype or ""}'.strip(), 'warn')
            flags += badge(f'image : {c.format_age(age)}', 'warn' if stale or age is None else 'badge')
            src = html.escape(w['image'], quote=True)
            img = (f'<img src="{src}" alt="{html.escape(label, quote=True)}" loading="lazy" '
                   'onerror="this.replaceWith(Object.assign(document.createElement(\'p\'),'
                   '{className:\'hint\',textContent:\'image indisponible\'}))">')
        cards.append(f'''<article class="card webcam" data-url="{u}">
          <div class="cardhead"><h3>📷 {html.escape(label)}</h3></div>
          <div class="badges">{flags}</div>
          {img}
          <p class="website"><a href="{u}" target="_blank" rel="noopener nofollow">{html.escape(url)}</a></p>
          <div class="controls">
            <label class="chk del"><input type="checkbox" class="c-wdel"> 🗑 Retirer</label>
          </div>
        </article>''')
    known = ''
    if existing:
        known = ('<p class="hint">Déjà en base : '
                 + ', '.join(html.escape(w.get('label') or w.get('url', '')) for w in existing) + '</p>')
    return f'''<h3>Webcams proposées ({len(proposed)})</h3>
      <p class="hint">L'âge vient de l'en-tête Last-Modified ; une image figée depuis des jours
      trahit une caméra en panne.</p>
      <div class="grid">{''.join(cards)}</div>{known}'''


def fee_block(icao, entry):
    """Taxe proposée (tmp/<ICAO>-fee.json), à côté de la valeur en base et de la fiche existante."""
    path = c.tmp_path(icao, 'fee.json')
    if not os.path.exists(path):
        return ''
    fee = json.load(open(path))
    flags = ''.join(badge(p, 'warn') for p in c.fee_problems({k: v for k, v in fee.items() if k != 'codeIcao'}))
    amount = fee.get('amount')
    label = 'Gratuit' if amount == 0 else f'{amount} € TTC'
    if fee.get('ht') is not None:
        label += f" ({fee['ht']} € HT)"
    parking = ' · '.join(x for x in (
        f"stationnement {fee['parkingIncludedHours']} h inclus" if fee.get('parkingIncludedHours') else '',
        f"stationnement 24 h {fee['parking24h']} €" if fee.get('parking24h') is not None else '',
    ) if x)
    links = ' · '.join(f'<a href="{html.escape(fee[k], quote=True)}" target="_blank" rel="noopener">{t}</a>'
                       for k, t in (('url', 'document'), ('pageUrl', 'page tarifs')) if fee.get(k))
    current = entry.get('landingFee')
    sheet = c.load_fee_sheet(icao)
    was = ' · '.join(x for x in (
        f"en base : {current['amount']} € ({current['source']})" if current else 'en base : inconnue',
        f"fees.json : {sheet['amount']} € depuis {sheet['validFrom']}" if sheet else '',
    ) if x)
    note = f'<p>{html.escape(fee["note"])}</p>' if fee.get('note') else ''
    return f'''<div class="fee"><h3>Taxe d'atterrissage proposée {flags}</h3>
      <p><b>{html.escape(label)}</b>{' · ' + html.escape(parking) if parking else ''}
      — en vigueur depuis {html.escape(str(fee.get('validFrom')))}, relevée le {html.escape(str(fee.get('checkedAt')))}</p>
      {note}
      <p>{links}</p><p class="muted">{html.escape(was)}</p></div>'''


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
      {webcams_block(airfield.get('webcams'), entry.get('webcams') or [])}
      {fee_block(icao, entry)}
    </section>''')

    elif fee_block(icao, entry):
        parts.append(f'''<section class="card airfield">
      <h2>Aérodrome {html.escape(icao)}</h2>
      {fee_block(icao, entry)}
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
                if c.is_city_card(a, ctx.get('city_center')):
                    dist = f'<span class="dist">✈ {d:.1f} km (fiche centre-ville)</span>'
                    flags += badge('centre-ville')
                    over = False
                else:
                    limit = c.radius_for(a.get('type'))
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
    <span class="hint">Coche les cartes (Supprimer / À améliorer / Retirer), puis copie le bloc et colle-le dans le chat.</span>
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
  const cams=[...document.querySelectorAll('article.webcam')]
    .filter(w=>w.querySelector('.c-wdel').checked).map(w=>w.dataset.url);
  let out='';
  if(cams.length) out+='WEBCAMS À RETIRER: '+cams.join(', ')+'\n';
  if(del.length) out+='SUPPRIMER: '+del.join(', ')+'\n';
  if(imp.length) out+='AMÉLIORER:\n'+imp.join('\n')+'\n';
  if(!out) out='(rien de coché — coche « Supprimer », « À améliorer » ou « Retirer » sur les cartes)';
  document.getElementById('out').value=out;
}
function copyOut(){
  const t=document.getElementById('out'); t.select();
  navigator.clipboard.writeText(t.value).then(()=>{
    const b=document.getElementById('copybtn'); const o=b.textContent;
    b.textContent='✓ Copié'; setTimeout(()=>b.textContent=o,1500);
  });
}
document.addEventListener('change',e=>{ if(e.target.matches('.c-del,.c-imp,.c-wdel')) build(); });
document.addEventListener('input',e=>{ if(e.target.matches('.note')) build(); });
document.addEventListener('DOMContentLoaded',build);
</script>'''

MAP_JS = r'''
(function(){
  if (typeof L === 'undefined') return;
  // Fonds de carte Esri (ArcGIS Online), sans clé et sans filigrane.
  // Pas les serveurs de tuiles publics d'OpenStreetMap : leur politique d'usage
  // exclut les applications non identifiables, et un aperçu ouvert en file://
  // n'envoie aucun Referer (tuile « 403 App is not following the tile usage policy »).
  // Pas CARTO non plus : depuis peu, ses tuiles sans clé portent un filigrane
  // « API KEY REQUIRED » en travers de la carte.
  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  function esri(service) {
    return L.tileLayer(ESRI + service + '/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '<a href="https://www.esri.com">Esri</a> et ses fournisseurs'
    });
  }
  var plan = esri('World_Street_Map');
  var satellite = esri('World_Imagery');
  var relief = esri('World_Topo_Map');

  var map = L.map('map', { scrollWheelZoom: false, layers: [plan] });
  // Le satellite montre le parking avions et les accès : c'est lui qui permet de
  // juger si un lieu est réellement à portée de marche depuis l'aéro-club.
  L.control.layers({ 'Plan': plan, 'Satellite': satellite, 'Relief': relief },
                   null, { position: 'topright' }).addTo(map);

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
  article.webcam:has(.c-wdel:checked) { background: #fff0f0; border-color: #f3b0b0; opacity: .75; }
  .hint { color: #666; font-size: .85rem; }
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

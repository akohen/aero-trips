"""Vérifie qu'une ou plusieurs URLs répondent 200, avec le bon User-Agent.

    python3 .claude/skills/populate-airfield/scripts/check_url.py <url> [<url>...]

À utiliser **à la place de `curl`** : le choix du User-Agent dépend de l'hôte
(descriptif pour Wikimedia, qui rate-limite les UA de navigateur ; navigateur
partout ailleurs, où les CDN bloquent les UA non-navigateur). Se tromper fait
passer une image parfaitement valide pour cassée.

Le script suit les redirections et affiche l'URL finale, ce qui sert aussi à
retenir l'URL `https` effective d'un site de club donné en `http://`.

Sortie : une ligne par URL, `200 OK <url finale>` ou `<code> ÉCHEC <url>`.
Code de retour 0 si toutes les URLs répondent 200, 1 sinon.
"""
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402


def final_url(url):
    """URL finale après redirections (None si la requête échoue)."""
    try:
        c._throttle(url)
        req = urllib.request.Request(url, method='GET',
                                     headers={'User-Agent': c.user_agent(url)})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.url
    except urllib.error.HTTPError as e:
        return e.url if hasattr(e, 'url') else None
    except Exception:
        return None


def main():
    urls = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not urls:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        sys.exit(2)

    ok = True
    for url in urls:
        status = c.http_status(url)
        if status == 200:
            end = final_url(url) or url
            suffix = f'  (redirigé vers {end})' if end != url else ''
            print(f'200 OK    {url}{suffix}')
        else:
            ok = False
            ua = 'wikimedia' if 'wikimedia.org' in url else 'navigateur'
            if status == 429 or str(status).startswith('ERREUR'):
                # Hôte saturé ou injoignable : l'URL peut être bonne. Insister ne fait
                # qu'aggraver le rate-limit (cf. activity-format.md § Image).
                print(f'{status} ÉCHEC  {url}   [UA {ua}] — hôte saturé/injoignable : ne pas '
                      'réessayer en boucle, consigner dans "image_candidates"')
            else:
                print(f'{status} ÉCHEC  {url}   [UA {ua}] — ne pas retenir cette URL')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()

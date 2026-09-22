"""Reprendre une session laissée en plan dans tmp/ (cf. SKILL.md § « Avant tout »).

    python3 .claude/skills/populate-airfield/scripts/resume.py LFMA

Non destructif par construction : ne supprime et ne réécrit **aucune** donnée
d'activité ou d'aérodrome. Il dresse l'inventaire de ce qui existe, signale si une
relecture a déjà eu lieu, régénère le contexte et l'aperçu, puis indique la suite.

À utiliser dès qu'on revient sur un aérodrome dont les fichiers traînent dans tmp/ :
c'est le seul point d'entrée qui ne risque pas d'écraser une relecture.
"""
import datetime as dt
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def mtime(path):
    return dt.datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d %H:%M')


def run(script, *args):
    print(flush=True)  # sinon la sortie du sous-processus s'intercale avant la nôtre
    sys.stdout.flush()
    return subprocess.run([sys.executable, os.path.join(HERE, script), *args]).returncode


def main():
    icao = c.icao_arg()
    c.load_airfield(icao)  # échoue proprement si l'ICAO est inconnu

    files = [(c.tmp_path(icao, s), label) for s, label in [
        ('context.json', 'contexte'),
        ('sources.json', 'pistes (OSM, PoiFrance…)'),
        ('club-notes.json', 'notes des clubs'),
        ('airfield.json', 'fiche aérodrome'),
        ('activities.json', 'activités fusionnées (fait foi)'),
        ('preview.html', 'aperçu'),
    ]] + [(f, "sortie d'agent") for f in c.agent_files(icao)]
    present = [(p, lbl) for p, lbl in files if os.path.exists(p)]

    print(f'=== État de la session {icao} ===')
    if not present:
        c.die(f'aucun fichier tmp/{icao}-* — il n\'y a pas de session à reprendre. '
              f'Démarrer avec context.py {icao}')
    for path, label in present:
        print(f'  {mtime(path)}  {path:44} {label}')

    state = c.review_state(icao)
    print()
    if state['diverged']:
        print('  ⚠ ' + c.describe_review(state))
        print('    → les fichiers d\'agents sont PÉRIMÉS ; ne pas relancer merge.py')
        print('      (il ferait réapparaître ce qui a été écarté).')
    elif state['has_merged']:
        print(f"  Aucune relecture détectée : le fichier fusionné ({state['n_merged']} activités)"
              " correspond aux sorties d'agents.")
    elif state['has_agent_files']:
        print(f"  {state['n_agent']} activité(s) produite(s) par les agents, pas encore fusionnées"
              f' → lancer merge.py {icao}')
    else:
        print('  Aucune activité — seule la fiche aérodrome existe.')

    # Contexte : jamais de nettoyage depuis une reprise.
    if run('context.py', icao, '--no-clean', '--no-sources') != 0:
        c.die('context.py a échoué')

    print('\n=== Validation ===')
    problems = run('validate.py', icao) != 0

    if os.path.exists(c.tmp_path(icao, 'activities.json')) or \
       os.path.exists(c.tmp_path(icao, 'airfield.json')):
        run('preview.py', icao)

    print('\n=== Suite ===')
    if problems:
        print('  1. corriger les problèmes signalés ci-dessus (Étape 3)')
    print(f'  {"2" if problems else "1"}. relire l\'aperçu : open {c.tmp_path(icao, "preview.html")}')
    print(f'     puis coller le bloc de retours dans le chat (Étape 5)')
    print(f'  {"3" if problems else "2"}. quand tout est bon, importer (Étape 6) :')
    paths = ' '.join(p for p in (c.tmp_path(icao, 'airfield.json'),
                                 c.tmp_path(icao, 'activities.json')) if os.path.exists(p))
    print(f'     npm run import -- --import {paths}')


if __name__ == '__main__':
    main()

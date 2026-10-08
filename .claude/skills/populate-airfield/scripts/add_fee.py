#!/usr/bin/env python3
"""Ajoute (ou remplace) la taxe proposée dans tmp/<ICAO>-fee.json à scripts/fees.json.

Usage : python3 .claude/skills/populate-airfield/scripts/add_fee.py ICAO [--apply]

Sans --apply, affiche l'entrée et ce qu'elle remplace. Ensuite, `npm run import:fees:prod -- official`
écrit le rapport `official-<ICAO>` (dry run, puis --apply) ; la fonction `applyReports` met à jour la fiche.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402


def main():
    icao = c.icao_arg([a for a in sys.argv if a != '--apply'])
    apply = '--apply' in sys.argv
    path = c.tmp_path(icao, 'fee.json')
    if not os.path.exists(path):
        c.die(f'{path} absent : aucune taxe proposée pour {icao}.')
    fee = {k: v for k, v in json.load(open(path)).items() if k != 'codeIcao'}
    problems = c.fee_problems(fee)
    if problems:
        c.die(f'{path} : ' + ' ; '.join(problems) + ' — corriger avant de l\'ajouter.')

    data = json.load(open(c.FEES_JSON))
    before = data['airfields'].get(icao)
    print(f'{icao} : {"remplace " + json.dumps(before, ensure_ascii=False) if before else "nouvelle entrée"}')
    print(json.dumps(fee, ensure_ascii=False, indent=2))
    if not apply:
        print('\n(dry run) relancer avec --apply pour écrire scripts/fees.json')
        return
    data['airfields'][icao] = fee
    with open(c.FEES_JSON, 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'\n✓ {c.FEES_JSON} mis à jour. Ensuite : npm run import:fees:prod -- official (puis --apply)')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Read Goutte2.1 Team_G2.1_vN.xlsx (read only) into team_raw.json for the Outlook adapter.

Usage: python tools/read_team.py <Team_G2.1_vN.xlsx> <directory.json> <out team_raw.json>
  directory.json  {"<Nom>|<Prenom>": {"mail": ..., "displayName": ...} | null} resolved by Claude through the
                  Microsoft 365 connector (search_people); null = not found in the directory.
Only columns Nom, Prenom, Role are read. Nothing from Recrutements/ is ever opened.
"""
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import openpyxl


def main() -> None:
    xlsx, directory_p, out_p = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    if "recrutement" in str(xlsx).lower():
        sys.exit("refused: Recrutements/ is out of scope (personal data)")
    directory = json.loads(directory_p.read_text(encoding="utf-8"))
    ws = openpyxl.load_workbook(xlsx, read_only=True, data_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    head = [str(c).strip() if c is not None else "" for c in rows[0]]
    if head[:3] != ["Nom", "Prenom", "Role"]:
        sys.exit(f"refused: unexpected header {head[:3]}")
    people = []
    for n, r in enumerate(rows[1:], start=2):
        nom, prenom, role = [(str(c).strip() if c is not None else None) for c in r[:3]]
        if not nom and not role:
            continue  # blank or stray cell (e.g. a lone number in column E)
        key = f"{nom}|{prenom}"
        people.append({"ligne": n, "nom": nom, "prenom": prenom, "role": role, "annuaire": directory.get(key)})
    now = datetime.now(ZoneInfo("America/Toronto")).strftime("%Y-%m-%dT%H:%M%z")
    out = {"fichier": xlsx.name, "feuille": ws.title, "read_at": now[:-2] + ":" + now[-2:], "personnes": people}
    out_p.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(people)} lignes · {sum(1 for p in people if p['annuaire'])} résolues dans l'annuaire")


if __name__ == "__main__":
    main()

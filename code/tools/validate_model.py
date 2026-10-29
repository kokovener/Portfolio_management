#!/usr/bin/env python3
"""Validate portfolio documents (feeds, adapter outputs, examples) against the canonical model (v2, superset of v1).

Usage: python validate_model.py <schema.json> <doc1.json> [doc2.json ...]

Checks, in order:
  1. JSON Schema (draft 2020-12) validity of each document.
  2. Computed fields match their formula (priorite.score, risque.score).
  3. Referential integrity across ALL documents given: every item / jalon / livrable /
     personne / sprint referenced must exist somewhere in the set.
  4. Model rules: `item.sante` is computed by the portfolio, so it may appear only in a
     document whose top-level source.systeme is "calcul" (the base); a run item is the
     only type allowed to carry `support`; a timestamp with a Z suffix is rejected by the schema.
Exit code 0 = all good, 1 = at least one error.
"""
import json
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator
except ImportError:  # pragma: no cover
    sys.exit("pip install jsonschema --break-system-packages")

COLLECTIONS = ["items", "jalons", "risques", "attentes", "dependances", "livrables", "meps",
               "actions_retro", "charges", "sprints", "personnes", "absences", "stats_jira", "instantanes", "lectures", "listes_jira"]


def load(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def check_schema(validator, doc, name, errors):
    for err in sorted(validator.iter_errors(doc), key=lambda e: list(e.path)):
        loc = "/".join(str(p) for p in err.path) or "<racine>"
        errors.append(f"{name}: schéma — {loc}: {err.message}")


def check_computed(doc, name, errors):
    for it in doc.get("items", []):
        p = it.get("priorite")
        if p and "score" in p and p["score"] != p["valeur"] + p["urgence"] - p["effort"]:
            errors.append(f"{name}: item {it['id']} priorite.score ≠ valeur + urgence − effort")
    for r in doc.get("risques", []):
        if "score" in r and r["score"] != r["probabilite"] * r["impact"]:
            errors.append(f"{name}: risque {r['id']} score ≠ probabilite × impact")


def check_rules(doc, name, errors):
    computed_doc = doc.get("source", {}).get("systeme") == "calcul"
    for it in doc.get("items", []):
        if "support" in it and it["type"] != "run":
            errors.append(f"{name}: item {it['id']} porte `support` mais n'est pas de type run")
        if "sante" in it and not computed_doc:
            errors.append(f"{name}: item {it['id']} déclare `sante` dans un document "
                          f"source={doc.get('source', {}).get('systeme')} — la santé est calculée (D8), "
                          "admise seulement si source.systeme = calcul")


def collect_ids(docs):
    ids = {"item": set(), "jalon": set(), "livrable": set(), "personne": set(), "sprint": set()}
    for doc in docs.values():
        ids["item"].update(i["id"] for i in doc.get("items", []))
        ids["jalon"].update(j["id"] for j in doc.get("jalons", []))
        ids["livrable"].update(l["id"] for l in doc.get("livrables", []))
        ids["personne"].update(p["id"] for p in doc.get("personnes", []))
        ids["sprint"].update(s["id"] for s in doc.get("sprints", []))
    return ids


def check_refs(docs, ids, errors):
    def need(kind, ref, where):
        if ref is not None and ref not in ids[kind]:
            errors.append(f"{where}: référence {kind} « {ref} » introuvable dans le jeu de documents")

    for name, doc in docs.items():
        for it in doc.get("items", []):
            need("item", it.get("parent"), f"{name}/item {it['id']}")
            for p in it.get("personnes", []):
                need("personne", p, f"{name}/item {it['id']}")
        for coll in ("jalons", "risques", "attentes", "charges", "stats_jira"):
            for rec in doc.get(coll, []):
                need("item", rec["item"], f"{name}/{coll} {rec['id']}")
        for rec in doc.get("charges", []):
            need("personne", rec.get("personne"), f"{name}/charges {rec['id']}")
            if rec["periode"]["type"] == "sprint":
                need("sprint", rec["periode"]["ref"], f"{name}/charges {rec['id']}")
        for rec in doc.get("meps", []) + doc.get("livrables", []):
            need("item", rec.get("item"), f"{name}/{rec['id']}")
        for rec in doc.get("absences", []):
            need("personne", rec["personne"], f"{name}/absences {rec['id']}")
        for dep in doc.get("dependances", []):
            for end in ("de", "vers"):
                need(dep[end]["kind"], dep[end]["id"], f"{name}/dependances {dep['id']}.{end}")


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    schema = load(Path(argv[1]))
    validator = Draft202012Validator(schema)
    docs = {Path(p).name: load(Path(p)) for p in argv[2:]}
    errors = []
    for name, doc in docs.items():
        check_schema(validator, doc, name, errors)
        check_computed(doc, name, errors)
        check_rules(doc, name, errors)
    check_refs(docs, collect_ids(docs), errors)

    for name, doc in docs.items():
        counts = ", ".join(f"{c}={len(doc[c])}" for c in COLLECTIONS if doc.get(c))
        print(f"{name}: {counts}")
    if errors:
        print(f"\n{len(errors)} erreur(s) :")
        for e in errors:
            print(" -", e)
        return 1
    print(f"\nOK — {len(docs)} document(s) valides, références croisées cohérentes.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

#!/usr/bin/env python3
"""Build the portfolio artifact page from interface/page.html + interface/core.js + schema.json.

Usage: python tools/build_interface.py <schema.json> [base_seed.json]
Outputs:
  dist/portefeuille.html     page content to publish with the Artifact tool (no doctype: the tool wraps it)
  dist/preview_local.html    full local document with an in-memory mock of claude.use("db"/"user"),
                             seeded with base_seed.json — for screenshots only, never published
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    schema_path = Path(sys.argv[1])
    seed_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    page = (ROOT / "interface" / "page.html").read_text(encoding="utf-8")
    core = (ROOT / "interface" / "core.js").read_text(encoding="utf-8")
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    schema_js = "window.PORTFOLIO_SCHEMA = " + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + ";"
    # R36: refresh cadence (block freshness targets) travels with the page, read from config/cadence.json
    cadence = json.loads((ROOT / "config" / "cadence.json").read_text(encoding="utf-8"))
    schema_js += "window.PORTFOLIO_CADENCE = " + json.dumps(cadence, ensure_ascii=False, separators=(",", ":")) + ";"
    for blob in (schema_js, core):
        if "</script" in blob.lower():
            sys.exit("refused: '</script' inside an inlined blob")
    for marker in ("/*__SCHEMA__*/", "/*__CORE__*/"):
        if page.count(marker) != 1:
            sys.exit(f"refused: marker {marker} must appear exactly once")
    out = page.replace("/*__SCHEMA__*/", schema_js).replace("/*__CORE__*/", core)
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    (dist / "portefeuille.html").write_text(out, encoding="utf-8")
    print(f"dist/portefeuille.html  {len(out.encode('utf-8')):,} bytes")

    if seed_path:
        seed = json.loads(seed_path.read_text(encoding="utf-8"))
        mock = """<script>
/* Local preview only: in-memory stand-in for the artifact runtime (db + user). */
(function(){
  const seed = %s; const ro = /[?&]ro\\b/.test(location.search);
  const store = {};
  Object.keys(seed).forEach(k => { if (Array.isArray(seed[k])) store[k] = Object.fromEntries(seed[k].map(r => [r.id, r])); });
  const db = {
    collection: (n) => ({ get: async () => ({ docs: Object.values(store[n] || {}).map(r => ({ id: r.id, data: () => JSON.parse(JSON.stringify(r)) })) }) }),
    doc: (p) => { const [c, id] = p.split('/'); return { set: async (v) => { if (ro) throw { code: 'not_writer' }; (store[c] = store[c] || {})[id] = JSON.parse(JSON.stringify(v)); } }; }
  };
  window.claude = { use: async (n) => n === 'db' ? db : n === 'user' ? { canEdit: () => !ro } : null };
})();
</script>""" % json.dumps(seed, ensure_ascii=False)
        doc = ("<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\">"
               "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body>"
               + mock + out + "</body></html>")
        (dist / "preview_local.html").write_text(doc, encoding="utf-8")
        print(f"dist/preview_local.html {len(doc.encode('utf-8')):,} bytes")


if __name__ == "__main__":
    main()

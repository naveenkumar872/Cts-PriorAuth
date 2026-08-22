"""
assign_policy_ids.py
--------------------
1. Assigns a stable random policy_id in the format  ABC-12345678
   (3 uppercase letters + 8 numeric digits) to every ruleset JSON
   in this directory.
   The ID is derived from the original policy_id string so it is
   deterministic — re-running the script produces the same IDs.

2. Rewrites each JSON file in-place with the new policy_id.

3. Writes  policy_index.json  next to this script:
   {
     "ACU-28179531": {
       "file": "acupuncture_ruleset.json",
       "policy_name": "Acupuncture",
       "original_id": "acupuncture.pdf",
       "service_codes": ["97810", "97811", ...],
       "coding_systems": ["CPT"],
       "rule_set_ids": ["medicare_acupuncture_coverage", ...]
     },
     ...
   }

Run:
    cd d:/NaveenCts/rulesets
    python assign_policy_ids.py
"""

import hashlib
import json
import re
from pathlib import Path

RULESETS_DIR = Path(__file__).parent


def make_policy_id(original: str) -> str:
    """
    Derive a stable  ABC-12345678  from the original policy_id string.

    - 3-letter prefix: first 3 meaningful uppercase letters of the original id
      (stripping non-alpha characters), padded with 'X' if shorter.
    - 8-digit numeric suffix: first 8 decimal digits of the SHA-1 hash integer.

    Example:  acupuncture.pdf  →  ACU-28179531
    """
    # --- 3-letter alphabetic prefix ---
    letters = re.sub(r"[^A-Za-z]", "", original).upper()
    prefix  = (letters + "XXX")[:3]

    # --- 8-digit numeric suffix ---
    digest  = hashlib.sha1(original.encode()).digest()
    num     = int.from_bytes(digest[:4], "big") % 100_000_000   # 0 – 99 999 999
    suffix  = f"{num:08d}"

    return f"{prefix}-{suffix}"


def extract_service_codes(rule_sets: list) -> tuple[list, list]:
    """Walk all rule_set match_criteria and collect service codes + coding systems."""
    codes: list = []
    systems: list = []
    for rs in rule_sets:
        mc = rs.get("match_criteria", {})
        sc = mc.get("service_code", {})
        val = sc.get("value", [])
        if isinstance(val, list):
            codes.extend(val)
        elif isinstance(val, str):
            codes.append(val)
        sys_ = sc.get("coding_system", "")
        if sys_ and sys_ not in systems:
            systems.append(sys_)
    return list(dict.fromkeys(codes)), systems   # deduplicated, order-preserving


def process():
    index: dict = {}

    json_files = sorted(
        f for f in RULESETS_DIR.glob("*.json")
        if f.name != "policy_index.json" and f.name != __file__[:-3] + ".json"
    )

    for path in json_files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"  SKIP (invalid JSON): {path.name} — {e}")
            continue

        original_id   = data.get("original_id") or path.stem   # use stored original, or file stem
        # If the stored policy_id is already in our new format, use original_id as seed
        # Seed is always the file stem so IDs are stable across re-runs
        seed          = path.stem
        policy_name   = data.get("policy_name", path.stem.replace("_", " ").title())
        new_id        = make_policy_id(seed)
        rule_sets     = data.get("rule_sets", [])
        rule_set_ids  = [rs.get("rule_set_id", "") for rs in rule_sets]
        codes, systems = extract_service_codes(rule_sets)

        # Rewrite policy_id in the file
        data["policy_id"] = new_id
        path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )

        index[new_id] = {
            "file":          path.name,
            "policy_name":   policy_name,
            "original_id":   seed,
            "service_codes": codes,
            "coding_systems": systems,
            "rule_set_ids":  rule_set_ids,
        }

        print(f"  {seed:<50}  →  {new_id}")

    # Write the index
    index_path = RULESETS_DIR / "policy_index.json"
    index_path.write_text(
        json.dumps(index, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    print(f"\n✅  Processed {len(index)} ruleset(s).")
    print(f"✅  Index written → {index_path}")


if __name__ == "__main__":
    process()

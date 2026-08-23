"""
Module 4: Context & Policy Mapping
/api/v1/context/

Given the provider's input (policyId, serviceCode, codingSystem), this module:

  1. Exact-match lookup      — policyId straight into policy_index.json
  2. Service-code fallback   — if policyId not found, scan index for a ruleset
                               whose service_codes list contains the given serviceCode
  3. Load the matched ruleset JSON from disk
  4. Identify the specific rule_set entries that match the serviceCode
  5. Return a "context mapping" that becomes the input for the Rule Engine

Response shape:
{
  "matched": true | false,
  "matchMethod": "policy_id_exact" | "service_code_fallback" | "none",
  "policyId":      "POL-28DED795",
  "policyName":    "Acupuncture",
  "originalId":    "acupuncture.pdf",
  "rulesetFile":   "acupuncture_ruleset.json",
  "applicableRuleSets": [          ← only rule_sets whose service_codes match
    {
      "ruleSetId":    "...",
      "policySegment": "...",
      "matchCriteria": {...},
      "pathways":     [...],
      "exclusions":   [...]
    }
  ],
  "allRuleSetIds": [...],
  "serviceCodes":  [...],
  "message":       "Matched by policy_id_exact"
}
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_RULESETS_DIR   = Path(__file__).parent.parent.parent.parent / "rulesets"
_INDEX_PATH     = _RULESETS_DIR / "policy_index.json"

# ── Load index once at import time (tiny file, safe to cache in memory) ───────
_INDEX: Dict[str, Any] = {}

def _get_index() -> Dict[str, Any]:
    global _INDEX
    if not _INDEX:
        if not _INDEX_PATH.exists():
            raise RuntimeError(f"policy_index.json not found at {_INDEX_PATH}")
        _INDEX = json.loads(_INDEX_PATH.read_text(encoding="utf-8"))
    return _INDEX


def _load_ruleset(filename: str) -> Dict[str, Any]:
    path = _RULESETS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Ruleset file not found: {filename}")
    return json.loads(path.read_text(encoding="utf-8"))


def _filter_matching_rule_sets(
    rule_sets: List[Dict],
    service_code: str,
    coding_system: str,
) -> List[Dict]:
    """
    Return only the rule_set entries whose match_criteria.service_code.value
    contains the requested service_code (and optionally matches coding_system).
    If nothing matches by code, return ALL rule_sets (policy matched but no
    code-level narrowing possible).
    """
    if not service_code:
        return rule_sets

    matched = []
    for rs in rule_sets:
        mc  = rs.get("match_criteria", {})
        sc  = mc.get("service_code", {})
        codes = sc.get("value", [])
        cs    = sc.get("coding_system", "")

        if isinstance(codes, str):
            codes = [codes]

        code_match   = service_code in codes
        system_match = (not coding_system) or (not cs) or (cs.upper() == coding_system.upper())

        if code_match and system_match:
            matched.append(rs)

    return matched if matched else rule_sets


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class MapPolicyRequest(BaseModel):
    policyId:     Optional[str] = None   # e.g. "POL-28DED795"
    serviceCode:  Optional[str] = None   # e.g. "97810"
    codingSystem: Optional[str] = None   # e.g. "CPT"
    caseId:       Optional[str] = None   # authorization request ID (for audit)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/map-policy")
def map_policy(payload: MapPolicyRequest) -> Dict[str, Any]:
    """
    Perform context & policy mapping for a PA request.

    Lookup priority:
      1. Exact policyId match in the index
      2. Service-code scan across all rulesets in the index
      3. No match → return matched=false with suggestions

    Returns the applicable ruleset data needed by the Rule Engine.
    """
    index        = _get_index()
    policy_id    = (payload.policyId    or "").strip()
    service_code = (payload.serviceCode or "").strip()
    coding_system = (payload.codingSystem or "").strip()

    entry: Optional[Dict]  = None
    matched_policy_id: str = ""
    match_method: str      = "none"

    # ── 1. Exact policyId lookup (case-insensitive) ───────────────────────
    if policy_id:
        matched_key = None
        for k in index.keys():
            if k.upper() == policy_id.upper():
                matched_key = k
                break
        if matched_key:
            entry             = index[matched_key]
            matched_policy_id = matched_key
            match_method      = "policy_id_exact"
            logger.info("Context mapping: exact policyId match for %s", matched_key)

    # ── 2. Service-code fallback ──────────────────────────────────────────
    if entry is None and service_code:
        for pid, meta in index.items():
            codes = meta.get("service_codes", [])
            systems = [s.upper() for s in meta.get("coding_systems", [])]
            code_hit   = service_code in codes
            system_hit = (not coding_system) or (not systems) or (coding_system.upper() in systems)
            if code_hit and system_hit:
                entry             = meta
                matched_policy_id = pid
                match_method      = "service_code_fallback"
                logger.info(
                    "Context mapping: service_code fallback — %s → %s (%s)",
                    service_code, pid, meta["policy_name"],
                )
                break

    # ── 3. No match ───────────────────────────────────────────────────────
    if entry is None:
        suggestions = []
        if service_code:
            # partial match — codes that start with the same 2-digit prefix
            prefix = service_code[:2]
            for pid, meta in index.items():
                if any(c.startswith(prefix) for c in meta.get("service_codes", [])):
                    suggestions.append({
                        "policyId":   pid,
                        "policyName": meta["policy_name"],
                        "file":       meta["file"],
                    })
        return {
            "matched":             False,
            "matchMethod":         "none",
            "policyId":            None,
            "policyName":          None,
            "originalId":          None,
            "rulesetFile":         None,
            "applicableRuleSets":  [],
            "allRuleSetIds":       [],
            "serviceCodes":        [],
            "suggestions":         suggestions[:5],
            "message": (
                f"No ruleset found for policyId='{policy_id}' / "
                f"serviceCode='{service_code}'. "
                + (f"{len(suggestions)} partial suggestion(s) available." if suggestions else "")
            ),
        }

    # ── 4. Load the full ruleset JSON from disk ───────────────────────────
    try:
        ruleset = _load_ruleset(entry["file"])
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    rule_sets_all = ruleset.get("rule_sets", [])

    # ── 5. Filter to applicable rule_sets ────────────────────────────────
    applicable = _filter_matching_rule_sets(rule_sets_all, service_code, coding_system)

    # Build a compact applicable list (omit huge condition arrays from top-level summary)
    applicable_summary = [
        {
            "ruleSetId":      rs.get("rule_set_id"),
            "policySegment":  rs.get("policy_segment", ""),
            "matchCriteria":  rs.get("match_criteria", {}),
            "pathwayCount":   len(rs.get("pathways", [])),
            "pathwayIds":     [p.get("pathway_id") for p in rs.get("pathways", [])],
            "exclusionCount": len(rs.get("exclusions", [])),
            # full data included for rule engine consumption
            "pathways":       rs.get("pathways", []),
            "exclusions":     rs.get("exclusions", []),
            "generalPrinciples": rs.get("general_principles", []),
        }
        for rs in applicable
    ]

    return {
        "matched":            True,
        "matchMethod":        match_method,
        "policyId":           matched_policy_id,
        "policyName":         entry["policy_name"],
        "originalId":         entry.get("original_id"),
        "rulesetFile":        entry["file"],
        "applicableRuleSets": applicable_summary,
        "allRuleSetIds":      entry.get("rule_set_ids", []),
        "serviceCodes":       entry.get("service_codes", []),
        "codingSystems":      entry.get("coding_systems", []),
        "message": (
            f"Matched by {match_method}. "
            f"{len(applicable_summary)} applicable rule set(s) identified "
            f"for service code '{service_code}'."
        ),
    }


from core.cache import get_cache, set_cache


@router.get("/index")
def get_policy_index() -> Dict[str, Any]:
    """
    Return the full policy index — all known policy IDs, names, files,
    and service codes. Used by the frontend to populate policy ID dropdowns
    and show the provider what policies exist.
    """
    cached = get_cache("policy_index")
    if cached is not None:
        return cached

    index = _get_index()
    res = {
        "total": len(index),
        "policies": [
            {
                "policyId":     pid,
                "policyName":   meta["policy_name"],
                "file":         meta["file"],
                "serviceCodes": meta.get("service_codes", []),
                "codingSystems": meta.get("coding_systems", []),
            }
            for pid, meta in sorted(index.items(), key=lambda x: x[1]["policy_name"])
        ],
    }
    set_cache("policy_index", res, ttl_seconds=300)
    return res



@router.get("/lookup/{policy_id}")
def lookup_policy(policy_id: str) -> Dict[str, Any]:
    """
    Return index metadata for a single policy ID without loading the full
    ruleset. Useful for quick validation that a provider-entered policy ID exists.
    """
    index = _get_index()
    if policy_id not in index:
        raise HTTPException(
            status_code=404,
            detail=f"Policy ID '{policy_id}' not found in the index.",
        )
    meta = index[policy_id]
    return {
        "policyId":     policy_id,
        "policyName":   meta["policy_name"],
        "file":         meta["file"],
        "originalId":   meta.get("original_id"),
        "serviceCodes": meta.get("service_codes", []),
        "codingSystems": meta.get("coding_systems", []),
        "ruleSetIds":   meta.get("rule_set_ids", []),
    }
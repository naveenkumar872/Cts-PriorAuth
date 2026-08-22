"""
ML Complexity Predictor Helper Module.
Loads trained ML models from ml/models/ and predicts nurse review complexity
for authorization requests resulting in 'Nurse Review Required'.
"""
import os
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, Optional

# Paths to ML artifacts
ML_DIR = Path(__file__).parent.parent.parent / "ml" / "models"
BEST_MODEL_PATH = ML_DIR / "best_model.pkl"

# Direct Python mappings for feature schema and label output
FEATURE_COLS = [
    'patient_age', 'emergency_flag', 'previous_treatment',
    'medical_necessity_doc', 'clinical_documentation',
    'number_of_diagnoses', 'number_of_procedures',
    'rule_conditions_met', 'unknown_pathways', 'risk_level',
    'treatment_type_Diagnostic', 'treatment_type_Surgical', 'treatment_type_Therapeutic'
]
LABEL_MAP_INV = {0: "low", 1: "medium", 2: "high"}

_model = None


def _load_ml_artifacts():
    """Lazy loader for trained ML model."""
    global _model
    if _model is not None:
        return True

    try:
        if BEST_MODEL_PATH.exists():
            _model = joblib.load(BEST_MODEL_PATH)
        elif (ML_DIR / "logistic_regression_complexity.pkl").exists():
            _model = joblib.load(ML_DIR / "logistic_regression_complexity.pkl")
        else:
            print("[ML Predictor] Warning: No trained model found in ml/models/")
            return False
        return True
    except Exception as e:
        print(f"[ML Predictor] Error loading ML model: {e}")
        return False


def extract_features(structured: Dict[str, Any], rule_eval: Dict[str, Any]) -> Dict[str, Any]:
    """Extract the 13 numerical/encoded features expected by the ML model."""
    patient = structured.get("patient", {})
    pa_req = structured.get("paRequest", {})
    clinical = structured.get("clinicalData", {})
    policy_facts = clinical.get("policyFacts", {})
    
    # 1. Patient Age
    dob_str = patient.get("dob")
    age = 50
    if dob_str:
        try:
            dob = datetime.strptime(str(dob_str)[:10], "%Y-%m-%d")
            age = (datetime.utcnow() - dob).days // 365
        except Exception:
            pass

    # 2. Emergency Flag
    priority = str(pa_req.get("priority", "normal")).lower()
    emergency = 1 if (priority in ("urgent", "emergency", "high") or policy_facts.get("emergency_flag")) else 0

    # 3. Documentation Signals
    prev_tx = 1 if policy_facts.get("conservative_treatment_documented") or clinical.get("conservativeTxDocumented") else 0
    med_nec = 1 if policy_facts.get("medical_necessity_doc") or clinical.get("medicalNecessityStrength") == "strong" else 0
    clin_doc = 1 if structured.get("extractedDocuments") or clinical.get("keyClinicialFindings") else 0

    # 4. Diagnoses & Procedures Count
    num_diag = max(1, len(clinical.get("diagnoses", [])))
    num_proc = max(1, len(clinical.get("procedures", [])))

    # 5. Rule Evaluation Pathways Signals
    pathways = rule_eval.get("pathways", [])
    rule_conds_met = sum(len(p.get("conditions", [])) for p in pathways if p.get("passed"))
    unknown_pathways = sum(1 for p in pathways if p.get("unknown") or not p.get("passed"))

    # 6. Risk Level
    risk_str = str(clinical.get("risk_level", pa_req.get("riskLevel", "medium"))).lower()
    risk_map = {"low": 1, "medium": 2, "high": 3}
    risk_level = risk_map.get(risk_str, 2)

    # 7. Treatment Type One-Hot Encoding
    proc_desc = " ".join([p.get("description", "") for p in clinical.get("procedures", [])]).lower()
    t_diag = 1 if any(k in proc_desc for k in ["mri", "ct", "x-ray", "ultrasound", "scan", "diagnostic"]) else 0
    t_surg = 1 if any(k in proc_desc for k in ["surgery", "repair", "reconstruction", "arthroscopy", "replacement", "excision"]) else 0
    t_ther = 1 if not (t_diag or t_surg) or "therapy" in proc_desc or "injection" in proc_desc else 0

    return {
        'patient_age': age,
        'emergency_flag': emergency,
        'previous_treatment': prev_tx,
        'medical_necessity_doc': med_nec,
        'clinical_documentation': clin_doc,
        'number_of_diagnoses': num_diag,
        'number_of_procedures': num_proc,
        'rule_conditions_met': rule_conds_met,
        'unknown_pathways': unknown_pathways,
        'risk_level': risk_level,
        'treatment_type_Diagnostic': t_diag,
        'treatment_type_Surgical': t_surg,
        'treatment_type_Therapeutic': t_ther,
    }


def predict_nurse_review_complexity(structured: Dict[str, Any], rule_eval: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict complexity rating ('high', 'medium', 'low') and ranking order (1, 2, 3)
    for a Nurse Review Required request.
    """
    if not _load_ml_artifacts():
        # Fallback heuristic if ML model file is not present
        unknowns = sum(1 for p in rule_eval.get("pathways", []) if p.get("unknown") or not p.get("passed"))
        if unknowns >= 2:
            pred_label, rank, conf = "high", 1, 85.0
        elif unknowns == 1:
            pred_label, rank, conf = "medium", 2, 75.0
        else:
            pred_label, rank, conf = "low", 3, 70.0
        return {
            "predictedComplexity": pred_label,
            "complexityRank": rank,
            "confidenceScore": conf,
            "featuresUsed": {},
            "modelUsed": "Heuristic Fallback",
            "predictedAt": datetime.utcnow().isoformat() + "Z"
        }

    features_dict = extract_features(structured, rule_eval)
    
    # Build DataFrame matching model columns
    X_df = pd.DataFrame([features_dict])[FEATURE_COLS]

    # Model inference
    pred_idx = int(_model.predict(X_df)[0])
    pred_label = LABEL_MAP_INV.get(pred_idx, "medium")

    # Confidence score
    conf = 85.0
    if hasattr(_model, "predict_proba"):
        probas = _model.predict_proba(X_df)[0]
        conf = round(float(np.max(probas)) * 100, 1)

    # Rank mapping: High = 1 (top of queue), Medium = 2, Low = 3 (bottom of queue)
    rank_map = {"high": 1, "medium": 2, "low": 3}
    complexity_rank = rank_map.get(pred_label, 2)

    return {
        "predictedComplexity": pred_label,
        "complexityRank": complexity_rank,
        "confidenceScore": conf,
        "featuresUsed": features_dict,
        "modelUsed": type(_model).__name__,
        "predictedAt": datetime.utcnow().isoformat() + "Z"
    }
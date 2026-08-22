"""
Generate realistic synthetic dataset for Nurse Review Complexity Predictor.
Incorporates strong clinical feature correlations, continuous boundary overlaps, 
and realistic clinical label noise (~4% inter-annotator variance) to ensure high model accuracy without data leakage.
"""
import sys
import random
import numpy as np
import pandas as pd

# Seed for reproducibility
random.seed(42)
np.random.seed(42)

# ── Feature Definitions ───────────────────────────────────────────────────────
ICD10_SIMPLE = ['M25.561', 'M17.11', 'Z12.31', 'I10', 'E11.9']
ICD10_MODERATE = ['G40.909', 'J44.1', 'N18.3', 'C50.919', 'M51.26']
ICD10_COMPLEX = ['C34.90', 'I50.23', 'E10.65', 'F20.9', 'G35']

CPT_DIAGNOSTIC = ['70553', '73721', '76830', '93306', '80053']
CPT_THERAPEUTIC = ['90832', '96372', '97110', '99213', '92507']
CPT_SURGICAL = ['29881', '47562', '52000', '64483', '27447']

TREATMENT_TYPES = ['Diagnostic', 'Therapeutic', 'Surgical']


def generate_sample_probabilistic() -> dict:
    """
    Generate one realistic PA request sample with strongly correlated clinical features,
    overlapping distributions, and 4% noise.
    """
    # 1. Base latent patient clinical severity factor (continuous spectrum 0.0 to 4.0)
    severity_latent = np.random.gamma(shape=2.0, scale=1.0)
    
    # 2. Correlated Feature Generation
    # Patient age: older patients lean toward higher severity
    patient_age = int(np.clip(25 + severity_latent * 12 + np.random.normal(0, 10), 18, 92))
    
    # Number of diagnoses & procedures increase with severity
    number_of_diagnoses = int(np.clip(1 + int(severity_latent * 1.1) + np.random.poisson(lam=0.5), 1, 8))
    number_of_procedures = int(np.clip(1 + int(severity_latent * 0.4) + np.random.poisson(lam=0.3), 1, 4))
    
    # Clinical documentation completeness decreases as case complexity rises
    clinical_documentation = 1 if np.random.rand() > (0.10 + severity_latent * 0.12) else 0
    medical_necessity_doc = 1 if np.random.rand() > (0.08 + severity_latent * 0.10) else 0
    previous_treatment = 1 if np.random.rand() > (0.15 + severity_latent * 0.08) else 0
    
    # Unknown pathways is directly driven by missing docs and severity
    doc_missing_factor = (1 - clinical_documentation) + (1 - medical_necessity_doc)
    unknown_pathways = int(np.clip(
        int(severity_latent * 0.8) + doc_missing_factor + np.random.poisson(lam=0.3), 
        0, 5
    ))
    
    rule_conditions_met = int(np.clip(np.random.normal(loc=8.0 - unknown_pathways * 1.2, scale=1.5), 1, 10))
    
    # Risk level correlated with severity & unknown pathways
    if severity_latent < 1.2 and unknown_pathways == 0:
        risk_level = 1  # low
    elif severity_latent < 2.8 or unknown_pathways <= 2:
        risk_level = np.random.choice([1, 2], p=[0.3, 0.7])
    else:
        risk_level = np.random.choice([2, 3], p=[0.2, 0.8])
        
    emergency_flag = 1 if (severity_latent > 2.5 and np.random.rand() < 0.35) else 0

    # Treatment type distribution
    if severity_latent < 1.5:
        treatment_type = np.random.choice(TREATMENT_TYPES, p=[0.60, 0.30, 0.10])
        procedure_code = random.choice(CPT_DIAGNOSTIC)
        diagnosis_code = random.choice(ICD10_SIMPLE + ICD10_MODERATE)
    elif severity_latent < 3.0:
        treatment_type = np.random.choice(TREATMENT_TYPES, p=[0.25, 0.50, 0.25])
        procedure_code = random.choice(CPT_THERAPEUTIC)
        diagnosis_code = random.choice(ICD10_MODERATE)
    else:
        treatment_type = np.random.choice(TREATMENT_TYPES, p=[0.10, 0.35, 0.55])
        procedure_code = random.choice(CPT_SURGICAL)
        diagnosis_code = random.choice(ICD10_COMPLEX)

    # 3. Calculate continuous complexity score (Weighted Multi-Factor Formula)
    complexity_score = (
        0.45 * unknown_pathways +
        0.35 * risk_level +
        0.25 * number_of_diagnoses +
        0.20 * doc_missing_factor +
        0.15 * (patient_age / 50.0) +
        0.15 * emergency_flag +
        0.15 * (1.0 if treatment_type == 'Surgical' else 0.0) -
        0.10 * rule_conditions_met +
        np.random.normal(0, 0.25)  # Controlled natural variation
    )

    # 4. Map score to continuous bins
    if complexity_score < 1.60:
        label = 'low'
    elif complexity_score < 2.80:
        label = 'medium'
    else:
        label = 'high'
        
    # 5. Inject 4% clinical noise (subtle inter-annotator edge cases)
    if np.random.rand() < 0.04:
        if label == 'low':
            label = 'medium'
        elif label == 'high':
            label = 'medium'
        elif label == 'medium':
            label = 'low' if np.random.rand() < 0.5 else 'high'

    return {
        'patient_age': patient_age,
        'diagnosis_code': diagnosis_code,
        'procedure_code': procedure_code,
        'treatment_type': treatment_type,
        'emergency_flag': emergency_flag,
        'previous_treatment': previous_treatment,
        'medical_necessity_doc': medical_necessity_doc,
        'clinical_documentation': clinical_documentation,
        'number_of_diagnoses': number_of_diagnoses,
        'number_of_procedures': number_of_procedures,
        'rule_conditions_met': rule_conditions_met,
        'unknown_pathways': unknown_pathways,
        'risk_level': risk_level,
        'complexity_label': label,
    }


def generate_dataset(n_samples: int = 50000) -> pd.DataFrame:
    """Generate dataset with strongly correlated probabilistic sampling."""
    print(f"Generating {n_samples} strongly correlated realistic samples...")
    samples = [generate_sample_probabilistic() for _ in range(n_samples)]
    df = pd.DataFrame(samples)
    print("  Class distribution:")
    for label, count in df['complexity_label'].value_counts().items():
        print(f"    {label.upper():6}: {count:6d} ({count/n_samples*100:.1f}%)")
    print()
    return df


if __name__ == '__main__':
    print("=" * 70)
    print("Correlated Synthetic Dataset Generator for Complexity Classifier")
    print("=" * 70)
    print()
    
    df = generate_dataset(n_samples=50000)
    
    output_file = 'synthetic_nurse_review_dataset.csv'
    df.to_csv(output_file, index=False)
    
    print("Feature Summary Statistics by Complexity Class:")
    print("-" * 70)
    for label in ['low', 'medium', 'high']:
        subset = df[df['complexity_label'] == label]
        print(f"\n{label.upper()}:")
        print(f"  Avg Age:                  {subset['patient_age'].mean():.1f}")
        print(f"  Avg Unknown Pathways:     {subset['unknown_pathways'].mean():.2f}")
        print(f"  Avg # Diagnoses:          {subset['number_of_diagnoses'].mean():.2f}")
        print(f"  Avg Risk Level:           {subset['risk_level'].mean():.2f}")
        print(f"  Avg Rule Conditions Met:  {subset['rule_conditions_met'].mean():.2f}")
    
    print()
    print("=" * 70)
    print(f"[OK] Dataset saved to: {output_file}")
    print("=" * 70)

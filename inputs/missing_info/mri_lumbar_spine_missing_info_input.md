# Prior Authorization Request Specification (Missing Info / Escalation Scenario)
## Lumbar Spine MRI Clinical Review Criteria

### 1. General & Patient Information
- **Policy ID:** MRI-69575638
- **Policy Name:** Lumbar Spine MRI Clinical Review Criteria
- **Patient ID:** p-008
- **Patient Name:** Patricia Lee
- **Date of Birth:** 1974-11-20 (Age 51)
- **Gender:** Female
- **Member ID:** UHC-1111-008
- **Member Type:** Non-Medicare (Commercial PPO)
- **Payer:** UnitedHealthcare / Apex Health Plan
- **Primary Care Provider:** Dr. Robert Vance, MD

### 2. Requesting Provider Information
- **Physician Name:** Dr. Sarah Jenkins, MD
- **NPI:** 1234567890
- **Organization:** Northwestern Memorial Hospital
- **Specialty:** Orthopedic Surgery / Pain Management
- **Phone:** (555) 987-6543
- **Tax ID:** 36-1234567

### 3. Procedure & Service Codes
- **Service Type:** Specialist Services / Outpatient Imaging
- **CPT Code:** 72148 — Magnetic Resonance Imaging (MRI), lumbar spine; without contrast material
- **Coding System:** CPT
- **Quantity:** 1
- **Place of Service:** Outpatient Hospital / Imaging Center

### 4. Diagnosis Codes
- **Primary ICD-10 Code:** M54.50 — Low back pain, unspecified
- **Secondary ICD-10 Code:** M54.16 — Radiculopathy, lumbar region

### 5. Rule Engine Criteria & Clinical Pathway Evaluation (Missing Info Scenario)
Mapped to **Lumbar Spine MRI Policy: MRI-69575638**

| Field Name | Required Criteria / Value | Submitted Clinical Findings | Status / Rule Engine Result |
| :--- | :--- | :--- | :--- |
| `conservative_treatment_duration` | >= 6 weeks | Duration of pain: 2 weeks (< 6 weeks) | ⚠️ Missing / Unverified (2 < 6 weeks) |
| `physical_therapy_duration` | >= 4 weeks | Physical therapy completed: 0 weeks | ⚠️ Missing Evidence (No PT evaluation) |
| `physical_therapy_visits` | Initial eval + follow-up | Physical therapy visits: 0 visits | ⚠️ Missing Evidence |
| `progressive_neurological_signs` | Progressive motor weakness | Neurological exam: Normal strength 5/5, no weakness | ❌ Not Met (No red flags) |
| `suspected_cauda_equina_syndrome` | Saddle numbness / bowel dysfunction | Bowel/bladder function: Normal, no numbness | ❌ Not Met |
| `spine_infection_suspicion` | Fever, IV drug use, elevated ESR | Temperature normal (98.6°F), no infection signs | ❌ Not Met |

### 6. Policy Exclusion Match
- **Uncomplicated Acute Low Back Pain:** Patient has uncomplicated acute (<6 weeks) low back pain without red flag symptoms or completed conservative therapy trial.
- **Rule Policy Trigger:** Excluded under `uncomplicated_acute_low_back_pain`.

### 7. Expected Rule Engine Decision
- **Rule Engine Output:** `Nurse Review Required` (or `More Information Required`)
- **Rationale:** Coverage criteria unverified for requested CPT 72148. Missing key clinical evidence: Conservative Treatment Duration (>= 6 weeks) and Physical Therapy Evaluation. Uncomplicated acute back pain (<6 weeks) requires clinical nurse review.

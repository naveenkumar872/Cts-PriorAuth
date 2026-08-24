# Prior Authorization Request Specification
## Deep Brain Stimulation (DBS) for Essential Tremor

### 1. General & Patient Information
- **Policy ID:** DEE-09991129
- **Policy Name:** Deep Brain Stimulation
- **Patient ID:** p-001
- **Patient Name:** John Anderson
- **Date of Birth:** 1968-05-14 (Age 58)
- **Gender:** Male
- **Member ID:** BCB-4821-001
- **Member Type:** Non-Medicare (Commercial HMO Platinum)
- **Payer:** Apex Health Plan
- **Primary Care Provider:** Dr. Sarah Jenkins, MD

### 2. Requesting Provider Information
- **Physician Name:** Dr. Marcus Thorne, MD (Functional Neurosurgery / Movement Disorders)
- **NPI:** 1982736450
- **Organization:** Metro Neuroscience & Surgical Institute
- **Specialty:** Neurosurgery / Movement Disorder Specialist
- **Phone:** (555) 234-8901
- **Tax ID:** 94-8123456

### 3. Procedure & Service Codes
- **Service Type:** Specialist Services / Surgical & Inpatient
- **CPT Code:** 61863 — Implantation of cranial neurostimulator array, thalamus (with intraoperative microelectrode recording)
- **HCPCS Code:** L8679 — Neurostimulator pulse generator, dual array, rechargeable, includes extension
- **CPT Description:** Deep Brain Stimulation Lead Implantation, Thalamus
- **Quantity:** 1
- **Place of Service:** Inpatient Hospital / Surgical Center

### 4. Diagnosis Codes
- **Primary ICD-10 Code:** G25.0 — Essential tremor
- **Secondary ICD-10 Code:** R25.1 — Tremor, unspecified

### 5. Rule Engine Criteria & Clinical Pathway Mapping
Mapped to **Pathway 1: essential_tremor_thalamic_stimulation** (Logic: ALL)

| Field Name | Required Criteria / Value | Provider Clinical Notes Mapping | Status |
| :--- | :--- | :--- | :--- |
| `clinical_condition` | Essential tremor | Diagnosed with severe, disabling Essential Tremor (ICD-10 G25.0) | Satisfied |
| `prior_treatment` | Failed maximal medical therapy for controlling tremor | Patient failed maximal tolerated medical therapy (Propranolol 240 mg/day & Primidone 750 mg/day for >6 months) without adequate tremor control | Satisfied |
| `mini_mental_state_examination_score` | >= 24 | MMSE Score: 28 / 30 (Normal cognitive function, no dementia) | Satisfied (28 >= 24) |
| `severe_depression` | No evidence | Neuropsychiatric evaluation confirms no evidence of severe depression (HAM-D score = 4; no active major depression or psychosis) | Satisfied |
| `clinical_notes_duration` | >= 6 months | Continuous clinical management and documentation over 14 months | Satisfied (14 >= 6 months) |

### 6. Exclusion Check (All Passed)
- **Refractory Obsessive-Compulsive Disorder:** No evidence / Not applicable
- **Primary Headache:** No evidence / Not applicable
- **Neuropathic Pain:** No evidence / Not applicable

### 7. Expected Rule Engine Decision
- **Rule Engine Output:** `Approved`
- **Rationale:** All 5 required criteria for non-medicare essential tremor thalamic stimulation (CPT 61863) are fully satisfied in clinical notes with no matching policy exclusions.

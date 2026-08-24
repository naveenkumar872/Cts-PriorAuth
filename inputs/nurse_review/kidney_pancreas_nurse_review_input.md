# Prior Authorization Request Specification (Nurse Review Scenario)
## Patient Referral Guidelines: Kidney/Pancreas Transplant

### 1. General & Patient Information
- **Patient ID:** pat-018
- **Patient Name:** Michael Johnson
- **Date of Birth:** 1952-11-08 (Age 73)
- **Gender:** Male
- **Payer:** UnitedHealthcare
- **Primary Care Provider:** Dr. Edward Miller, MD

### 2. Requesting Provider Information
- **Physician Name:** Dr. Richard Vance, MD
- **NPI:** 1987654321
- **Organization:** University of Chicago Transplant Center
- **Specialty:** Transplant Surgery / Nephrology
- **Phone:** (555) 312-7000
- **Tax ID:** 36-9876543

### 3. Procedure & Service Codes
- **Service Type:** Surgery / Procedure
- **CPT Code:** 50360 — Renal allotransplantation, implantation of graft; without recipient nephrectomy
- **Secondary CPT Code:** 48554 — Pancreas allotransplantation; transplantation of organ
- **Coding System:** CPT
- **Quantity:** 1
- **Place of Service:** Inpatient Hospital / Transplant Center of Excellence

### 4. Diagnosis Codes
- **Primary ICD-10 Code:** E11.22 — Type 2 diabetes mellitus with diabetic nephropathy
- **Secondary ICD-10 Code:** N18.4 — Chronic kidney disease, Stage 4 (severe)

### 5. Clinical Notes (Copy & Paste Text for Request Form)
> **Paste the text below into the Clinical Notes / Clinical Indication field to trigger Nurse Review Required:**
>
> `Patient History & Clinical Indication: 73-year-old male (Age 73 years old) referred for Simultaneous Kidney-Pancreas (SKP) transplantation evaluation (CPT 50360, 48554). Diagnosis: Type 1 diabetes mellitus with or approaching end stage renal disease / Type 2 DM (ICD-10 E11.22, N18.4). Verified candidate for kidney transplant (kidney transplant candidate: Yes). Endocrinologist management duration: 24 months. Type 1 DM verification: stimulated C-peptide testing. Laboratory Findings: eGFR 18 mL/min/1.73m², C-peptide level 3.8 ng/mL, daily insulin requirement >85 units/day. Anthropometrics: BMI 37.5 kg/m², blood pressure 178/104 mmHg (uncontrolled hypertension). Infection & Contraindication Status: Patient is currently being treated for an uncontrollable active infection (persistent vascular graft infection with MRSA bacteremia requiring IV Vancomycin). Medical assessment confirms presence of policy exclusions: uncontrollable active infection and uncontrolled hypertension. Requires formal clinical nurse review and multidisciplinary committee evaluation due to policy exclusions and high BMI 37.5.`

### 6. Rule Engine Criteria & Clinical Pathway Evaluation (Nurse Review Trigger)
Mapped to **Kidney/Pancreas Policy**

| Field Name | Required Criteria / Value | Submitted Clinical Findings | Status / Rule Engine Result |
| :--- | :--- | :--- | :--- |
| `diagnosis` | Type 2 Diabetes Mellitus | Type 2 DM with diabetic nephropathy (E11.22) | Satisfied |
| `c_peptide_level` | Low | C-peptide level: 3.8 ng/mL (Normal/High, non-suppressed) | ❌ Failed (High C-peptide) |
| `bmi` | < 28 | Patient BMI: 37.5 kg/m² | ❌ Failed (Exceeds max BMI < 28) |
| `insulin_requirement` | Low dose | High dose insulin (> 85 units/day) | ❌ Failed (High dose insulin) |
| `estimated_gfr` | < 20 ml/min | eGFR: 18 ml/min | Satisfied |
| `active_infection` | None (Uncontrollable active infection) | Uncontrollable active infection (MRSA bacteremia) | ❌ EXCLUSION MATCH (Active Infection) |
| `uncontrolled_hypertension` | None | Severe uncontrolled hypertension (BP 178/104 mmHg) | ❌ EXCLUSION MATCH (Uncontrolled HTN) |

### 7. Policy Exclusion & Contraindication Matches
- **Exclusion Identified:** `active_infection` ("Uncontrollable active infection / MRSA bacteremia").
- **Exclusion Identified:** `uncontrolled_hypertension` ("Uncontrolled hypertension with end-organ strain").
- **Relative Contraindication:** `high_bmi` (BMI 37.5 >= 35 kg/m² requiring multidisciplinary COE review).

### 8. Expected Rule Engine Decision
- **Rule Engine Output:** `Nurse Review Required`
- **Rationale:** Policy exclusions identified (`uncontrollable active infection` and `uncontrolled hypertension`) along with clinical relative contraindication (BMI 37.5 >= 35). Clinical nurse reviewer and transplant committee evaluation required prior to prior authorization determination.

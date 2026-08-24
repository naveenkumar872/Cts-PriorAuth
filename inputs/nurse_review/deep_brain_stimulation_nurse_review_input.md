# Prior Authorization Request Specification (Nurse Review & Policy Exclusion Scenario)
## Deep Brain Stimulation (DBS) for Essential Tremor — Mismatched CPT & Policy Exclusions

### 1. General & Patient Information
- **Patient ID:** pat-019
- **Patient Name:** Robert Williams
- **Date of Birth:** 1953-06-14 (Age 73)
- **Gender:** Male
- **Payer:** BlueCross BlueShield
- **Primary Care Provider:** Dr. James Collins, MD

### 2. Requesting Provider Information
- **Physician Name:** Dr. Marcus Thorne, MD (Functional Neurosurgery / Movement Disorders)
- **NPI:** 1982736450
- **Organization:** Metro Neuroscience & Surgical Institute
- **Specialty:** Neurosurgery / Movement Disorder Specialist
- **Phone:** (555) 234-8901
- **Tax ID:** 94-8123456

### 3. Procedure & Service Codes (Invalid / Mismatched CPT Code)
- **Service Type:** Surgery / Procedure
- **CPT Code:** 61899 — Unlisted cranial procedure (Mismatched / Invalid CPT Code for Thalamic DBS)
- **HCPCS Code:** L8679 — Neurostimulator pulse generator
- **CPT Description:** Unlisted procedure, central nervous system / Mismatched CPT
- **Coding System:** CPT
- **Quantity:** 1
- **Place of Service:** Inpatient Hospital / Surgical Center

### 4. Diagnosis Codes
- **Primary ICD-10 Code:** G25.0 — Essential tremor
- **Secondary ICD-10 Code:** F42.2 — Refractory Obsessive-Compulsive Disorder (POLICY EXCLUSION)
- **Tertiary ICD-10 Code:** G44.0 — Primary Headache Disorder (POLICY EXCLUSION)

### 5. Clinical Notes (Copy & Paste Text for Request Form / Auto-Fill)
> **Paste the text below into the Clinical Notes / Clinical Indication field to trigger Nurse Review Required & Policy Exclusions:**
>
> `Patient History & Clinical Indication: 73-year-old male (Age 73 years old) presenting with severe Essential Tremor (ICD-10 G25.0) requesting unlisted cranial neurostimulator procedure (CPT 61899, HCPCS L8679). Patient trialed Propranolol & Primidone for 14 months without relief. MMSE Score: 28 / 30. Clinical assessment reveals presence of policy exclusions: patient is diagnosed with refractory obsessive-compulsive disorder (F42.2 - Refractory Obsessive-Compulsive Disorder policy exclusion), primary headache disorder (G44.0 - Primary Headache policy exclusion), and neuropathic pain syndrome. CPT code 61899 is mismatched / unlisted for standard DBS thalamic lead implantation policy. Requires formal clinical nurse review and medical director evaluation due to mismatched CPT code 61899 and policy exclusions (Refractory Obsessive-Compulsive Disorder, Primary Headache, Neuropathic Pain).`

### 6. Rule Engine Evaluation Summary (Nurse Review Trigger)
Mapped to **Deep Brain Stimulation Policy (DEE-09991129)**

| Field Name | Required Criteria / Value | Submitted Clinical Findings | Status / Rule Engine Result |
| :--- | :--- | :--- | :--- |
| `requested_cpt` | 61863 | CPT 61899 (Unlisted / Wrong CPT Code) | ❌ CPT MISMATCH (Wrong CPT Code) |
| `exclusion_1` | No Refractory OCD | Refractory Obsessive-Compulsive Disorder (F42.2) | ❌ POLICY EXCLUSION MATCH |
| `exclusion_2` | No Primary Headache | Primary Headache Disorder (G44.0) | ❌ POLICY EXCLUSION MATCH |
| `exclusion_3` | No Neuropathic Pain | Neuropathic Pain Syndrome | ❌ POLICY EXCLUSION MATCH |

### 7. Expected Rule Engine Decision
- **Rule Engine Output:** `Nurse Review Required`
- **Rationale:** Mismatched procedure CPT code 61899 and multiple policy exclusions identified (Refractory Obsessive-Compulsive Disorder, Primary Headache, Neuropathic Pain). Clinical nurse review required.

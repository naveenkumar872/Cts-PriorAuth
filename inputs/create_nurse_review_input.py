import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Directories
nurse_review_dir = "d:/NaveenCts/inputs/nurse_review"
inputs_dir = "d:/NaveenCts/inputs"
os.makedirs(nurse_review_dir, exist_ok=True)

# ── Styles Setup ─────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()
normal = styles["Normal"]

title_style = ParagraphStyle(
    "DocTitle",
    parent=normal,
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    textColor=colors.HexColor("#7c2d12"),
    alignment=0,
)

subtitle_style = ParagraphStyle(
    "DocSubtitle",
    parent=normal,
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=14,
    textColor=colors.HexColor("#ea580c"),
)

section_heading = ParagraphStyle(
    "SectionHeading",
    parent=normal,
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=16,
    textColor=colors.HexColor("#0f172a"),
    spaceBefore=10,
    spaceAfter=4,
)

body_style = ParagraphStyle(
    "BodyTextCustom",
    parent=normal,
    fontName="Helvetica",
    fontSize=9.5,
    leading=14,
    textColor=colors.HexColor("#334155"),
)

# ── SCENARIO 1: Kidney / Pancreas Transplant Nurse Review ─────────────────────

md_kidney_pancreas = """# Prior Authorization Request Specification (Nurse Review Scenario)
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
"""

md_nurse_path = os.path.join(nurse_review_dir, "kidney_pancreas_nurse_review_input.md")
with open(md_nurse_path, "w", encoding="utf-8") as f:
    f.write(md_kidney_pancreas)
print(f"Created {md_nurse_path}")


# Generate Kidney/Pancreas Clinical Notes PDF
pdf_kp_notes = os.path.join(nurse_review_dir, "kidney_pancreas_clinical_notes.pdf")
doc_kp_notes = SimpleDocTemplate(
    pdf_kp_notes,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_kp_notes = []
story_kp_notes.append(Paragraph("UNIVERSITY OF CHICAGO TRANSPLANT CENTER", title_style))
story_kp_notes.append(Paragraph("Multidisciplinary Kidney/Pancreas Evaluation Board", subtitle_style))
story_kp_notes.append(Spacer(1, 4))
story_kp_notes.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#7c2d12"), spaceAfter=10))

demo_data_kp = [
    [Paragraph("<b>Patient Name:</b> Michael Johnson", body_style), Paragraph("<b>DOB:</b> 11/08/1952 (Age 73)", body_style)],
    [Paragraph("<b>Patient ID:</b> pat-018", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Payer:</b> UnitedHealthcare", body_style), Paragraph("<b>Primary Care:</b> Dr. Edward Miller, MD", body_style)],
    [Paragraph("<b>Requesting Physician:</b> Dr. Richard Vance, MD", body_style), Paragraph("<b>NPI:</b> 1987654321", body_style)],
    [Paragraph("<b>Procedure Requested:</b> CPT 50360 &amp; 48554 (SKP)", body_style), Paragraph("<b>Primary Diagnosis:</b> E11.22 Type 2 DM / CKD", body_style)],
]
t_kp_notes = Table(demo_data_kp, colWidths=[260, 260])
t_kp_notes.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_kp_notes.append(t_kp_notes)
story_kp_notes.append(Spacer(1, 12))

story_kp_notes.append(Paragraph("MULTIDISCIPLINARY EVALUATION NOTE — NURSE REVIEW / ESCALATION", section_heading))
story_kp_notes.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#fed7aa"), spaceAfter=8))

p1 = ("<b>Patient History &amp; Clinical Indication:</b><br/>"
      "Patient is a 73-year-old male with a 15-year history of Type 1 diabetes mellitus with or approaching end stage renal disease / Type 2 DM (ICD-10 E11.22, N18.4). "
      "Referred for Simultaneous Kidney-Pancreas (SKP) transplantation evaluation (CPT 50360, 48554). "
      "Verified candidate for kidney transplant (kidney transplant candidate: Yes). "
      "Endocrinologist management duration: 24 months. Type 1 DM verification: stimulated C-peptide testing.")
story_kp_notes.append(Paragraph(p1, body_style))
story_kp_notes.append(Spacer(1, 8))

p2 = ("<b>Laboratory &amp; Diagnostic Findings:</b><br/>"
      "Current laboratory evaluation demonstrates an estimated GFR (eGFR) of <b>18 mL/min/1.73m²</b> (meets UNOS listing cutoff of &lt;20 mL/min). "
      "Serum C-peptide level is <b>3.8 ng/mL</b> (normal/high, non-suppressed C-peptide). "
      "Daily insulin requirement is high-dose (&gt;85 units/day).")
story_kp_notes.append(Paragraph(p2, body_style))
story_kp_notes.append(Spacer(1, 8))

p3 = ("<b>Physical Examination &amp; Anthropometrics:</b><br/>"
      "Height: 5'10\", Weight: 261 lbs, <b>BMI: 37.5 kg/m²</b> (Exceeds standard SPK threshold of &lt;28 kg/m²; triggers high BMI relative contraindication &gt;=35 kg/m²). "
      "Blood pressure on presentation is severely elevated at <b>178/104 mmHg</b> (Uncontrolled hypertension).")
story_kp_notes.append(Paragraph(p3, body_style))
story_kp_notes.append(Spacer(1, 8))

p4 = ("<b>Exclusion Criteria &amp; Infection Status:</b><br/>"
      "Patient is currently being treated for an <b>uncontrollable active infection</b> (persistent vascular graft infection with MRSA bacteremia requiring ongoing IV Vancomycin therapy). "
      "Medical assessment confirms presence of policy exclusions: <b>uncontrollable active infection</b> and <b>uncontrolled hypertension</b>. "
      "Recommendation: Requires formal clinical nurse review and multidisciplinary committee evaluation due to policy exclusions and BMI 37.5.")
story_kp_notes.append(Paragraph(p4, body_style))
story_kp_notes.append(Spacer(1, 14))

sig_data = [
    [Paragraph("<b>Transplant Surgeon:</b> Dr. Richard Vance, MD", body_style), Paragraph("<b>Signature:</b> <i>R. Vance, MD</i>", body_style)],
    [Paragraph("<b>Date:</b> August 24, 2026", body_style), Paragraph("<b>License #:</b> MD-489201-IL", body_style)],
]
st = Table(sig_data, colWidths=[260, 260])
st.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#ea580c")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story_kp_notes.append(st)

doc_kp_notes.build(story_kp_notes)
print(f"Generated PDF at {pdf_kp_notes}")


# Generate Kidney/Pancreas Prior Auth Request Form PDF
pdf_kp_req = os.path.join(nurse_review_dir, "kidney_pancreas_prior_auth_request.pdf")

doc_kp_req = SimpleDocTemplate(
    pdf_kp_req,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_kp_req = []
story_kp_req.append(Paragraph("PRIOR AUTHORIZATION REQUEST FORM", title_style))
story_kp_req.append(Paragraph("Doctor Clinical Intake Document", subtitle_style))
story_kp_req.append(Spacer(1, 4))
story_kp_req.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#7c2d12"), spaceAfter=10))

story_kp_req.append(Paragraph("1. PATIENT DEMOGRAPHICS", section_heading))
patient_table_kp = [
    [Paragraph("<b>Patient ID:</b> pat-018", body_style), Paragraph("<b>Patient Name:</b> Michael Johnson", body_style)],
    [Paragraph("<b>Date of Birth:</b> 1952-11-08", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Payer:</b> UnitedHealthcare", body_style), Paragraph("<b>Primary Care Provider:</b> Dr. Edward Miller, MD", body_style)],
]
t_pat_kp = Table(patient_table_kp, colWidths=[260, 260])
t_pat_kp.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_kp_req.append(t_pat_kp)
story_kp_req.append(Spacer(1, 10))

story_kp_req.append(Paragraph("2. REQUESTING PROVIDER DETAILS", section_heading))
provider_table_kp = [
    [Paragraph("<b>Physician Name:</b> Dr. Richard Vance, MD", body_style), Paragraph("<b>NPI:</b> 1987654321", body_style)],
    [Paragraph("<b>Specialty:</b> Transplant Surgery / Nephrology", body_style), Paragraph("<b>Organization:</b> University of Chicago Transplant Center", body_style)],
    [Paragraph("<b>Phone:</b> (555) 312-7000", body_style), Paragraph("<b>Tax ID:</b> 36-9876543", body_style)],
]
t_prov_kp = Table(provider_table_kp, colWidths=[260, 260])
t_prov_kp.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_kp_req.append(t_prov_kp)
story_kp_req.append(Spacer(1, 10))

story_kp_req.append(Paragraph("3. REQUESTED TREATMENT &amp; PROCEDURE CODES", section_heading))
treatment_table_kp = [
    [Paragraph("<b>Service Type:</b> Surgery / Procedure", body_style), Paragraph("<b>Coding System:</b> CPT", body_style)],
    [Paragraph("<b>Service Code (CPT):</b> 50360", body_style), Paragraph("<b>Secondary Code:</b> 48554", body_style)],
    [Paragraph("<b>Procedure Description:</b> Simultaneous Kidney-Pancreas (SKP) Transplantation", body_style), Paragraph("<b>Quantity:</b> 1", body_style)],
]
t_treat_kp = Table(treatment_table_kp, colWidths=[260, 260])
t_treat_kp.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_kp_req.append(t_treat_kp)
story_kp_req.append(Spacer(1, 10))

story_kp_req.append(Paragraph("4. DIAGNOSIS CODES", section_heading))
diag_table_kp = [
    [Paragraph("<b>Primary Diagnosis Code:</b> E11.22", body_style), Paragraph("<b>Description:</b> Type 2 diabetes mellitus with diabetic nephropathy (Primary)", body_style)],
    [Paragraph("<b>Secondary Diagnosis Code:</b> N18.4", body_style), Paragraph("<b>Description:</b> Chronic kidney disease, Stage 4 (Secondary)", body_style)],
]
t_diag_kp = Table(diag_table_kp, colWidths=[260, 260])
t_diag_kp.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_kp_req.append(t_diag_kp)
story_kp_req.append(Spacer(1, 10))

story_kp_req.append(Paragraph("5. CLINICAL INDICATION &amp; MEASUREMENTS", section_heading))
story_kp_req.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#fed7aa"), spaceAfter=6))
clin_text_kp = (
    "<b>Clinical Indication:</b> 73-year-old male referred for Simultaneous Kidney-Pancreas (SKP) transplantation evaluation (CPT 50360, 48554).<br/>"
    "<b>Laboratory Findings:</b> eGFR 18 mL/min/1.73m², C-peptide level 3.8 ng/mL, daily insulin requirement >85 units/day.<br/>"
    "<b>Anthropometrics:</b> BMI 37.5 kg/m², blood pressure 178/104 mmHg (uncontrolled hypertension).<br/>"
    "<b>Infection &amp; Contraindication Status:</b> Patient is currently being treated for an uncontrollable active infection (persistent vascular graft infection with MRSA bacteremia requiring IV Vancomycin). Triggers active infection policy exclusion."
)
story_kp_req.append(Paragraph(clin_text_kp, body_style))
story_kp_req.append(Spacer(1, 14))
story_kp_req.append(st)

doc_kp_req.build(story_kp_req)
print(f"Generated Prior Auth Request PDF at {pdf_kp_req}")


# ── SCENARIO 2: Deep Brain Stimulation (DBS) Nurse Review ────────────────────

md_dbs = """# Prior Authorization Request Specification (Nurse Review & Policy Exclusion Scenario)
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
Mapped to **Deep Brain Stimulation Policy**

| Field Name | Required Criteria / Value | Submitted Clinical Findings | Status / Rule Engine Result |
| :--- | :--- | :--- | :--- |
| `requested_cpt` | 61863 | CPT 61899 (Unlisted / Wrong CPT Code) | ❌ CPT MISMATCH (Wrong CPT Code) |
| `exclusion_1` | No Refractory OCD | Refractory Obsessive-Compulsive Disorder (F42.2) | ❌ POLICY EXCLUSION MATCH |
| `exclusion_2` | No Primary Headache | Primary Headache Disorder (G44.0) | ❌ POLICY EXCLUSION MATCH |
| `exclusion_3` | No Neuropathic Pain | Neuropathic Pain Syndrome | ❌ POLICY EXCLUSION MATCH |

### 7. Expected Rule Engine Decision
- **Rule Engine Output:** `Nurse Review Required`
- **Rationale:** Mismatched procedure CPT code 61899 and multiple policy exclusions identified (Refractory Obsessive-Compulsive Disorder, Primary Headache, Neuropathic Pain). Clinical nurse review required.
"""

md_dbs_path = os.path.join(nurse_review_dir, "deep_brain_stimulation_nurse_review_input.md")
with open(md_dbs_path, "w", encoding="utf-8") as f:
    f.write(md_dbs)
print(f"Created {md_dbs_path}")


# Generate DBS Clinical Notes PDF
pdf_dbs_notes = os.path.join(nurse_review_dir, "deep_brain_stimulation_nurse_review_notes.pdf")
doc_dbs_notes = SimpleDocTemplate(
    pdf_dbs_notes,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_dbs_notes = []
story_dbs_notes.append(Paragraph("METRO NEUROSCIENCE & SURGICAL INSTITUTE", title_style))
story_dbs_notes.append(Paragraph("Functional Neurosurgery & Movement Disorders Clinic", subtitle_style))
story_dbs_notes.append(Spacer(1, 4))
story_dbs_notes.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#7c2d12"), spaceAfter=10))

demo_data_dbs = [
    [Paragraph("<b>Patient Name:</b> Robert Williams", body_style), Paragraph("<b>DOB:</b> 06/14/1953 (Age 73)", body_style)],
    [Paragraph("<b>Patient ID:</b> pat-019", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Payer:</b> BlueCross BlueShield", body_style), Paragraph("<b>Primary Care:</b> Dr. James Collins, MD", body_style)],
    [Paragraph("<b>Requesting Physician:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>NPI:</b> 1982736450", body_style)],
    [Paragraph("<b>Procedure Requested:</b> CPT 61899 &amp; HCPCS L8679", body_style), Paragraph("<b>Primary Diagnosis:</b> G25.0 Essential Tremor", body_style)],
]
t_dbs_notes = Table(demo_data_dbs, colWidths=[260, 260])
t_dbs_notes.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_notes.append(t_dbs_notes)
story_dbs_notes.append(Spacer(1, 12))

story_dbs_notes.append(Paragraph("NEUROLOGICAL & SURGICAL EVALUATION NOTE — NURSE REVIEW / POLICY EXCLUSIONS", section_heading))
story_dbs_notes.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#fed7aa"), spaceAfter=8))

p1_dbs = ("<b>Patient History &amp; Clinical Indication:</b><br/>"
          "73-year-old male presenting with severe Essential Tremor (ICD-10 G25.0) requesting unlisted cranial neurostimulator procedure (CPT 61899, HCPCS L8679). "
          "Patient trialed Propranolol &amp; Primidone for 14 months without adequate symptomatic relief. MMSE Score: 28 / 30.")
story_dbs_notes.append(Paragraph(p1_dbs, body_style))
story_dbs_notes.append(Spacer(1, 8))

p2_dbs = ("<b>Policy Exclusion Findings &amp; Contraindications:</b><br/>"
          "Clinical assessment reveals presence of policy exclusions: patient is diagnosed with refractory obsessive-compulsive disorder (F42.2 - Refractory OCD exclusion), "
          "primary headache disorder (G44.0 - Primary Headache exclusion), and chronic neuropathic pain syndrome. "
          "CPT code 61899 is mismatched / unlisted for standard DBS lead implantation policy.<br/>"
          "<b>Recommendation:</b> Formal clinical nurse review and medical director evaluation required due to unlisted CPT code 61899 and policy exclusions.")
story_dbs_notes.append(Paragraph(p2_dbs, body_style))
story_dbs_notes.append(Spacer(1, 14))

sig_data_dbs = [
    [Paragraph("<b>Neurosurgeon:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>Signature:</b> <i>M. Thorne, MD</i>", body_style)],
    [Paragraph("<b>Date:</b> August 24, 2026", body_style), Paragraph("<b>License #:</b> MD-901823-IL", body_style)],
]
st_dbs = Table(sig_data_dbs, colWidths=[260, 260])
st_dbs.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#ea580c")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_notes.append(st_dbs)

doc_dbs_notes.build(story_dbs_notes)
print(f"Generated PDF at {pdf_dbs_notes}")


# Generate DBS Prior Auth Request PDF
pdf_dbs_req = os.path.join(nurse_review_dir, "deep_brain_stimulation_nurse_review_request.pdf")
doc_dbs_req = SimpleDocTemplate(
    pdf_dbs_req,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_dbs_req = []
story_dbs_req.append(Paragraph("PRIOR AUTHORIZATION REQUEST FORM", title_style))
story_dbs_req.append(Paragraph("Doctor Clinical Intake Document", subtitle_style))
story_dbs_req.append(Spacer(1, 4))
story_dbs_req.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#7c2d12"), spaceAfter=10))

story_dbs_req.append(Paragraph("1. PATIENT DEMOGRAPHICS", section_heading))
patient_table_dbs = [
    [Paragraph("<b>Patient ID:</b> pat-019", body_style), Paragraph("<b>Patient Name:</b> Robert Williams", body_style)],
    [Paragraph("<b>Date of Birth:</b> 1953-06-14", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Payer:</b> BlueCross BlueShield", body_style), Paragraph("<b>Primary Care Provider:</b> Dr. James Collins, MD", body_style)],
]
t_pat_dbs = Table(patient_table_dbs, colWidths=[260, 260])
t_pat_dbs.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_req.append(t_pat_dbs)
story_dbs_req.append(Spacer(1, 10))

story_dbs_req.append(Paragraph("2. REQUESTING PROVIDER DETAILS", section_heading))
provider_table_dbs = [
    [Paragraph("<b>Physician Name:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>NPI:</b> 1982736450", body_style)],
    [Paragraph("<b>Specialty:</b> Neurosurgery / Movement Disorder Specialist", body_style), Paragraph("<b>Organization:</b> Metro Neuroscience & Surgical Institute", body_style)],
    [Paragraph("<b>Phone:</b> (555) 234-8901", body_style), Paragraph("<b>Tax ID:</b> 94-8123456", body_style)],
]
t_prov_dbs = Table(provider_table_dbs, colWidths=[260, 260])
t_prov_dbs.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_req.append(t_prov_dbs)
story_dbs_req.append(Spacer(1, 10))

story_dbs_req.append(Paragraph("3. REQUESTED TREATMENT &amp; PROCEDURE CODES", section_heading))
treatment_table_dbs = [
    [Paragraph("<b>Service Type:</b> Surgery / Procedure", body_style), Paragraph("<b>Coding System:</b> CPT", body_style)],
    [Paragraph("<b>Service Code (CPT):</b> 61899", body_style), Paragraph("<b>HCPCS Code:</b> L8679", body_style)],
    [Paragraph("<b>Procedure Description:</b> Deep Brain Stimulation (Unlisted Procedure)", body_style), Paragraph("<b>Quantity:</b> 1", body_style)],
]
t_treat_dbs = Table(treatment_table_dbs, colWidths=[260, 260])
t_treat_dbs.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_req.append(t_treat_dbs)
story_dbs_req.append(Spacer(1, 10))

story_dbs_req.append(Paragraph("4. DIAGNOSIS CODES", section_heading))
diag_table_dbs = [
    [Paragraph("<b>Primary Diagnosis Code:</b> G25.0", body_style), Paragraph("<b>Description:</b> Essential tremor (Primary)", body_style)],
    [Paragraph("<b>Secondary Diagnosis Code:</b> F42.2", body_style), Paragraph("<b>Description:</b> Refractory Obsessive-Compulsive Disorder (Exclusion)", body_style)],
    [Paragraph("<b>Tertiary Diagnosis Code:</b> G44.0", body_style), Paragraph("<b>Description:</b> Primary Headache Disorder (Exclusion)", body_style)],
]
t_diag_dbs = Table(diag_table_dbs, colWidths=[260, 260])
t_diag_dbs.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_req.append(t_diag_dbs)
story_dbs_req.append(Spacer(1, 10))

story_dbs_req.append(Paragraph("5. CLINICAL INDICATION &amp; MEASUREMENTS", section_heading))
story_dbs_req.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#fed7aa"), spaceAfter=6))
clin_text_dbs = (
    "<b>Clinical Indication:</b> 73-year-old male presenting with severe Essential Tremor (ICD-10 G25.0) requesting unlisted cranial neurostimulator procedure (CPT 61899, HCPCS L8679).<br/>"
    "<b>Trial History:</b> Propranolol &amp; Primidone for 14 months without symptomatic relief. MMSE Score: 28 / 30.<br/>"
    "<b>Policy Exclusion Status:</b> Clinical assessment identifies policy exclusions: Refractory OCD (F42.2), Primary Headache Disorder (G44.0), and Neuropathic Pain Syndrome. CPT code 61899 is mismatched / unlisted for standard DBS thalamic lead policy. Requires formal clinical nurse review."
)
story_dbs_req.append(Paragraph(clin_text_dbs, body_style))
story_dbs_req.append(Spacer(1, 14))
story_dbs_req.append(st_dbs)

doc_dbs_req.build(story_dbs_req)
print(f"Generated DBS Prior Auth Request PDF at {pdf_dbs_req}")

# Copy script to root inputs and create alias scripts
script_root_filename = os.path.join(inputs_dir, "create_nurse_review_input.py")
script_dbs_filename = os.path.join(inputs_dir, "create_dbs_nurse_review_input.py")

with open(__file__, "r", encoding="utf-8") as src:
    content = src.read()

for dest_path in [script_root_filename, script_dbs_filename]:
    with open(dest_path, "w", encoding="utf-8") as dst:
        dst.write(content)
    print(f"Synced script to {dest_path}")

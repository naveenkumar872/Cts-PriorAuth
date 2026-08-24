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

# ── 1. Generate Markdown Specification for Nurse Review Scenario ──────────────
md_nurse_review_content = """# Prior Authorization Request Specification (Nurse Review Scenario)
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
    f.write(md_nurse_review_content)

print(f"Created {md_nurse_path}")

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

# ── 2. Generate Clinical Notes PDF for Nurse Review Kidney/Pancreas Request ────
pdf_filename = os.path.join(nurse_review_dir, "kidney_pancreas_clinical_notes.pdf")
doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story = []
story.append(Paragraph("UNIVERSITY OF CHICAGO TRANSPLANT CENTER", title_style))
story.append(Paragraph("Multidisciplinary Kidney/Pancreas Evaluation Board", subtitle_style))
story.append(Spacer(1, 4))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#7c2d12"), spaceAfter=10))

demo_data = [
    [Paragraph("<b>Patient Name:</b> Michael Johnson", body_style), Paragraph("<b>DOB:</b> 11/08/1952 (Age 73)", body_style)],
    [Paragraph("<b>Patient ID:</b> pat-018", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Payer:</b> UnitedHealthcare", body_style), Paragraph("<b>Primary Care:</b> Dr. Edward Miller, MD", body_style)],
    [Paragraph("<b>Requesting Physician:</b> Dr. Richard Vance, MD", body_style), Paragraph("<b>NPI:</b> 1987654321", body_style)],
    [Paragraph("<b>Procedure Requested:</b> CPT 50360 &amp; 48554 (SKP)", body_style), Paragraph("<b>Primary Diagnosis:</b> E11.22 Type 2 DM / CKD", body_style)],
]
t = Table(demo_data, colWidths=[260, 260])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story.append(t)
story.append(Spacer(1, 12))

story.append(Paragraph("MULTIDISCIPLINARY EVALUATION NOTE — NURSE REVIEW / ESCALATION", section_heading))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#fed7aa"), spaceAfter=8))

p1 = ("<b>Patient History &amp; Clinical Indication:</b><br/>"
      "Patient is a 73-year-old male with a 15-year history of Type 1 diabetes mellitus with or approaching end stage renal disease / Type 2 DM (ICD-10 E11.22, N18.4). "
      "Referred for Simultaneous Kidney-Pancreas (SKP) transplantation evaluation (CPT 50360, 48554). "
      "Verified candidate for kidney transplant (kidney transplant candidate: Yes). "
      "Endocrinologist management duration: 24 months. Type 1 DM verification: stimulated C-peptide testing.")
story.append(Paragraph(p1, body_style))
story.append(Spacer(1, 8))

p2 = ("<b>Laboratory &amp; Diagnostic Findings:</b><br/>"
      "Current laboratory evaluation demonstrates an estimated GFR (eGFR) of <b>18 mL/min/1.73m²</b> (meets UNOS listing cutoff of &lt;20 mL/min). "
      "Serum C-peptide level is <b>3.8 ng/mL</b> (normal/high, non-suppressed C-peptide). "
      "Daily insulin requirement is high-dose (&gt;85 units/day).")
story.append(Paragraph(p2, body_style))
story.append(Spacer(1, 8))

p3 = ("<b>Physical Examination &amp; Anthropometrics:</b><br/>"
      "Height: 5'10\", Weight: 261 lbs, <b>BMI: 37.5 kg/m²</b> (Exceeds standard SPK threshold of &lt;28 kg/m²; triggers high BMI relative contraindication &gt;=35 kg/m²). "
      "Blood pressure on presentation is severely elevated at <b>178/104 mmHg</b> (Uncontrolled hypertension).")
story.append(Paragraph(p3, body_style))
story.append(Spacer(1, 8))

p4 = ("<b>Exclusion Criteria &amp; Infection Status:</b><br/>"
      "Patient is currently being treated for an <b>uncontrollable active infection</b> (persistent vascular graft infection with MRSA bacteremia requiring ongoing IV Vancomycin therapy). "
      "Medical assessment confirms presence of policy exclusions: <b>uncontrollable active infection</b> and <b>uncontrolled hypertension</b>. "
      "Recommendation: Requires formal clinical nurse review and multidisciplinary committee evaluation due to policy exclusions and BMI 37.5.")
story.append(Paragraph(p4, body_style))
story.append(Spacer(1, 14))

sig_data = [
    [Paragraph("<b>Transplant Surgeon:</b> Dr. Richard Vance, MD", body_style), Paragraph("<b>Signature:</b> <i>R. Vance, MD</i>", body_style)],
    [Paragraph("<b>Date:</b> August 24, 2026", body_style), Paragraph("<b>License #:</b> MD-489201-IL", body_style)],
]
st = Table(sig_data, colWidths=[260, 260])
st.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#ea580c")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story.append(st)

doc.build(story)
print(f"Generated PDF at {pdf_filename}")


# ── 3. Generate Prior Authorization Intake & Request Form PDF (For Upload/Autofill) ──
pdf_req_filename = os.path.join(nurse_review_dir, "kidney_pancreas_prior_auth_request.pdf")

doc_req = SimpleDocTemplate(
    pdf_req_filename,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_req = []
story_req.append(Paragraph("PRIOR AUTHORIZATION REQUEST FORM", title_style))
story_req.append(Paragraph("Doctor Clinical Intake &amp; Autofill Document Submission", subtitle_style))
story_req.append(Spacer(1, 4))
story_req.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#7c2d12"), spaceAfter=10))

story_req.append(Paragraph("1. PATIENT DEMOGRAPHICS", section_heading))
patient_table_data = [
    [Paragraph("<b>Patient ID:</b> pat-018", body_style), Paragraph("<b>Patient Name:</b> Michael Johnson", body_style)],
    [Paragraph("<b>Date of Birth:</b> 1952-11-08", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Payer:</b> UnitedHealthcare", body_style), Paragraph("<b>Primary Care Provider:</b> Dr. Edward Miller, MD", body_style)],
]
t_pat = Table(patient_table_data, colWidths=[260, 260])
t_pat.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_req.append(t_pat)
story_req.append(Spacer(1, 10))

story_req.append(Paragraph("2. REQUESTING PROVIDER DETAILS", section_heading))
provider_table_data = [
    [Paragraph("<b>Physician Name:</b> Dr. Richard Vance, MD", body_style), Paragraph("<b>NPI:</b> 1987654321", body_style)],
    [Paragraph("<b>Specialty:</b> Transplant Surgery / Nephrology", body_style), Paragraph("<b>Organization:</b> University of Chicago Transplant Center", body_style)],
    [Paragraph("<b>Phone:</b> (555) 312-7000", body_style), Paragraph("<b>Tax ID:</b> 36-9876543", body_style)],
]
t_prov = Table(provider_table_data, colWidths=[260, 260])
t_prov.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_req.append(t_prov)
story_req.append(Spacer(1, 10))

story_req.append(Paragraph("3. REQUESTED TREATMENT &amp; PROCEDURE CODES", section_heading))
treatment_table_data = [
    [Paragraph("<b>Service Type:</b> Surgery / Procedure", body_style), Paragraph("<b>Coding System:</b> CPT", body_style)],
    [Paragraph("<b>Service Code (CPT):</b> 50360", body_style), Paragraph("<b>Secondary Code:</b> 48554", body_style)],
    [Paragraph("<b>Procedure Description:</b> Simultaneous Kidney-Pancreas (SKP) Transplantation", body_style), Paragraph("<b>Quantity:</b> 1", body_style)],
]
t_treat = Table(treatment_table_data, colWidths=[260, 260])
t_treat.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_req.append(t_treat)
story_req.append(Spacer(1, 10))

story_req.append(Paragraph("4. DIAGNOSIS CODES", section_heading))
diag_table_data = [
    [Paragraph("<b>Primary Diagnosis Code:</b> E11.22", body_style), Paragraph("<b>Description:</b> Type 2 diabetes mellitus with diabetic nephropathy (Primary)", body_style)],
    [Paragraph("<b>Secondary Diagnosis Code:</b> N18.4", body_style), Paragraph("<b>Description:</b> Chronic kidney disease, Stage 4 (Secondary)", body_style)],
]
t_diag = Table(diag_table_data, colWidths=[260, 260])
t_diag.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fff7ed")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#fed7aa")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#ffedd5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_req.append(t_diag)
story_req.append(Spacer(1, 10))

story_req.append(Paragraph("5. CLINICAL INDICATION &amp; MEASUREMENTS", section_heading))
story_req.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#fed7aa"), spaceAfter=6))
clin_text = (
    "<b>Clinical Indication:</b> 73-year-old male referred for Simultaneous Kidney-Pancreas (SKP) transplantation evaluation (CPT 50360, 48554).<br/>"
    "<b>Laboratory Findings:</b> eGFR 18 mL/min/1.73m², C-peptide level 3.8 ng/mL, daily insulin requirement >85 units/day.<br/>"
    "<b>Anthropometrics:</b> BMI 37.5 kg/m², blood pressure 178/104 mmHg (uncontrolled hypertension).<br/>"
    "<b>Infection &amp; Contraindication Status:</b> Patient is currently being treated for an uncontrollable active infection (persistent vascular graft infection with MRSA bacteremia requiring IV Vancomycin). Triggers active infection policy exclusion."
)
story_req.append(Paragraph(clin_text, body_style))
story_req.append(Spacer(1, 14))

story_req.append(st)

doc_req.build(story_req)
print(f"Generated Prior Auth Request PDF at {pdf_req_filename}")

# Copy script to root inputs
script_root_filename = os.path.join(inputs_dir, "create_nurse_review_input.py")
if os.path.abspath(__file__) != os.path.abspath(script_root_filename):
    shutil.copy2(__file__, script_root_filename)

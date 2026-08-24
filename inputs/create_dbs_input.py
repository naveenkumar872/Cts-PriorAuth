import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Directories
approved_dir = "d:/NaveenCts/inputs/approved"
inputs_dir = "d:/NaveenCts/inputs"
os.makedirs(approved_dir, exist_ok=True)

# ── 1. Markdown Content for Approved Scenario (DBS) ───────────────────────────
md_content = """# Prior Authorization Request Specification
## Deep Brain Stimulation (DBS) for Essential Tremor

### 1. General & Patient Information
- **Patient ID:** pat-016
- **Patient Name:** John Anderson
- **Date of Birth:** 1965-03-22 (Age 61)
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

### 3. Procedure & Service Codes
- **Service Type:** Surgery / Procedure
- **CPT Code:** 61863 — Implantation of cranial neurostimulator array, thalamus (with intraoperative microelectrode recording)
- **HCPCS Code:** L8679 — Neurostimulator pulse generator, dual array, rechargeable, includes extension
- **CPT Description:** Deep Brain Stimulation Lead Implantation, Thalamus
- **Coding System:** CPT
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
"""

# Save markdown to approved and root inputs directories
md_approved_path = os.path.join(approved_dir, "deep_brain_stimulation_input.md")
md_root_path = os.path.join(inputs_dir, "deep_brain_stimulation_input.md")

with open(md_approved_path, "w", encoding="utf-8") as f:
    f.write(md_content)
with open(md_root_path, "w", encoding="utf-8") as f:
    f.write(md_content)

print(f"Created {md_approved_path} and {md_root_path}")


# ── Styles Setup ─────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()
normal = styles["Normal"]

title_style = ParagraphStyle(
    "DocTitle",
    parent=normal,
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    textColor=colors.HexColor("#1e3a8a"),
    alignment=0,
)

subtitle_style = ParagraphStyle(
    "DocSubtitle",
    parent=normal,
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=14,
    textColor=colors.HexColor("#3b82f6"),
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

# ── 2. Generate Professional Clinical Notes PDF ──────────────────────────────
pdf_notes_filename = os.path.join(approved_dir, "deep_brain_stimulation_clinical_notes.pdf")

doc_notes = SimpleDocTemplate(
    pdf_notes_filename,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_notes = []
story_notes.append(Paragraph("METRO NEUROSCIENCE &amp; SURGICAL INSTITUTE", title_style))
story_notes.append(Paragraph("Department of Functional Neurosurgery &amp; Movement Disorders", subtitle_style))
story_notes.append(Spacer(1, 4))
story_notes.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=10))

demo_data_notes = [
    [Paragraph("<b>Patient Name:</b> John Anderson", body_style), Paragraph("<b>DOB:</b> 03/22/1965 (Age 61)", body_style)],
    [Paragraph("<b>Patient ID:</b> pat-016", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Payer:</b> BlueCross BlueShield", body_style), Paragraph("<b>Primary Care:</b> Dr. James Collins, MD", body_style)],
    [Paragraph("<b>Requesting Physician:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>NPI:</b> 1982736450", body_style)],
    [Paragraph("<b>Procedure Requested:</b> CPT 61863 / HCPCS L8679", body_style), Paragraph("<b>Primary Diagnosis:</b> G25.0 Essential Tremor", body_style)],
]
t_notes = Table(demo_data_notes, colWidths=[260, 260])
t_notes.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_notes.append(t_notes)
story_notes.append(Spacer(1, 12))

story_notes.append(Paragraph("NEUROLOGICAL CLINICAL EVALUATION &amp; PRIOR AUTH DOCUMENTATION", section_heading))
story_notes.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

p1 = ("<b>Clinical History &amp; Diagnosis:</b><br/>"
      "Patient is a 61-year-old male with a 14-month documented history of severe, progressive bilateral postural and kinetic hand tremor, "
      "formally diagnosed with <b>Essential tremor</b> (ICD-10 G25.0). The tremor causes severe functional disability, preventing him from "
      "writing, holding eating utensils, buttoning clothes, and performing basic activities of daily living (ADLs) independently.")
story_notes.append(Paragraph(p1, body_style))
story_notes.append(Spacer(1, 8))

p2 = ("<b>Prior Pharmacological Therapy (Medical Treatment History):</b><br/>"
      "Patient has completed maximal tolerated medical therapy for controlling tremor. He was prescribed first-line pharmacological agents including "
      "<b>Propranolol</b> (titrated up to 240 mg daily) and <b>Primidone</b> (titrated up to 750 mg daily) for over 6 months continuously. "
      "Despite compliance with maximal medical therapy, the tremor remained severe and functionally disabling without significant therapeutic improvement. "
      "Patient thus meets the criterion of <b>Failed maximal medical therapy for controlling tremor</b>.")
story_notes.append(Paragraph(p2, body_style))
story_notes.append(Spacer(1, 8))

p3 = ("<b>Cognitive Assessment:</b><br/>"
      "Formal neuropsychological testing recorded a <b>Mini-Mental State Examination score</b> of <b>28</b> out of 30 "
      "(MMSE score = 28, well exceeding the required threshold of &gt;= 24). Patient exhibits intact cognitive function, orientation, memory, and executive reasoning, with no evidence of dementia or neurodegenerative cognitive decline.")
story_notes.append(Paragraph(p3, body_style))
story_notes.append(Spacer(1, 8))

p4 = ("<b>Psychiatric &amp; Depressive Symptoms Screening:</b><br/>"
      "Neuropsychiatric evaluation confirms <b>severe depression: No evidence</b>. "
      "Hamilton Depression Rating Scale (HAM-D) score is 4 (normal/non-depressed). There is no past or current history of major depressive disorder, "
      "refractory obsessive-compulsive disorder, primary headache disorders, neuropathic pain syndromes, or active psychosis.")
story_notes.append(Paragraph(p4, body_style))
story_notes.append(Spacer(1, 8))

p5 = ("<b>Duration of Clinical Documentation:</b><br/>"
      "Neurological care, clinical notes, and physical examination findings for this tremor episode span <b>14 months</b> of continuous clinical notes duration "
      "(exceeding the required &gt;= 6 months threshold).")
story_notes.append(Paragraph(p5, body_style))
story_notes.append(Spacer(1, 8))

p6 = ("<b>Surgical Recommendation:</b><br/>"
      "In summary, patient satisfies all clinical criteria for <b>Essential tremor thalamic stimulation</b>. "
      "Deep Brain Stimulation (DBS) thalamic lead implantation (CPT 61863) with neurostimulator pulse generator (HCPCS L8679) is strongly recommended for approval.")
story_notes.append(Paragraph(p6, body_style))
story_notes.append(Spacer(1, 14))

sig_data = [
    [Paragraph("<b>Attending Physician:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>Signature:</b> <i>M. Thorne, MD</i>", body_style)],
    [Paragraph("<b>Date:</b> August 24, 2026", body_style), Paragraph("<b>License #:</b> MD-948102-NY", body_style)],
]
st_notes = Table(sig_data, colWidths=[260, 260])
st_notes.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#94a3b8")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story_notes.append(st_notes)

doc_notes.build(story_notes)
print(f"Generated Clinical Notes PDF at {pdf_notes_filename}")

shutil.copy2(pdf_notes_filename, os.path.join(inputs_dir, "deep_brain_stimulation_clinical_notes.pdf"))


# ── 3. Generate Prior Authorization Intake & Request Form PDF (For Upload/Autofill) ──
pdf_req_filename = os.path.join(approved_dir, "deep_brain_stimulation_prior_auth_request.pdf")

doc_req = SimpleDocTemplate(
    pdf_req_filename,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_req = []

# Title Header
story_req.append(Paragraph("PRIOR AUTHORIZATION REQUEST FORM", title_style))
story_req.append(Paragraph("Doctor Clinical Intake &amp; Autofill Document Submission", subtitle_style))
story_req.append(Spacer(1, 4))
story_req.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=10))

# Patient Section Table
story_req.append(Paragraph("1. PATIENT DEMOGRAPHICS", section_heading))
patient_table_data = [
    [Paragraph("<b>Patient ID:</b> pat-016", body_style), Paragraph("<b>Patient Name:</b> John Anderson", body_style)],
    [Paragraph("<b>Date of Birth:</b> 1965-03-22", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Payer:</b> BlueCross BlueShield", body_style), Paragraph("<b>Primary Care Provider:</b> Dr. James Collins, MD", body_style)],
]
t_pat = Table(patient_table_data, colWidths=[260, 260])
t_pat.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_req.append(t_pat)
story_req.append(Spacer(1, 10))

# Requesting Provider Table
story_req.append(Paragraph("2. REQUESTING PROVIDER DETAILS", section_heading))
provider_table_data = [
    [Paragraph("<b>Physician Name:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>NPI:</b> 1982736450", body_style)],
    [Paragraph("<b>Specialty:</b> Neurosurgery / Movement Disorders", body_style), Paragraph("<b>Organization:</b> Metro Neuroscience &amp; Surgical Institute", body_style)],
    [Paragraph("<b>Phone:</b> (555) 234-8901", body_style), Paragraph("<b>Tax ID:</b> 94-8123456", body_style)],
]
t_prov = Table(provider_table_data, colWidths=[260, 260])
t_prov.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_req.append(t_prov)
story_req.append(Spacer(1, 10))

# Requested Treatment / Procedure Table
story_req.append(Paragraph("3. REQUESTED TREATMENT &amp; PROCEDURE CODES", section_heading))
treatment_table_data = [
    [Paragraph("<b>Service Type:</b> Surgery / Procedure", body_style), Paragraph("<b>Coding System:</b> CPT", body_style)],
    [Paragraph("<b>Service Code (CPT):</b> 61863", body_style), Paragraph("<b>Secondary Code (HCPCS):</b> L8679", body_style)],
    [Paragraph("<b>Procedure Description:</b> Deep Brain Stimulation Lead Implantation, Thalamus", body_style), Paragraph("<b>Quantity:</b> 1", body_style)],
    [Paragraph("<b>Place of Service:</b> Inpatient Hospital / Surgical Center", body_style), Paragraph("<b>Priority:</b> Normal", body_style)],
]
t_treat = Table(treatment_table_data, colWidths=[260, 260])
t_treat.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_req.append(t_treat)
story_req.append(Spacer(1, 10))

# Diagnoses Table
story_req.append(Paragraph("4. DIAGNOSIS CODES", section_heading))
diag_table_data = [
    [Paragraph("<b>Primary Diagnosis Code:</b> G25.0", body_style), Paragraph("<b>Description:</b> Essential tremor (Primary)", body_style)],
    [Paragraph("<b>Secondary Diagnosis Code:</b> R25.1", body_style), Paragraph("<b>Description:</b> Tremor, unspecified (Secondary)", body_style)],
]
t_diag = Table(diag_table_data, colWidths=[260, 260])
t_diag.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_req.append(t_diag)
story_req.append(Spacer(1, 10))

# Clinical Indication & Measurements
story_req.append(Paragraph("5. CLINICAL INDICATION &amp; MEASUREMENTS", section_heading))
story_req.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=6))

clin_text = (
    "<b>Clinical Indication:</b> Patient is a 61-year-old male with a 14-month history of severe, progressive Essential Tremor (ICD-10 G25.0) causing severe functional impairment in writing, eating, and ADLs.<br/>"
    "<b>Clinical Measurements:</b> MMSE Score: 28 / 30 (Normal cognition) | HAM-D Score: 4 (No depression) | Care Duration: 14 months.<br/>"
    "<b>Previous Treatments:</b> Failed Propranolol (240 mg/day) and Primidone (750 mg/day) for >6 months.<br/>"
    "<b>Clinical Justification:</b> All medical criteria satisfied for Deep Brain Stimulation Lead Implantation (CPT 61863). Lead implantation recommended for prior authorization approval."
)
story_req.append(Paragraph(clin_text, body_style))
story_req.append(Spacer(1, 14))

# Signatures Block
story_req.append(st_notes)

doc_req.build(story_req)
print(f"Generated Prior Auth Request PDF at {pdf_req_filename}")

shutil.copy2(pdf_req_filename, os.path.join(inputs_dir, "deep_brain_stimulation_prior_auth_request.pdf"))

# Copy script to root inputs
script_root_filename = os.path.join(inputs_dir, "create_dbs_input.py")
if os.path.abspath(__file__) != os.path.abspath(script_root_filename):
    shutil.copy2(__file__, script_root_filename)

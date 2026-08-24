import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Directories
missing_dir = "d:/NaveenCts/inputs/missing_info"
inputs_dir = "d:/NaveenCts/inputs"
os.makedirs(missing_dir, exist_ok=True)

# ── 1. Markdown Specification for Missing Info / More Info Scenario ──────────
md_missing_content = """# Prior Authorization Request Specification (More Information Required Scenario)
## Lumbar Spine MRI Clinical Review Criteria

### 1. General & Patient Information
- **Patient ID:** pat-017
- **Patient Name:** Sarah Martinez
- **Date of Birth:** 1978-07-15 (Age 48)
- **Gender:** Female
- **Payer:** Aetna
- **Primary Care Provider:** Dr. Robert Vance, MD

### 2. Requesting Provider Information
- **Physician Name:** Dr. Sarah Jenkins, MD
- **NPI:** 1234567890
- **Organization:** Northwestern Memorial Hospital
- **Specialty:** Orthopedic Surgery / Pain Management
- **Phone:** (555) 987-6543
- **Tax ID:** 36-1234567

### 3. Procedure & Service Codes
- **Service Type:** Diagnostic Imaging
- **CPT Code:** 72148 — Magnetic Resonance Imaging (MRI), lumbar spine; without contrast material
- **Coding System:** CPT
- **Quantity:** 1
- **Place of Service:** Outpatient Hospital / Imaging Center

### 4. Diagnosis Codes
- **Primary ICD-10 Code:** M54.50 — Low back pain, unspecified
- **Secondary ICD-10 Code:** M54.16 — Radiculopathy, lumbar region

### 5. Rule Engine Criteria & Clinical Pathway Evaluation (Missing Info Scenario)
Mapped to **Lumbar Spine MRI Policy**

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
- **Rule Engine Output:** `More Information Required` (or `Nurse Review Required`)
- **Rationale:** Coverage criteria unverified for requested CPT 72148. Missing key clinical evidence: Conservative Treatment Duration (>= 6 weeks) and Physical Therapy Evaluation. Uncomplicated acute back pain (<6 weeks) requires additional clinical information or nurse review.
"""

md_missing_path = os.path.join(missing_dir, "mri_lumbar_spine_missing_info_input.md")
with open(md_missing_path, "w", encoding="utf-8") as f:
    f.write(md_missing_content)

print(f"Created {md_missing_path}")

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


# ── 2. Generate Clinical Notes PDF for Missing Info Lumbar Spine MRI ──────────
pdf_filename = os.path.join(missing_dir, "mri_lumbar_spine_clinical_notes.pdf")
doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story = []
story.append(Paragraph("NORTHWESTERN MEMORIAL HOSPITAL", title_style))
story.append(Paragraph("Department of Orthopedics &amp; Spine Care", subtitle_style))
story.append(Spacer(1, 4))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=10))

demo_data = [
    [Paragraph("<b>Patient Name:</b> Sarah Martinez", body_style), Paragraph("<b>DOB:</b> 07/15/1978 (Age 48)", body_style)],
    [Paragraph("<b>Patient ID:</b> pat-017", body_style), Paragraph("<b>Gender:</b> Female", body_style)],
    [Paragraph("<b>Payer:</b> Aetna", body_style), Paragraph("<b>Primary Care:</b> Dr. Robert Vance, MD", body_style)],
    [Paragraph("<b>Requesting Physician:</b> Dr. Sarah Jenkins, MD", body_style), Paragraph("<b>NPI:</b> 1234567890", body_style)],
    [Paragraph("<b>Procedure Requested:</b> CPT 72148 (Lumbar MRI w/o Contrast)", body_style), Paragraph("<b>Primary Diagnosis:</b> M54.50 Low Back Pain", body_style)],
]
t = Table(demo_data, colWidths=[260, 260])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story.append(t)
story.append(Spacer(1, 12))

story.append(Paragraph("CLINICAL EVALUATION NOTE — LUMBAR SPINE MRI REQUEST", section_heading))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

p1 = ("<b>History of Present Illness:</b><br/>"
      "Patient is a 48-year-old female presenting with acute non-radiating low back pain (ICD-10 M54.50) of <b>2 weeks duration</b> following heavy lifting at home. "
      "Pain is localized to the lumbosacral region without radiation to the lower extremities.")
story.append(Paragraph(p1, body_style))
story.append(Spacer(1, 8))

p2 = ("<b>Physical Examination &amp; Neurological Assessment:</b><br/>"
      "Physical examination reveals mild paraspinal muscle tenderness. Range of motion of the lumbar spine is mildly restricted by discomfort. "
      "Bilateral lower extremity motor strength is intact at 5/5 in all muscle groups. Deep tendon reflexes (patellar and Achilles) are 2+ equal bilaterally. "
      "Sensation to light touch and pinprick is intact in L1 through S1 dermatomes. Straight leg raise test is negative bilaterally.")
story.append(Paragraph(p2, body_style))
story.append(Spacer(1, 8))

p3 = ("<b>Red Flag Screening (All Absent):</b><br/>"
      "Negative for progressive neurological deficits, negative for saddle anesthesia or bowel/bladder dysfunction (no cauda equina syndrome), "
      "no fever or history of IV drug use, no history of malignancy or unexplained weight loss, and no history of severe trauma or osteoporosis.")
story.append(Paragraph(p3, body_style))
story.append(Spacer(1, 8))

p4 = ("<b>Conservative Therapy &amp; Physical Therapy Status:</b><br/>"
      "Patient has taken over-the-counter Ibuprofen intermittently for 10 days. "
      "<b>No formal physical therapy evaluation or structured conservative therapy program has been completed to date</b> (0 weeks physical therapy completed). "
      "Requesting lumbar spine MRI (CPT 72148) prior to initiating physical therapy.")
story.append(Paragraph(p4, body_style))
story.append(Spacer(1, 14))

sig_data = [
    [Paragraph("<b>Attending Physician:</b> Dr. Sarah Jenkins, MD", body_style), Paragraph("<b>Signature:</b> <i>S. Jenkins, MD</i>", body_style)],
    [Paragraph("<b>Date:</b> August 24, 2026", body_style), Paragraph("<b>License #:</b> MD-361234-IL", body_style)],
]
st = Table(sig_data, colWidths=[260, 260])
st.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#94a3b8")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story.append(st)

doc.build(story)
print(f"Generated PDF at {pdf_filename}")


# ── 3. Generate Prior Authorization Intake & Request Form PDF (For Upload/Autofill) ──
pdf_req_filename = os.path.join(missing_dir, "mri_lumbar_spine_prior_auth_request.pdf")

doc_req = SimpleDocTemplate(
    pdf_req_filename,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_req = []
story_req.append(Paragraph("PRIOR AUTHORIZATION REQUEST FORM", title_style))
story_req.append(Paragraph("Doctor Clinical Intake &amp; Autofill Document Submission", subtitle_style))
story_req.append(Spacer(1, 4))
story_req.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=10))

story_req.append(Paragraph("1. PATIENT DEMOGRAPHICS", section_heading))
patient_table_data = [
    [Paragraph("<b>Patient ID:</b> pat-017", body_style), Paragraph("<b>Patient Name:</b> Sarah Martinez", body_style)],
    [Paragraph("<b>Date of Birth:</b> 1978-07-15", body_style), Paragraph("<b>Gender:</b> Female", body_style)],
    [Paragraph("<b>Payer:</b> Aetna", body_style), Paragraph("<b>Primary Care Provider:</b> Dr. Robert Vance, MD", body_style)],
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

story_req.append(Paragraph("2. REQUESTING PROVIDER DETAILS", section_heading))
provider_table_data = [
    [Paragraph("<b>Physician Name:</b> Dr. Sarah Jenkins, MD", body_style), Paragraph("<b>NPI:</b> 1234567890", body_style)],
    [Paragraph("<b>Specialty:</b> Orthopedic Surgery / Pain Management", body_style), Paragraph("<b>Organization:</b> Northwestern Memorial Hospital", body_style)],
    [Paragraph("<b>Phone:</b> (555) 987-6543", body_style), Paragraph("<b>Tax ID:</b> 36-1234567", body_style)],
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

story_req.append(Paragraph("3. REQUESTED TREATMENT &amp; PROCEDURE CODES", section_heading))
treatment_table_data = [
    [Paragraph("<b>Service Type:</b> Diagnostic Imaging", body_style), Paragraph("<b>Coding System:</b> CPT", body_style)],
    [Paragraph("<b>Service Code (CPT):</b> 72148", body_style), Paragraph("<b>Quantity:</b> 1", body_style)],
    [Paragraph("<b>Procedure Description:</b> MRI Lumbar Spine without Contrast", body_style), Paragraph("<b>Place of Service:</b> Outpatient Hospital", body_style)],
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

story_req.append(Paragraph("4. DIAGNOSIS CODES", section_heading))
diag_table_data = [
    [Paragraph("<b>Primary Diagnosis Code:</b> M54.50", body_style), Paragraph("<b>Description:</b> Low back pain, unspecified (Primary)", body_style)],
    [Paragraph("<b>Secondary Diagnosis Code:</b> M54.16", body_style), Paragraph("<b>Description:</b> Radiculopathy, lumbar region (Secondary)", body_style)],
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

story_req.append(Paragraph("5. CLINICAL INDICATION &amp; HISTORY", section_heading))
story_req.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=6))
clin_text = (
    "<b>Clinical Indication:</b> Patient is a 48-year-old female with acute low back pain (ICD-10 M54.50) of 2 weeks duration following heavy lifting.<br/>"
    "<b>Physical Exam:</b> Motor strength 5/5 bilaterally, reflexes 2+, negative straight leg raise.<br/>"
    "<b>Conservative Treatment Duration:</b> 2 weeks (Intermittent Ibuprofen). 0 weeks completed physical therapy.<br/>"
    "<b>Clinical Justification:</b> Lumbar MRI requested for persistent back discomfort."
)
story_req.append(Paragraph(clin_text, body_style))
story_req.append(Spacer(1, 14))

story_req.append(st)

doc_req.build(story_req)
print(f"Generated Prior Auth Request PDF at {pdf_req_filename}")

# Copy script to root inputs
script_root_filename = os.path.join(inputs_dir, "create_mri_missing_info.py")
if os.path.abspath(__file__) != os.path.abspath(script_root_filename):
    shutil.copy2(__file__, script_root_filename)

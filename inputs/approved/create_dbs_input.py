import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

os.makedirs("d:/NaveenCts/inputs", exist_ok=True)

# 1. Create Markdown Specification File
md_content = """# Prior Authorization Request Specification
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
"""

with open("d:/NaveenCts/inputs/deep_brain_stimulation_input.md", "w", encoding="utf-8") as f:
    f.write(md_content)

print("Created d:/NaveenCts/inputs/deep_brain_stimulation_input.md")


# 2. Generate Professional Clinical Notes PDF using ReportLab
pdf_filename = "d:/NaveenCts/inputs/deep_brain_stimulation_clinical_notes.pdf"
doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

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

bold_label = ParagraphStyle(
    "BoldLabel",
    parent=normal,
    fontName="Helvetica-Bold",
    fontSize=9.5,
    leading=14,
    textColor=colors.HexColor("#0f172a"),
)

story = []

# Header Banner
story.append(Paragraph("METRO NEUROSCIENCE &amp; SURGICAL INSTITUTE", title_style))
story.append(Paragraph("Department of Functional Neurosurgery &amp; Movement Disorders", subtitle_style))
story.append(Spacer(1, 4))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=10))

# Demographics Table
demo_data = [
    [Paragraph("<b>Patient Name:</b> John Anderson", body_style), Paragraph("<b>DOB:</b> 05/14/1968 (Age 58)", body_style)],
    [Paragraph("<b>Patient ID:</b> p-001", body_style), Paragraph("<b>Member ID:</b> BCB-4821-001 (Non-Medicare)", body_style)],
    [Paragraph("<b>Requesting Physician:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>NPI:</b> 1982736450", body_style)],
    [Paragraph("<b>Policy ID:</b> DEE-09991129", body_style), Paragraph("<b>Policy Name:</b> Deep Brain Stimulation", body_style)],
    [Paragraph("<b>Procedure Requested:</b> CPT 61863 / HCPCS L8679", body_style), Paragraph("<b>Primary Diagnosis:</b> G25.0 Essential Tremor", body_style)],
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

# Clinical Summary
story.append(Paragraph("NEUROLOGICAL CLINICAL EVALUATION &amp; PRIOR AUTH DOCUMENTATION", section_heading))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

p1 = ("<b>Clinical History &amp; Diagnosis:</b><br/>"
      "Patient is a 58-year-old male with a 14-month documented history of severe, progressive bilateral postural and kinetic hand tremor, "
      "formally diagnosed with <b>Essential tremor</b> (ICD-10 G25.0). The tremor causes severe functional disability, preventing him from "
      "writing, holding eating utensils, buttoning clothes, and performing basic activities of daily living (ADLs) independently.")
story.append(Paragraph(p1, body_style))
story.append(Spacer(1, 8))

p2 = ("<b>Prior Pharmacological Therapy (Medical Treatment History):</b><br/>"
      "Patient has completed maximal tolerated medical therapy for controlling tremor. He was prescribed first-line pharmacological agents including "
      "<b>Propranolol</b> (titrated up to 240 mg daily) and <b>Primidone</b> (titrated up to 750 mg daily) for over 6 months continuously. "
      "Despite compliance with maximal medical therapy, the tremor remained severe and functionally disabling without significant therapeutic improvement. "
      "Patient thus meets the criterion of <b>Failed maximal medical therapy for controlling tremor</b>.")
story.append(Paragraph(p2, body_style))
story.append(Spacer(1, 8))

p3 = ("<b>Cognitive Assessment:</b><br/>"
      "Formal neuropsychological testing conducted on August 10, 2026 recorded a <b>Mini-Mental State Examination score</b> of <b>28</b> out of 30 "
      "(MMSE score = 28, well exceeding the required threshold of &gt;= 24). Patient exhibits intact cognitive function, orientation, memory, and executive reasoning, with no evidence of dementia or neurodegenerative cognitive decline.")
story.append(Paragraph(p3, body_style))
story.append(Spacer(1, 8))

p4 = ("<b>Psychiatric &amp; Depressive Symptoms Screening:</b><br/>"
      "Neuropsychiatric evaluation performed by Dr. Aris Thorne confirms <b>severe depression: No evidence</b>. "
      "Hamilton Depression Rating Scale (HAM-D) score is 4 (normal/non-depressed). There is no past or current history of major depressive disorder, "
      "refractory obsessive-compulsive disorder, primary headache disorders, neuropathic pain syndromes, or active psychosis.")
story.append(Paragraph(p4, body_style))
story.append(Spacer(1, 8))

p5 = ("<b>Duration of Clinical Documentation:</b><br/>"
      "Neurological care, clinical notes, and physical examination findings for this tremor episode span <b>14 months</b> of continuous clinical notes duration "
      "(exceeding the required &gt;= 6 months threshold).")
story.append(Paragraph(p5, body_style))
story.append(Spacer(1, 8))

p6 = ("<b>Surgical Recommendation:</b><br/>"
      "In summary, patient satisfies all clinical criteria for <b>Essential tremor thalamic stimulation</b> under policy DEE-09991129 (Pathway 1). "
      "Deep Brain Stimulation (DBS) thalamic lead implantation (CPT 61863) with neurostimulator pulse generator (HCPCS L8679) is strongly recommended for approval.")
story.append(Paragraph(p6, body_style))
story.append(Spacer(1, 14))

# Signatures Block
sig_data = [
    [Paragraph("<b>Attending Physician:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>Signature:</b> <i>M. Thorne, MD</i>", body_style)],
    [Paragraph("<b>Date:</b> August 24, 2026", body_style), Paragraph("<b>License #:</b> MD-948102-NY", body_style)],
]
st = Table(sig_data, colWidths=[260, 260])
st.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#94a3b8")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story.append(st)

doc.build(story)
print("Generated PDF at d:/NaveenCts/inputs/deep_brain_stimulation_clinical_notes.pdf")

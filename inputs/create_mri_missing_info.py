import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# ── 1. Copy existing DBS files to inputs/approved/ ────────────────────────────
approved_dir = "d:/NaveenCts/inputs/approved"
os.makedirs(approved_dir, exist_ok=True)

dbs_files = [
    ("d:/NaveenCts/inputs/deep_brain_stimulation_input.md", f"{approved_dir}/deep_brain_stimulation_input.md"),
    ("d:/NaveenCts/inputs/deep_brain_stimulation_clinical_notes.pdf", f"{approved_dir}/deep_brain_stimulation_clinical_notes.pdf"),
    ("d:/NaveenCts/inputs/create_dbs_input.py", f"{approved_dir}/create_dbs_input.py"),
]

for src, dst in dbs_files:
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied {src} -> {dst}")

# ── 2. Create inputs/missing_info/ directory ──────────────────────────────────
missing_dir = "d:/NaveenCts/inputs/missing_info"
os.makedirs(missing_dir, exist_ok=True)

# ── 3. Generate Markdown Specification for Missing Info Lumbar Spine MRI ──────
md_missing_content = """# Prior Authorization Request Specification (Missing Info / Escalation Scenario)
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
"""

with open(f"{missing_dir}/mri_lumbar_spine_missing_info_input.md", "w", encoding="utf-8") as f:
    f.write(md_missing_content)

print(f"Created {missing_dir}/mri_lumbar_spine_missing_info_input.md")


# ── 4. Generate Clinical Notes PDF for Missing Info Lumbar Spine MRI ──────────
pdf_filename = f"{missing_dir}/mri_lumbar_spine_clinical_notes.pdf"
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

story = []

# Header Banner
story.append(Paragraph("NORTHWESTERN MEMORIAL HOSPITAL", title_style))
story.append(Paragraph("Department of Orthopedics &amp; Spine Care", subtitle_style))
story.append(Spacer(1, 4))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=10))

# Demographics Table
demo_data = [
    [Paragraph("<b>Patient Name:</b> Patricia Lee", body_style), Paragraph("<b>DOB:</b> 11/20/1974 (Age 51)", body_style)],
    [Paragraph("<b>Patient ID:</b> p-008", body_style), Paragraph("<b>Member ID:</b> UHC-1111-008 (Non-Medicare)", body_style)],
    [Paragraph("<b>Requesting Physician:</b> Dr. Sarah Jenkins, MD", body_style), Paragraph("<b>NPI:</b> 1234567890", body_style)],
    [Paragraph("<b>Policy ID:</b> MRI-69575638", body_style), Paragraph("<b>Policy Name:</b> Lumbar Spine MRI Criteria", body_style)],
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

# Clinical Summary
story.append(Paragraph("CLINICAL EVALUATION NOTE — LUMBAR SPINE MRI REQUEST", section_heading))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))

p1 = ("<b>History of Present Illness:</b><br/>"
      "Patient is a 51-year-old female presenting with acute non-radiating low back pain (ICD-10 M54.50) of <b>2 weeks duration</b> following heavy lifting at home. "
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

# Signatures Block
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
print(f"Generated PDF at {missing_dir}/mri_lumbar_spine_clinical_notes.pdf")

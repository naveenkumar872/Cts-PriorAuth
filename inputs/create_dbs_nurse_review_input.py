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

# ── 1. Markdown Content for Nurse Review Scenario (DBS with Wrong CPT + Exclusions) ─────────
md_content = """# Prior Authorization Request Specification (Nurse Review & Policy Exclusion Scenario)
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
"""

md_nurse_path = os.path.join(nurse_review_dir, "deep_brain_stimulation_nurse_review_input.md")
with open(md_nurse_path, "w", encoding="utf-8") as f:
    f.write(md_content)

print(f"Created {md_nurse_path}")

# ── Styles Setup ─────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

primary_color = colors.HexColor("#1e293b")
secondary_color = colors.HexColor("#991b1b")
text_dark = colors.HexColor("#334155")

title_style = ParagraphStyle('DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=primary_color)
subtitle_style = ParagraphStyle('DocSubTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=secondary_color)
h2_style = ParagraphStyle('H2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=primary_color, spaceBefore=8, spaceAfter=4)
body_style = ParagraphStyle('BodyTextCustom', parent=styles['Normal'], fontName='Helvetica', fontSize=9.5, leading=13.5, textColor=text_dark)
badge_nurse_style = ParagraphStyle('BadgeNurse', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=colors.HexColor("#b45309"))
badge_excl_style = ParagraphStyle('BadgeExcl', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=colors.HexColor("#dc2626"))

# ── 2. Generate Clinical Notes PDF ───────────────────────────────────────────
pdf_notes_filename = os.path.join(nurse_review_dir, "deep_brain_stimulation_nurse_review_notes.pdf")
doc_notes = SimpleDocTemplate(pdf_notes_filename, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)

story_notes = []
header_data = [
    [Paragraph("METRO NEUROSCIENCE & SURGICAL INSTITUTE", title_style), Paragraph("<b>CLINICAL EVALUATION NOTE</b>", subtitle_style)],
    [Paragraph("Department of Functional Neurosurgery & Movement Disorders", body_style), Paragraph("<b>Date:</b> August 24, 2026", body_style)],
]
t_header = Table(header_data, colWidths=[340, 180])
t_header.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('ALIGN', (1,0), (1,-1), 'RIGHT'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
]))
story_notes.append(t_header)
story_notes.append(Spacer(1, 4))
story_notes.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

pat_table_data = [
    [Paragraph("<b>Patient Name:</b> Robert Williams", body_style), Paragraph("<b>DOB:</b> 06/14/1953 (Age 73)", body_style), Paragraph("<b>MRN / Pt ID:</b> pat-019", body_style)],
    [Paragraph("<b>Gender:</b> Male", body_style), Paragraph("<b>Payer:</b> BlueCross BlueShield", body_style), Paragraph("<b>Policy ID:</b> DEE-09991129", body_style)],
    [Paragraph("<b>Diagnosis:</b> Essential tremor (G25.0)", body_style), Paragraph("<b>Requested CPT:</b> 61899 (Wrong / Unlisted)", badge_excl_style), Paragraph("<b>Decision Status:</b> Nurse Review Required", badge_nurse_style)],
]
t_pat = Table(pat_table_data, colWidths=[180, 170, 170])
t_pat.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('PADDING', (0,0), (-1,-1), 5),
]))
story_notes.append(t_pat)
story_notes.append(Spacer(1, 10))

story_notes.append(Paragraph("CLINICAL SUMMARY, CPT MISMATCH & POLICY EXCLUSIONS", h2_style))
p1 = ("<b>Clinical History & Service Code:</b><br/>"
      "Patient is a 73-year-old male with Essential Tremor (ICD-10 G25.0) requesting unlisted procedure code <b>CPT 61899</b> (Wrong / Mismatched CPT code for standard DBS thalamic lead implantation). "
      "Maximum medical therapy with Propranolol and Primidone trialed for 14 months.")
story_notes.append(Paragraph(p1, body_style))
story_notes.append(Spacer(1, 6))

p2 = ("<b>Policy Exclusion Findings:</b><br/>"
      "Neuropsychiatric screening and medical history confirm the presence of <b>POLICY EXCLUSIONS</b>:<br/>"
      "1. <b>Refractory Obsessive-Compulsive Disorder</b> (ICD-10 F42.2)<br/>"
      "2. <b>Primary Headache Disorder</b> (ICD-10 G44.0)<br/>"
      "3. <b>Neuropathic Pain Syndrome</b><br/>"
      "Due to wrong CPT code 61899 and policy exclusions (Refractory Obsessive-Compulsive Disorder, Primary Headache, Neuropathic Pain), mandatory clinical nurse review and medical director evaluation is required.")
story_notes.append(Paragraph(p2, body_style))
story_notes.append(Spacer(1, 10))

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

# ── 3. Generate Prior Authorization Intake Form PDF ──────────────────────────
pdf_req_filename = os.path.join(nurse_review_dir, "deep_brain_stimulation_nurse_review_request.pdf")
doc_req = SimpleDocTemplate(pdf_req_filename, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)

story_req = []
req_header = [
    [Paragraph("PRIOR AUTHORIZATION REQUEST FORM", title_style), Paragraph("<b>NURSE REVIEW / EXCLUSIONS</b>", subtitle_style)],
    [Paragraph("Standard Intake Form — Carrier: BlueCross BlueShield", body_style), Paragraph("<b>Triage:</b> Nurse Review Required", badge_nurse_style)],
]
t_req_h = Table(req_header, colWidths=[340, 180])
t_req_h.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('ALIGN', (1,0), (1,-1), 'RIGHT'),
]))
story_req.append(t_req_h)
story_req.append(Spacer(1, 4))
story_req.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=8))

grid_data = [
    [Paragraph("<b>Patient Name:</b> Robert Williams", body_style), Paragraph("<b>Patient ID:</b> pat-019", body_style), Paragraph("<b>DOB:</b> 1953-06-14", body_style)],
    [Paragraph("<b>Member ID:</b> BCBS-987123-01", body_style), Paragraph("<b>Policy ID:</b> DEE-09991129", body_style), Paragraph("<b>Plan Tier:</b> Platinum", body_style)],
    [Paragraph("<b>Requesting Provider:</b> Dr. Marcus Thorne, MD", body_style), Paragraph("<b>NPI:</b> 1982736450", body_style), Paragraph("<b>Facility:</b> Metro Neuroscience", body_style)],
    [Paragraph("<b>Primary ICD-10:</b> G25.0 (Essential tremor)", body_style), Paragraph("<b>Requested CPT:</b> 61899 (Wrong / Mismatched)", badge_excl_style), Paragraph("<b>HCPCS Code:</b> L8679", body_style)],
    [Paragraph("<b>Exclusions Identified:</b> Refractory OCD, Primary Headache", badge_excl_style), Paragraph("<b>Coding System:</b> CPT", body_style), Paragraph("<b>Priority:</b> Normal", body_style)],
]
t_grid = Table(grid_data, colWidths=[180, 170, 170])
t_grid.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
    ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ('PADDING', (0,0), (-1,-1), 5),
]))
story_req.append(t_grid)
story_req.append(Spacer(1, 10))

story_req.append(Paragraph("CLINICAL INDICATION & CLINICAL NOTES (FOR AUTO-FILL / REVIEW)", h2_style))
p_notes_req = Paragraph(
    "Patient History & Clinical Indication: 73-year-old male (Age 73 years old) presenting with severe Essential Tremor (ICD-10 G25.0) requesting unlisted procedure code CPT 61899 (mismatched / wrong CPT code for DBS thalamic lead implantation). "
    "Patient trialed Propranolol & Primidone over 14 months of clinical management (clinical notes duration: 14 months). MMSE Score: 28 / 30. "
    "Clinical evaluation confirms presence of policy exclusions: patient is diagnosed with refractory obsessive-compulsive disorder (F42.2 - Refractory Obsessive-Compulsive Disorder policy exclusion), primary headache disorder (G44.0 - Primary Headache policy exclusion), and neuropathic pain syndrome. "
    "Triggers Nurse Review Required due to wrong CPT code 61899 and policy exclusions (Refractory Obsessive-Compulsive Disorder, Primary Headache, Neuropathic Pain).",
    body_style
)
story_req.append(p_notes_req)

doc_req.build(story_req)
print(f"Generated Prior Auth Request PDF at {pdf_req_filename}")

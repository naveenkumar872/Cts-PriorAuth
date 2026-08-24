import os
import shutil
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Directories
missing_info_dir = "d:/NaveenCts/inputs/missing_info"
inputs_dir = "d:/NaveenCts/inputs"
os.makedirs(missing_info_dir, exist_ok=True)

# ── Styles Setup ─────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()
normal = styles["Normal"]

title_style = ParagraphStyle(
    "DocTitle",
    parent=normal,
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    textColor=colors.HexColor("#065f46"), # Emerald green theme
    alignment=0,
)

subtitle_style = ParagraphStyle(
    "DocSubtitle",
    parent=normal,
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=14,
    textColor=colors.HexColor("#059669"),
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

# ── 1. DBS RULE SET (CPT 61863) — 2-STEP WORKFLOW ─────────────────────────────

# 1A. DBS Initial Submission PDF (Triggers 'More Information Required' due to missing severe depression assessment)
pdf_dbs_initial_file = os.path.join(missing_info_dir, "dbs_initial_request.pdf")
doc_dbs_init = SimpleDocTemplate(
    pdf_dbs_initial_file,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_dbs_init = []
story_dbs_init.append(Paragraph("CENTER FOR NEUROLOGICAL SURGERY", title_style))
story_dbs_init.append(Paragraph("Initial Prior Authorization Request — Deep Brain Stimulation (CPT 61863)", subtitle_style))
story_dbs_init.append(Spacer(1, 4))
story_dbs_init.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#059669"), spaceAfter=10))

demo_data_dbs_init = [
    [Paragraph("<b>Patient Name:</b> Marcus Johnson", body_style), Paragraph("<b>Patient ID:</b> pat-019", body_style)],
    [Paragraph("<b>Date of Birth:</b> 01/15/1980 (Age 46)", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Requested Service:</b> DBS Lead Placement (CPT 61863)", body_style), Paragraph("<b>Diagnosis:</b> Essential Tremor (G25.0)", body_style)],
]
t_dbs_init = Table(demo_data_dbs_init, colWidths=[260, 260])
t_dbs_init.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d1fae5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_init.append(t_dbs_init)
story_dbs_init.append(Spacer(1, 12))

story_dbs_init.append(Paragraph("INITIAL CLINICAL SUMMARY & PRIOR MEDICAL THERAPY", section_heading))
story_dbs_init.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#a7f3d0"), spaceAfter=8))

p1_dbs_init = ("<b>Clinical History &amp; Medication Trial:</b><br/>"
               "Patient evaluated for Deep Brain Stimulation (CPT 61863). Primary diagnosis: <b>Essential tremor</b> (ICD-10 G25.0). "
               "Patient has <b>failed maximal medical therapy for controlling tremor</b> following a 14-month trial of Propranolol and Primidone. "
               "Clinical notes duration: <b>14 months</b> of documented specialist care.")
story_dbs_init.append(Paragraph(p1_dbs_init, body_style))
story_dbs_init.append(Spacer(1, 8))

p2_dbs_init = ("<b>Cognitive Assessment:</b><br/>"
               "• <b>Mini-Mental State Examination (MMSE):</b> Score = <b>29 / 30</b> (Cognitively intact; cutoff &ge; 24).<br/>"
               "• <i>Note: Neuropsychiatric evaluation and formal severe depression score pending specialist consultation.</i>")
story_dbs_init.append(Paragraph(p2_dbs_init, body_style))
story_dbs_init.append(Spacer(1, 14))

sig_dbs_init = [
    [Paragraph("<b>Requesting Neurosurgeon:</b> Dr. Robert Vance, MD", body_style), Paragraph("<b>Signature:</b> <i>R. Vance, MD</i>", body_style)],
    [Paragraph("<b>Date:</b> August 24, 2026", body_style), Paragraph("<b>License #:</b> MD-774810-IL", body_style)],
]
st_dbs_init = Table(sig_dbs_init, colWidths=[260, 260])
st_dbs_init.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#059669")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_init.append(st_dbs_init)

doc_dbs_init.build(story_dbs_init)
print(f"Generated PDF at {pdf_dbs_initial_file}")


# 1B. DBS Resubmission PDF (Fulfills severe depression assessment -> Evaluates to Approved)
pdf_dbs_dep_file = os.path.join(missing_info_dir, "dbs_psychiatric_evaluation_severe_depression.pdf")
doc_dbs_dep = SimpleDocTemplate(
    pdf_dbs_dep_file,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_dbs_dep = []
story_dbs_dep.append(Paragraph("CENTER FOR ADVANCED NEUROPSYCHIATRY & BEHAVIORAL HEALTH", title_style))
story_dbs_dep.append(Paragraph("Neuropsychiatric Evaluation & Clinical Clearance Note", subtitle_style))
story_dbs_dep.append(Spacer(1, 4))
story_dbs_dep.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#059669"), spaceAfter=10))

demo_data_dep = [
    [Paragraph("<b>Patient Name:</b> Marcus Johnson", body_style), Paragraph("<b>Patient ID:</b> pat-019", body_style)],
    [Paragraph("<b>Date of Birth:</b> 01/15/1980 (Age 46)", body_style), Paragraph("<b>Gender:</b> Male", body_style)],
    [Paragraph("<b>Referred For:</b> DBS Clinical Clearance (CPT 61863)", body_style), Paragraph("<b>Prior Auth Case:</b> PA-2026-00001", body_style)],
    [Paragraph("<b>Evaluating Physician:</b> Dr. Sarah Jenkins, MD", body_style), Paragraph("<b>NPI:</b> 1780923410", body_style)],
]
t_dep = Table(demo_data_dep, colWidths=[260, 260])
t_dep.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d1fae5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_dep.append(t_dep)
story_dbs_dep.append(Spacer(1, 12))

story_dbs_dep.append(Paragraph("NEUROPSYCHIATRIC EVALUATION & COVERAGE CRITERIA VERIFICATION", section_heading))
story_dbs_dep.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#a7f3d0"), spaceAfter=8))

p1 = ("<b>Clinical Condition &amp; Medical Therapy Verification:</b><br/>"
      "• <b>Clinical Condition:</b> Essential tremor (ICD-10 G25.0).<br/>"
      "• <b>Prior Treatment:</b> Failed maximal medical therapy for controlling tremor (14-month trial of Propranolol and Primidone).<br/>"
      "• <b>Clinical Notes Duration:</b> 14 months of documented specialist care.")
story_dbs_dep.append(Paragraph(p1, body_style))
story_dbs_dep.append(Spacer(1, 8))

p2 = ("<b>Psychometric &amp; Cognitive Findings:</b><br/>"
      "• <b>Mini-Mental State Examination (MMSE) Score:</b> 29 / 30 (Cognitively intact; cutoff &ge; 24).<br/>"
      "• <b>Severe Depression:</b> No evidence (Hamilton Depression Rating Scale Score = 5, normal euthymic range; no evidence of severe depression).<br/>"
      "• <b>Beck Depression Inventory (BDI-II):</b> Score = <b>6</b> (Minimal).")
story_dbs_dep.append(Paragraph(p2, body_style))
story_dbs_dep.append(Spacer(1, 8))

p3 = ("<b>Safety &amp; Contraindications Screening:</b><br/>"
      "Comprehensive psychiatric and neurological evaluation confirms:<br/>"
      "• <b>Psychiatric Exclusion Check:</b> None identified. Patient is fully cleared of all psychiatric contraindications.<br/>"
      "• <b>Neurological Exclusion Check:</b> None identified. Patient is fully cleared of all neurological contraindications.<br/>"
      "Patient meets all safety criteria for Deep Brain Stimulation lead placement.")
story_dbs_dep.append(Paragraph(p3, body_style))
story_dbs_dep.append(Spacer(1, 8))

p4 = ("<b>Final Recommendation:</b><br/>"
      "Patient meets all policy coverage guidelines under Deep Brain Stimulation Policy. Full approval recommended.")
story_dbs_dep.append(Paragraph(p4, body_style))
story_dbs_dep.append(Spacer(1, 14))

sig_data_dep = [
    [Paragraph("<b>Evaluating Psychiatrist:</b> Dr. Sarah Jenkins, MD", body_style), Paragraph("<b>Signature:</b> <i>S. Jenkins, MD</i>", body_style)],
    [Paragraph("<b>Date:</b> August 24, 2026", body_style), Paragraph("<b>License #:</b> MD-881902-IL", body_style)],
]
st_dep = Table(sig_data_dep, colWidths=[260, 260])
st_dep.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#059669")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story_dbs_dep.append(st_dep)

doc_dbs_dep.build(story_dbs_dep)
print(f"Generated PDF at {pdf_dbs_dep_file}")


# ── 2. MRI LUMBAR SPINE RULE SET (CPT 72148) — 2-STEP WORKFLOW ────────────────

# 2A. MRI Lumbar Spine Initial Request (Triggers 'More Information Required' due to missing 6-week PT progress log)
pdf_mri_initial_file = os.path.join(missing_info_dir, "mri_lumbar_spine_initial_request.pdf")
doc_mri_init = SimpleDocTemplate(
    pdf_mri_initial_file,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_mri_init = []
story_mri_init.append(Paragraph("APEX SPINE & ORTHOPEDIC CENTER", title_style))
story_mri_init.append(Paragraph("Initial Clinical Request — Lumbar Spine MRI (CPT 72148)", subtitle_style))
story_mri_init.append(Spacer(1, 4))
story_mri_init.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#059669"), spaceAfter=10))

demo_data_mri_init = [
    [Paragraph("<b>Patient Name:</b> Sarah Jenkins", body_style), Paragraph("<b>Patient ID:</b> pat-002", body_style)],
    [Paragraph("<b>Date of Birth:</b> 04/12/1985 (Age 41)", body_style), Paragraph("<b>Gender:</b> Female", body_style)],
    [Paragraph("<b>Requested Service:</b> MRI Lumbar Spine (CPT 72148)", body_style), Paragraph("<b>Diagnosis:</b> Lumbar Radiculopathy (M54.16)", body_style)],
]
t_mri_init = Table(demo_data_mri_init, colWidths=[260, 260])
t_mri_init.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d1fae5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_mri_init.append(t_mri_init)
story_mri_init.append(Spacer(1, 12))

story_mri_init.append(Paragraph("CLINICAL EVALUATION & PHYSICAL EXAMINATION", section_heading))
story_mri_init.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#a7f3d0"), spaceAfter=8))

p1_mri_init = ("<b>History of Present Illness:</b><br/>"
               "41-year-old female presenting with lower back pain radiating into the left lower extremity for 6 weeks. "
               "Physical exam confirms positive straight leg raise test at 45 degrees left leg.<br/>"
               "<i>Note: Formal physical therapy progress logs and 6-week completion documentation pending from outpatient rehab facility.</i>")
story_mri_init.append(Paragraph(p1_mri_init, body_style))
story_mri_init.append(Spacer(1, 14))

st_mri_init = Table(sig_dbs_init, colWidths=[260, 260])
st_mri_init.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#059669")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story_mri_init.append(st_mri_init)

doc_mri_init.build(story_mri_init)
print(f"Generated PDF at {pdf_mri_initial_file}")


# 2B. MRI Lumbar Spine Resubmission PDF (Fulfills PT progress log -> Evaluates to Approved)
pdf_pt_file = os.path.join(missing_info_dir, "mri_lumbar_spine_pt_progress_notes.pdf")
doc_pt = SimpleDocTemplate(
    pdf_pt_file,
    pagesize=letter,
    rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
)

story_pt = []
story_pt.append(Paragraph("APEX PHYSICAL THERAPY & REHABILITATION", title_style))
story_pt.append(Paragraph("Outpatient Physical Therapy 6-Week Progress Log & Lumbar MRI Policy Criteria", subtitle_style))
story_pt.append(Spacer(1, 4))
story_pt.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#059669"), spaceAfter=10))

demo_data_pt = [
    [Paragraph("<b>Patient Name:</b> Sarah Jenkins", body_style), Paragraph("<b>Patient ID:</b> pat-002", body_style)],
    [Paragraph("<b>Therapy Period:</b> 07/01/2026 – 08/21/2026 (8 Weeks)", body_style), Paragraph("<b>Total Sessions Completed:</b> 12 Sessions", body_style)],
    [Paragraph("<b>Referring Physician:</b> Dr. Mark Larson, MD", body_style), Paragraph("<b>Licensed PT:</b> Amanda Brooks, DPT", body_style)],
    [Paragraph("<b>Requested Service:</b> MRI Lumbar Spine (CPT 72148)", body_style), Paragraph("<b>Diagnosis:</b> L5 Lumbar Radiculopathy", body_style)],
]
t_pt = Table(demo_data_pt, colWidths=[260, 260])
t_pt.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#d1fae5")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story_pt.append(t_pt)
story_pt.append(Spacer(1, 12))

story_pt.append(Paragraph("PHYSICAL THERAPY PROGRESS & POLICY CRITERIA VERIFICATION", section_heading))
story_pt.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#a7f3d0"), spaceAfter=8))

p1_pt = ("<b>1. Conservative Treatment &amp; Physical Therapy Duration:</b><br/>"
         "Patient has completed <b>at least 6 weeks medical/conservative treatment</b> (8 weeks total conservative care). "
         "This included <b>6 weeks of physical therapy</b> (exceeding 4 weeks required within the last 3 months) "
         "with an <b>initial evaluation with PT and at least one follow up</b> (12 completed visits within the last 6 months) "
         "for current episode of back pain with no significant improvement.")
story_pt.append(Paragraph(p1_pt, body_style))
story_pt.append(Spacer(1, 8))

p2_pt = ("<b>2. Radiculopathy &amp; Physical Examination Findings:</b><br/>"
         "Physical examination confirms <b>suspected radiculopathy with lower extremity pain &gt; back pain in nerve root distribution</b>.<br/>"
         "• <b>Straight Leg Raise (SLR) Test:</b> <b>Positive supine straight leg raising test &gt;30 degrees and &lt;70 degrees</b> (positive at <b>45 degrees</b> left leg).<br/>"
         "• <b>Neurological Exam:</b> Motor weakness and sensory loss in a radicular distribution (L5 myotome 4/5 weakness, extensor hallucis longus).<br/>"
         "• <b>Progressive Signs:</b> <b>Progressive motor weakness present on repeat in-person examination</b>.")
story_pt.append(Paragraph(p2_pt, body_style))
story_pt.append(Spacer(1, 8))

p3_pt = ("<b>3. Functional Impairments &amp; Surgical Need:</b><br/>"
         "Lack of improvement accompanied by severe functional impairments (VAS 7/10 pain, unable to perform occupational duties). "
         "Patient's clinical presentation indicates need for surgery or other invasive intervention as determined by a surgeon or interventional specialist.<br/>"
         "<b>Recommendation:</b> Lumbar Spine MRI (CPT 72148) is fully verified and medically necessary under Policy MRI-69575638.")
story_pt.append(Paragraph(p3_pt, body_style))
story_pt.append(Spacer(1, 14))

st_pt = Table(sig_data_dep, colWidths=[260, 260])
st_pt.setStyle(TableStyle([
    ('LINEABOVE', (0,0), (-1,0), 1, colors.HexColor("#059669")),
    ('TOPPADDING', (0,0), (-1,-1), 6),
]))
story_pt.append(st_pt)

doc_pt.build(story_pt)
print(f"Generated PDF at {pdf_pt_file}")


# ── 3. Sync Scripts to Root Inputs Directory ──────────────────────────────────
script_root_filename = os.path.join(inputs_dir, "create_missing_info_input.py")
with open(__file__, "r", encoding="utf-8") as src:
    content = src.read()

with open(script_root_filename, "w", encoding="utf-8") as dst:
    dst.write(content)
print(f"Synced script to {script_root_filename}")

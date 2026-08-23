"""
Rich seed script — wipes and repopulates TiDB with realistic demo data.
15 authorization requests spread across 6 months, all statuses, full AI recommendations.
Run: python seed.py
"""
import sys, os
from urllib.parse import urlparse, unquote

sys.path.insert(0, os.path.dirname(__file__))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    root_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    backend_env = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(root_env):
        load_dotenv(root_env)
    elif os.path.exists(backend_env):
        load_dotenv(backend_env)
    else:
        load_dotenv()
except ImportError:
    pass

import pymysql, bcrypt, json, uuid
from datetime import datetime, timedelta

# Database Connection Settings loaded from environment
db_url = os.getenv("DATABASE_URL")
db_host = os.getenv("DB_HOST")
db_port = int(os.getenv("DB_PORT", "4000")) if os.getenv("DB_PORT") else 4000
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_name = os.getenv("DB_NAME", "prior_auth")

if db_url and not (db_host and db_user and db_password):
    clean_url = db_url.split("+", 1)[1] if "+" in db_url else db_url
    parsed = urlparse(clean_url)
    db_host = db_host or parsed.hostname or "localhost"
    db_port = parsed.port or db_port
    db_user = db_user or (unquote(parsed.username) if parsed.username else "root")
    db_password = db_password or (unquote(parsed.password) if parsed.password else "")
    db_name = db_name or (parsed.path.lstrip("/") if parsed.path else "prior_auth")

db_host = db_host or "localhost"
db_user = db_user or "root"
db_password = db_password or ""

connect_args = {
    "host": db_host,
    "port": db_port,
    "user": db_user,
    "password": db_password,
    "database": db_name,
    "connect_timeout": 15,
}

if "tidbcloud.com" in db_host or os.getenv("DB_SSL", "").lower() in ("true", "required", "1"):
    connect_args["ssl"] = {"ssl_mode": "REQUIRED"}

conn = pymysql.connect(**connect_args)
cur = conn.cursor()
now = datetime.utcnow()

# ── 0. WIPE ──────────────────────────────────────────────────────────────────
print("Wiping existing data...")
for tbl in ["audit_log","notifications","documents","authorization_requests",
            "policies","patients","providers","users"]:
    cur.execute(f"DELETE FROM {tbl}")
    print(f"  cleared {tbl}: {cur.rowcount} rows")
conn.commit()

# ── 1. USERS (IDs match roles.ts USER_PROFILES exactly) ────────────────────
print("\nInserting users...")
users = [
    # id matches USER_PROFILES in roles.ts
    ("u-prov-001","Dr. James Collins","provider@demo.com",
     bcrypt.hashpw(b"Provider@123",bcrypt.gensalt()).decode(),"provider",
     "Northwestern Memorial Hospital","(312) 555-0147"),
    ("u-rev-001","Sarah Henderson","reviewer@demo.com",
     bcrypt.hashpw(b"Reviewer@123",bcrypt.gensalt()).decode(),"reviewer",
     "BlueCross BlueShield Insurance","(312) 555-0198"),
    ("u-admin-001","Admin User","admin@demo.com",
     bcrypt.hashpw(b"Admin@123",bcrypt.gensalt()).decode(),"admin",
     "CareAuth Platform",None),
]
cur.executemany(
    "INSERT INTO users (id,name,email,password_hash,role,organization,contact) VALUES(%s,%s,%s,%s,%s,%s,%s)",
    users)
print(f"  users: {cur.rowcount}")

# ── 2. PROVIDERS ─────────────────────────────────────────────────────────────
print("Inserting providers...")
providers = [
    ("prov-001","Dr. James Collins, MD","1234567890","Orthopedic Surgery",
     "Northwestern Memorial Hospital","(312) 926-2000","(312) 926-2001",
     "251 E Huron St, Chicago, IL 60611","36-1234567"),
    ("prov-002","Dr. Susan Park, MD","0987654321","Radiology",
     "UCSF Medical Center","(415) 476-1000","(415) 476-1001",
     "505 Parnassus Ave, San Francisco, CA 94143","94-0987654"),
    ("prov-003","Dr. David Kim, MD","1122334455","Cardiology",
     "Houston Methodist Hospital","(713) 790-3333","(713) 790-3334",
     "6565 Fannin St, Houston, TX 77030","74-1122334"),
    ("prov-004","Dr. Priya Nair, MD","2233445566","Neurology",
     "Mayo Clinic","(507) 284-2511","(507) 284-0161",
     "200 First St SW, Rochester, MN 55905","41-2233445"),
    ("prov-005","Dr. Michael Torres, MD","3344556677","Oncology",
     "MD Anderson Cancer Center","(713) 792-2121","(713) 792-3457",
     "1515 Holcombe Blvd, Houston, TX 77030","74-3344556"),
]
cur.executemany(
    "INSERT INTO providers (id,name,npi,specialty,organization,phone,fax,address,tax_id) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    providers)
print(f"  providers: {cur.rowcount}")

# ── 3. PATIENTS ───────────────────────────────────────────────────────────────
print("Inserting patients...")
patients = [
    ("p-001","John Anderson","1965-03-22","BCB-4821-001","GRP-77821",
     "BlueCross PPO Gold","BlueCross BlueShield","Male",
     "(312) 555-0147","4821 Lakeview Dr, Chicago, IL 60657","Dr. James Collins"),
    ("p-002","Sarah Martinez","1978-07-15","AET-2231-002","GRP-43301",
     "Aetna HMO Silver","Aetna","Female",
     "(415) 555-0299","1090 Market St, San Francisco, CA 94102","Dr. Susan Park"),
    ("p-003","Michael Johnson","1952-11-08","UHC-9910-003","GRP-19284",
     "UnitedHealth Choice Plus","UnitedHealthcare","Male",
     "(713) 555-0871","3311 Westheimer Rd, Houston, TX 77098","Dr. David Kim"),
    ("p-004","Emily Rodriguez","1995-01-30","HUM-5555-004","GRP-55555",
     "Humana Gold Plus","Humana","Female",
     "(404) 555-0234","789 Peachtree St, Atlanta, GA 30308","Dr. Priya Nair"),
    ("p-005","Robert Wilson","1970-05-12","CVS-3333-005","GRP-33333",
     "CVS Health Select","CVS Health","Male",
     "(617) 555-0456","100 Federal St, Boston, MA 02110","Dr. Michael Torres"),
    ("p-006","Linda Chen","1988-09-25","BCB-7777-006","GRP-77777",
     "BlueCross PPO Silver","BlueCross BlueShield","Female",
     "(312) 555-0789","222 N Michigan Ave, Chicago, IL 60601","Dr. James Collins"),
    ("p-007","Carlos Mendez","1945-12-01","AET-8888-007","GRP-88888",
     "Aetna Medicare Advantage","Aetna","Male",
     "(713) 555-0321","450 Main St, Houston, TX 77002","Dr. David Kim"),
    ("p-008","Patricia Lee","1982-04-18","UHC-1111-008","GRP-11111",
     "UnitedHealth Navigate","UnitedHealthcare","Female",
     "(507) 555-0654","88 Oak Ave, Rochester, MN 55901","Dr. Priya Nair"),
    ("p-009","James Washington","1960-06-30","HUM-2222-009","GRP-22222",
     "Humana Value Plan","Humana","Male",
     "(713) 555-0987","600 Travis St, Houston, TX 77002","Dr. Michael Torres"),
    ("p-010","Maria Garcia","1973-02-14","CVS-4444-010","GRP-44444",
     "CVS Aetna PPO","CVS Health","Female",
     "(415) 555-0112","500 Castro St, San Francisco, CA 94114","Dr. Susan Park"),
]
cur.executemany(
    "INSERT INTO patients (id,name,dob,member_id,group_id,plan,payer,gender,phone,address,primary_care) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    patients)
print(f"  patients: {cur.rowcount}")

# ── 4. POLICIES ───────────────────────────────────────────────────────────────
print("Inserting policies...")
policies = [
    ("pol-001","MRI Authorization Policy","2.1","Active","2024-01-15","2026-08-10",
     "Prior authorization requirements for MRI imaging procedures. Covers diagnostic and therapeutic MRIs across all covered insurance plans.",
     "Diagnostic Imaging",
     json.dumps(["Clinical indication supported by documented symptoms lasting 6+ weeks","Failure of conservative management (PT, analgesics, rest) must be documented","Ordering physician must be board-certified specialist in relevant field","Facility must be ACR-accredited imaging center"]),
     json.dumps(["Physician order with specific clinical indication and ICD-10 code","Prior imaging reports (within 12 months) if applicable","Conservative treatment records (minimum 6 weeks)","Clinical notes supporting medical necessity with functional assessment"]),
     json.dumps(["Routine or screening MRI without documented clinical indication","Duplicate imaging within 6-month period without documented clinical change","Non-accredited imaging facility","Order from non-specialist without documented referral"]),
     json.dumps(["70553 — MRI Brain Without/With Contrast","72141 — MRI Cervical Spine Without Contrast","73221 — MRI Joint Upper Extremity","74183 — MRI Abdomen Without/With Contrast"])),
    ("pol-002","Physical Therapy Policy","3.0","Active","2024-06-01","2026-07-15",
     "Coverage guidelines for physical therapy services including visit limits, provider credentialing, and medical necessity criteria.",
     "Rehabilitation Services",
     json.dumps(["Physician referral required with specific diagnosis and treatment frequency","Licensed PT or PTA must perform all treatment","Treatment plan with measurable functional goals required","Progress notes documented every 30 days minimum"]),
     json.dumps(["Physician referral specifying diagnosis and frequency","Initial evaluation with validated functional assessment scores","Treatment plan with specific measurable goals and timeline","Progress notes and outcomes tracking with standardized tools"]),
     json.dumps(["Maintenance therapy without measurable functional progress","Exceeds annual visit limit without documented medical exception","Non-credentialed physical therapy provider","Duplicate PT and OT billing for same condition"]),
     json.dumps(["97110 — Therapeutic Exercise","97140 — Manual Therapy Techniques","97530 — Therapeutic Activities","97014 — Electrical Stimulation","97010 — Hot/Cold Pack"])),
    ("pol-003","Orthopedic Surgery Policy","1.8","Active","2024-03-01","2026-08-05",
     "Prior authorization for elective orthopedic surgical procedures including joint replacement, arthroscopy, and spinal fusion.",
     "Surgical Procedures",
     json.dumps(["Documented failure of conservative treatment for minimum 3 months","Radiographic evidence supporting surgical intervention (X-ray or MRI)","Board-certified orthopedic or spine surgeon required","Functional impairment documented with validated clinical scales (KOOS, ODI)"]),
     json.dumps(["Surgeon consultation notes with detailed clinical assessment","X-ray or MRI reports demonstrating structural pathology","Physical therapy and conservative treatment records (minimum 3 months)","Patient functional assessment scores at baseline and current evaluation"]),
     json.dumps(["Insufficient conservative treatment trial (less than 3 months)","Absence of radiographic evidence supporting surgical need","Non-urgent elective procedure without severe documented functional impairment","Surgeon not board-certified in applicable specialty"]),
     json.dumps(["27447 — Total Knee Arthroplasty","29881 — Knee Arthroscopy with Meniscectomy","22612 — Lumbar Spinal Fusion","23472 — Total Shoulder Arthroplasty"])),
    ("pol-004","Specialist Referral Policy","2.5","Active","2024-02-01","2026-08-01",
     "Requirements for specialist consultation and referral authorization within HMO plans. Covers all in-network and out-of-network specialist visits.",
     "Specialist Services",
     json.dumps(["PCP referral required for all HMO plan members","Specialist must be in-network or prior auth required for out-of-network","Clinical indication for specialist evaluation documented by PCP","Prior PCP workup documented before specialist referral"]),
     json.dumps(["Completed PCP referral form with ICD-10 code and reason for consult","Clinical notes documenting indication for specialist evaluation","Prior diagnostic test results reviewed by PCP","Relevant medical history and medication list"]),
     json.dumps(["Direct specialist access without PCP referral for HMO plans","Out-of-network specialist without approved exception","Duplicate specialist consultation within 90 days for same condition","Referral to non-participating provider group"]),
     json.dumps(["99241 — Office Consultation (15 min)","99242 — Office Consultation (30 min)","99243 — Office Consultation (40 min)","99244 — Office Consultation (60 min)"])),
    ("pol-005","CT Scan Policy","2.0","Active","2024-04-15","2026-07-20",
     "Prior authorization criteria for computed tomography imaging across all body regions. Covers diagnostic and follow-up CT scans.",
     "Diagnostic Imaging",
     json.dumps(["Clinical indication with ordering physician documentation","CT preferred over repeat MRI for bone and calcification pathology","Radiation safety considerations reviewed and documented","Ordering physician must justify over lower-radiation alternatives"]),
     json.dumps(["Ordering physician notes with specific clinical indication","Prior imaging results if applicable","Clinical indication statement with relevant history","Lab results if CT used for organ or metabolic assessment"]),
     json.dumps(["Routine screening CT without documented high-risk indication","Repeat CT within 6 months without documented clinical change","Non-accredited imaging center","CT requested without prior lower-radiation imaging attempt"]),
     json.dumps(["71250 — CT Thorax Without Contrast","74177 — CT Abdomen/Pelvis Without/With Contrast","73701 — CT Lower Extremity Without Contrast","70450 — CT Head Without Contrast"])),
]
cur.executemany(
    "INSERT INTO policies (id,title,version,status,effective_date,last_updated,description,coverage_type,criteria,documentation_required,denial_criteria,related_cpts) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    policies)
print(f"  policies: {cur.rowcount}")

# ── 5. AUTHORIZATION REQUESTS (15 across 6 months) ──────────────────────────
print("Inserting authorization requests...")

def ai_approve(conf=92, factors=None, missing=None, pol_ref="MRI Authorization Policy v2.1"):
    return {
        "decision": "Approve", "confidence": conf,
        "reasoning": f"Clinical documentation meets all coverage criteria. {conf}% confidence based on complete medical necessity evidence and policy alignment.",
        "keyFactors": factors or [
            {"name":"Complete Documentation","impact":"positive","weight":0.40,"description":"All required supporting documents present and verified"},
            {"name":"Conservative Treatment Documented","impact":"positive","weight":0.35,"description":"Prior conservative management attempts well-documented"},
            {"name":"Provider Credentialing","impact":"positive","weight":0.15,"description":"Requesting provider is board-certified and in-network"},
            {"name":"Diagnosis-Treatment Alignment","impact":"positive","weight":0.10,"description":"Diagnosis codes align with requested procedure"},
        ],
        "missingInfo": missing or [],
        "policyReferences": [{"id":"ref-1","title":pol_ref,"section":"Section 3.1 — Medical Necessity","relevanceScore":0.97,"excerpt":"Authorization approved when clinical necessity is documented and conservative treatment has been attempted for the required duration."}],
        "generatedAt": (now - timedelta(hours=1)).isoformat()+"Z", "modelVersion":"2.1.0",
    }

def ai_deny(conf=87, factors=None, missing=None):
    return {
        "decision": "Deny", "confidence": conf,
        "reasoning": f"Request does not meet medical necessity criteria. Insufficient documentation of conservative treatment failure. {conf}% confidence based on policy review.",
        "keyFactors": factors or [
            {"name":"Insufficient Conservative Treatment","impact":"negative","weight":0.45,"description":"No documented evidence of prior conservative treatment attempts"},
            {"name":"Limited Clinical Evidence","impact":"negative","weight":0.35,"description":"Clinical notes do not adequately support medical necessity"},
            {"name":"Non-Urgent Timeline","impact":"neutral","weight":0.20,"description":"Elective procedure timing does not indicate urgency"},
        ],
        "missingInfo": missing or ["Documentation of failed conservative treatment","Specialist evaluation and recommendation","Patient functional assessment scores"],
        "policyReferences": [{"id":"ref-2","title":"Applicable Coverage Policy","section":"Section 3.2 — Denial Criteria","relevanceScore":0.93,"excerpt":"Requests denied when evidence of conservative treatment failure is absent or when clinical indication is not supported by documented findings."}],
        "generatedAt": (now - timedelta(hours=2)).isoformat()+"Z", "modelVersion":"2.1.0",
    }

def ai_more_info(conf=68, missing=None):
    return {
        "decision": "Request More Info", "confidence": conf,
        "reasoning": f"Additional clinical documentation required to establish medical necessity. Current submission is incomplete. {conf}% confidence pending additional records.",
        "keyFactors": [
            {"name":"Incomplete Documentation","impact":"negative","weight":0.40,"description":"Key supporting documents missing from submission"},
            {"name":"Moderate Clinical Evidence","impact":"neutral","weight":0.35,"description":"Some clinical evidence present but not sufficient for determination"},
            {"name":"Timeline Alignment","impact":"positive","weight":0.25,"description":"Request timing is consistent with clinical guidelines"},
        ],
        "missingInfo": missing or ["Previous imaging results (within 12 months)","Physical therapy records and outcomes","Specialist consultation notes"],
        "policyReferences": [{"id":"ref-3","title":"Applicable Coverage Policy","section":"Section 2 — Documentation Requirements","relevanceScore":0.89,"excerpt":"Complete documentation of prior treatment attempts required before authorization can be granted."}],
        "generatedAt": now.isoformat()+"Z", "modelVersion":"2.1.0",
    }

# 15 requests: all statuses, spread across 6 months
requests = [
    # 1 — Approved, 5 months ago
    ("auth-001","PA-2026-00101","p-001","prov-001",
     json.dumps([{"code":"M17.11","description":"Primary osteoarthritis, right knee","type":"primary"},{"code":"E11.9","description":"Type 2 diabetes mellitus","type":"secondary"}]),
     json.dumps([{"code":"27447","description":"Total Knee Arthroplasty","modifier":"RT","quantity":1,"serviceDate":"2026-04-15","placeOfService":"21 - Inpatient Hospital"}]),
     "Approved","high","high",
     (now-timedelta(days=148)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=146)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Patient presents with severe right knee osteoarthritis, grade IV changes on X-ray. Six months of physical therapy completed with no improvement. Pain score 8/10, significantly limiting ambulation.",
     json.dumps(ai_approve(94, pol_ref="Orthopedic Surgery Policy v1.8"))),

    # 2 — Denied, 4 months ago
    ("auth-002","PA-2026-00108","p-002","prov-002",
     json.dumps([{"code":"M54.5","description":"Low back pain","type":"primary"}]),
     json.dumps([{"code":"72148","description":"MRI Lumbar Spine Without Contrast","modifier":"","quantity":1,"serviceDate":"2026-05-02","placeOfService":"24 - Ambulatory Surgical Center"}]),
     "Rejected","normal","low",
     (now-timedelta(days=120)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=118)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Patient reports 3 weeks of low back pain. No prior imaging. No documented conservative treatment.",
     json.dumps(ai_deny(89, missing=["Documentation of 6+ weeks conservative treatment","Prior X-ray results","Physical therapy records"]))),

    # 3 — Approved, 4 months ago
    ("auth-003","PA-2026-00112","p-003","prov-003",
     json.dumps([{"code":"I50.9","description":"Heart failure, unspecified","type":"primary"},{"code":"E78.5","description":"Hyperlipidemia","type":"secondary"}]),
     json.dumps([{"code":"93306","description":"Echocardiography, transthoracic","modifier":"","quantity":1,"serviceDate":"2026-05-10","placeOfService":"11 - Office"}]),
     "Approved","urgent","high",
     (now-timedelta(days=115)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=114)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Urgent cardiac evaluation for new-onset heart failure. Patient with known hypertension presenting with dyspnea on exertion and lower extremity edema.",
     json.dumps(ai_approve(97, pol_ref="Specialist Referral Policy v2.5"))),

    # 4 — More Info Required, 3 months ago
    ("auth-004","PA-2026-00119","p-004","prov-004",
     json.dumps([{"code":"G43.909","description":"Migraine, unspecified","type":"primary"},{"code":"R51","description":"Headache","type":"secondary"}]),
     json.dumps([{"code":"70553","description":"MRI Brain Without/With Contrast","modifier":"","quantity":1,"serviceDate":"2026-06-01","placeOfService":"24 - Ambulatory Surgical Center"}]),
     "More Information Required","high","medium",
     (now-timedelta(days=90)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=88)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Patient with chronic migraine requesting brain MRI. Previous neurological workup not documented in submission.",
     json.dumps(ai_more_info(71, missing=["Previous MRI or CT results (within 12 months)","Neurologist consultation notes","Medication trial history (triptans, preventive therapy)"]))),

    # 5 — Approved, 3 months ago
    ("auth-005","PA-2026-00124","p-005","prov-005",
     json.dumps([{"code":"C50.911","description":"Malignant neoplasm, right breast","type":"primary"}]),
     json.dumps([{"code":"77067","description":"Screening Mammography, bilateral","modifier":"","quantity":1,"serviceDate":"2026-06-12","placeOfService":"22 - On Campus-Outpatient Hospital"}]),
     "Approved","urgent","high",
     (now-timedelta(days=80)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=79)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Surveillance mammography for breast cancer patient, 18 months post-lumpectomy. Oncologist-ordered annual screening.",
     json.dumps(ai_approve(99, pol_ref="Specialist Referral Policy v2.5"))),

    # 6 — Under Review, 2 months ago
    ("auth-006","PA-2026-00131","p-006","prov-001",
     json.dumps([{"code":"M75.1","description":"Rotator cuff syndrome","type":"primary"},{"code":"M79.621","description":"Pain in right upper arm","type":"secondary"}]),
     json.dumps([{"code":"29827","description":"Arthroscopy, shoulder, surgical; with rotator cuff repair","modifier":"RT","quantity":1,"serviceDate":"2026-07-20","placeOfService":"21 - Inpatient Hospital"}]),
     "Under Review","high","high",
     (now-timedelta(days=60)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=58)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Full-thickness rotator cuff tear confirmed on MRI. Patient completed 12 weeks of physical therapy with persistent pain (7/10) and functional limitations. Failed cortisone injection x2.",
     json.dumps(ai_approve(91, pol_ref="Orthopedic Surgery Policy v1.8"))),

    # 7 — Approved, 2 months ago
    ("auth-007","PA-2026-00135","p-007","prov-003",
     json.dumps([{"code":"I25.10","description":"Atherosclerotic heart disease","type":"primary"},{"code":"I10","description":"Essential hypertension","type":"secondary"}]),
     json.dumps([{"code":"93454","description":"Coronary angiography","modifier":"","quantity":1,"serviceDate":"2026-07-08","placeOfService":"21 - Inpatient Hospital"}]),
     "Approved","urgent","high",
     (now-timedelta(days=55)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=54)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Unstable angina with troponin elevation. Cardiologist recommends urgent coronary angiography to evaluate for revascularization candidacy.",
     json.dumps(ai_approve(98, pol_ref="Specialist Referral Policy v2.5"))),

    # 8 — Rejected, 6 weeks ago
    ("auth-008","PA-2026-00140","p-008","prov-004",
     json.dumps([{"code":"G89.29","description":"Other chronic post-procedural pain","type":"primary"}]),
     json.dumps([{"code":"22612","description":"Lumbar Spinal Fusion, posterior","modifier":"","quantity":1,"serviceDate":"2026-08-05","placeOfService":"21 - Inpatient Hospital"}]),
     "Rejected","normal","medium",
     (now-timedelta(days=42)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=40)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Patient requesting spinal fusion for chronic post-procedural pain. Prior fusion performed 8 months ago. No documented conservative management since prior surgery.",
     json.dumps(ai_deny(85, missing=["Documentation of post-surgical rehabilitation","Pain management specialist evaluation","Current imaging confirming new pathology"]))),

    # 9 — Pending Review, 4 weeks ago
    ("auth-009","PA-2026-00144","p-009","prov-005",
     json.dumps([{"code":"C34.10","description":"Malignant neoplasm of upper lobe, bronchus or lung","type":"primary"},{"code":"Z79.899","description":"Other long-term drug therapy","type":"secondary"}]),
     json.dumps([{"code":"96413","description":"Chemotherapy administration, intravenous infusion","modifier":"","quantity":1,"serviceDate":"2026-09-01","placeOfService":"22 - On Campus-Outpatient Hospital"}]),
     "Pending Review","urgent","high",
     (now-timedelta(days=28)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=27)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Stage IIIA non-small cell lung cancer. Oncologist requesting initiation of carboplatin/paclitaxel chemotherapy regimen per NCCN guidelines.",
     json.dumps(ai_approve(96, pol_ref="Specialist Referral Policy v2.5"))),

    # 10 — Pending Review, 3 weeks ago
    ("auth-010","PA-2026-00147","p-010","prov-002",
     json.dumps([{"code":"H40.1130","description":"Primary open-angle glaucoma, bilateral","type":"primary"}]),
     json.dumps([{"code":"66984","description":"Cataract surgery with IOL implant","modifier":"","quantity":1,"serviceDate":"2026-09-15","placeOfService":"24 - Ambulatory Surgical Center"}]),
     "Pending Review","normal","medium",
     (now-timedelta(days=21)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=20)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Bilateral cataracts with visual acuity 20/200 right eye. Ophthalmologist recommends phacoemulsification with IOL implant. Patient reports difficulty driving and reading.",
     json.dumps(ai_approve(88, pol_ref="Orthopedic Surgery Policy v1.8"))),

    # 11 — More Info Required, 2 weeks ago
    ("auth-011","PA-2026-00150","p-001","prov-001",
     json.dumps([{"code":"M79.3","description":"Panniculitis","type":"primary"},{"code":"L98.2","description":"Febrile neutrophilic dermatosis","type":"secondary"}]),
     json.dumps([{"code":"97010","description":"Physical therapy — hot/cold pack","modifier":"","quantity":20,"serviceDate":"2026-09-10","placeOfService":"11 - Office"}]),
     "More Information Required","low","low",
     (now-timedelta(days=14)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=13)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Patient with soft tissue inflammation requesting ongoing PT. Treatment plan details and functional outcomes not provided.",
     json.dumps(ai_more_info(62, missing=["Functional outcome measures (baseline vs current)","Updated treatment plan with measurable goals","Physician order specifying frequency and duration"]))),

    # 12 — Pending Review, 10 days ago
    ("auth-012","PA-2026-00153","p-002","prov-002",
     json.dumps([{"code":"N18.4","description":"Chronic kidney disease, stage 4","type":"primary"},{"code":"E11.65","description":"Type 2 diabetes with hyperglycemia","type":"secondary"}]),
     json.dumps([{"code":"90935","description":"Hemodialysis, one evaluation","modifier":"","quantity":1,"serviceDate":"2026-09-20","placeOfService":"22 - On Campus-Outpatient Hospital"}]),
     "Pending Review","high","high",
     (now-timedelta(days=10)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=9)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "CKD stage 4 patient with GFR 18, approaching ESRD. Nephrologist recommending initiation of hemodialysis. AV fistula placed 6 weeks ago and maturing.",
     json.dumps(ai_approve(95, pol_ref="Specialist Referral Policy v2.5"))),

    # 13 — Under Review, 1 week ago
    ("auth-013","PA-2026-00156","p-003","prov-003",
     json.dumps([{"code":"I48.91","description":"Unspecified atrial fibrillation","type":"primary"},{"code":"I10","description":"Essential hypertension","type":"secondary"}]),
     json.dumps([{"code":"93656","description":"Pulmonary vein isolation","modifier":"","quantity":1,"serviceDate":"2026-10-01","placeOfService":"21 - Inpatient Hospital"}]),
     "Under Review","high","high",
     (now-timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=6)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Persistent atrial fibrillation refractory to two antiarrhythmic drugs (amiodarone, flecainide). Cardiologist recommends catheter ablation with pulmonary vein isolation.",
     json.dumps(ai_approve(90, pol_ref="Orthopedic Surgery Policy v1.8"))),

    # 14 — Pending Review, 3 days ago
    ("auth-014","PA-2026-00159","p-004","prov-004",
     json.dumps([{"code":"G35","description":"Multiple sclerosis","type":"primary"},{"code":"G81.90","description":"Hemiplegia, unspecified","type":"secondary"}]),
     json.dumps([{"code":"96365","description":"IV infusion for therapy, initial","modifier":"","quantity":1,"serviceDate":"2026-09-25","placeOfService":"22 - On Campus-Outpatient Hospital"}]),
     "Pending Review","urgent","high",
     (now-timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(days=2,hours=12)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Relapsing-remitting MS patient with new lesion on MRI. Neurologist recommending Natalizumab (Tysabri) infusion therapy. JC antibody negative.",
     json.dumps(ai_approve(93, pol_ref="Specialist Referral Policy v2.5"))),

    # 15 — Pending Review, today
    ("auth-015","PA-2026-00162","p-005","prov-005",
     json.dumps([{"code":"C61","description":"Malignant neoplasm of prostate","type":"primary"},{"code":"Z85.46","description":"Personal history of malignant neoplasm of prostate","type":"secondary"}]),
     json.dumps([{"code":"77385","description":"Intensity modulated radiation therapy","modifier":"","quantity":1,"serviceDate":"2026-10-05","placeOfService":"22 - On Campus-Outpatient Hospital"}]),
     "Pending Review","urgent","high",
     (now-timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S"),
     (now-timedelta(hours=5)).strftime("%Y-%m-%d %H:%M:%S"),
     "Sarah Henderson",
     "Intermediate-risk prostate cancer (Gleason 7, PSA 8.2). Radiation oncologist recommends definitive IMRT per NCCN guidelines. Biopsy confirmed. Staging workup complete.",
     json.dumps(ai_approve(97, pol_ref="Specialist Referral Policy v2.5"))),
]

cur.executemany(
    "INSERT INTO authorization_requests (id,case_number,patient_id,provider_id,diagnoses,procedures,status,priority,risk_level,submitted_at,due_date,assigned_to,clinical_notes,ai_recommendation) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    requests)
print(f"  authorization requests: {cur.rowcount}")

# ── 6. DOCUMENTS ─────────────────────────────────────────────────────────────
print("Inserting documents...")
docs = [
    ("doc-001","auth-001","Knee_MRI_Report_2026.pdf","imaging","3.2 MB","Dr. James Collins, MD",(now-timedelta(days=148)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-002","auth-001","PT_Progress_Notes_6wks.pdf","clinical_note","1.8 MB","Dr. James Collins, MD",(now-timedelta(days=148)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-003","auth-001","Xray_Right_Knee_AP_Lateral.pdf","imaging","2.1 MB","Dr. James Collins, MD",(now-timedelta(days=148)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-004","auth-003","Echo_Order_Dr_Kim.pdf","referral","0.8 MB","Dr. David Kim, MD",(now-timedelta(days=115)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-005","auth-003","Cardiac_Workup_Labs.pdf","lab_result","1.2 MB","Dr. David Kim, MD",(now-timedelta(days=115)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-006","auth-005","Oncology_Referral_Letter.pdf","referral","0.6 MB","Dr. Michael Torres, MD",(now-timedelta(days=80)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-007","auth-005","Pathology_Report_Biopsy.pdf","lab_result","2.4 MB","Dr. Michael Torres, MD",(now-timedelta(days=80)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-008","auth-006","Shoulder_MRI_Full_Thickness_Tear.pdf","imaging","4.1 MB","Dr. James Collins, MD",(now-timedelta(days=60)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-009","auth-006","PT_Shoulder_12wks_Outcomes.pdf","clinical_note","1.5 MB","Dr. James Collins, MD",(now-timedelta(days=60)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-010","auth-007","Coronary_Angio_Order.pdf","referral","0.9 MB","Dr. David Kim, MD",(now-timedelta(days=55)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-011","auth-009","Oncology_Treatment_Plan.pdf","clinical_note","2.8 MB","Dr. Michael Torres, MD",(now-timedelta(days=28)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-012","auth-009","Lung_CT_Staging.pdf","imaging","5.2 MB","Dr. Michael Torres, MD",(now-timedelta(days=28)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-013","auth-012","Nephrology_Referral.pdf","referral","0.7 MB","Dr. Susan Park, MD",(now-timedelta(days=10)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-014","auth-012","Lab_BMP_GFR_Trending.pdf","lab_result","1.1 MB","Dr. Susan Park, MD",(now-timedelta(days=10)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-015","auth-014","MS_Brain_MRI_New_Lesion.pdf","imaging","6.3 MB","Dr. Priya Nair, MD",(now-timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-016","auth-015","Prostate_Biopsy_Pathology.pdf","lab_result","1.9 MB","Dr. Michael Torres, MD",(now-timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S")),
    ("doc-017","auth-015","IMRT_Treatment_Plan.pdf","clinical_note","3.4 MB","Dr. Michael Torres, MD",(now-timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S")),
]
cur.executemany(
    "INSERT INTO documents (id,authorization_id,name,type,size,uploaded_by,uploaded_at) VALUES(%s,%s,%s,%s,%s,%s,%s)",
    docs)
print(f"  documents: {cur.rowcount}")

# ── 7. AUDIT LOG ─────────────────────────────────────────────────────────────
print("Inserting audit log...")
audit_entries = []
for req_id, case_num, pat_id, prov_id, _, proc_json, status, priority, _, sub_at, due_at, _, notes, ai_json in requests:
    ai = json.loads(ai_json)
    procs = json.loads(proc_json)
    proc_desc = procs[0]["code"] if procs else "procedure"
    sub_dt = datetime.strptime(sub_at, "%Y-%m-%d %H:%M:%S")
    # Submission entry
    audit_entries.append((
        f"at-sub-{req_id}",req_id,"Request Submitted","Dr. James Collins, MD","Provider",
        sub_at, f"Prior authorization submitted for {procs[0]['description']} (CPT {proc_desc}). {len(procs)} procedure(s) included.",
        None, None, "submission",
        json.dumps({"Priority": priority, "CPT": proc_desc}),
    ))
    # AI triage entry
    ai_at = (sub_dt + timedelta(minutes=12)).strftime("%Y-%m-%d %H:%M:%S")
    audit_entries.append((
        f"at-ai-{req_id}",req_id,"AI Triage Completed","Prioris Engine","System",
        ai_at, f"AI recommendation: {ai['decision']} with {ai['confidence']}% confidence. {len(ai.get('keyFactors',[]))} clinical factors evaluated.",
        None, ai["decision"], "ai_analysis",
        json.dumps({"Model":"Prioris Clinical Engine v2.1","Confidence":f"{ai['confidence']}%","Decision":ai["decision"]}),
    ))
    # Decision entry for resolved cases
    if status in ("Approved","Rejected"):
        decision_label = "Request Approved" if status == "Approved" else "Request Denied"
        decision_at = (sub_dt + timedelta(hours=36)).strftime("%Y-%m-%d %H:%M:%S")
        audit_entries.append((
            f"at-dec-{req_id}",req_id,decision_label,"Sarah Henderson","Insurance Reviewer",
            decision_at,
            "Medical necessity criteria reviewed. Decision aligns with AI recommendation and policy guidelines." if status == "Approved" else "Request does not meet coverage criteria. Insufficient documentation of conservative treatment failure.",
            "Pending Review", status, "decision",
            json.dumps({"Decision":status,"Reviewer":"Sarah Henderson","Case":case_num}),
        ))
    elif status == "More Information Required":
        info_at = (sub_dt + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
        audit_entries.append((
            f"at-info-{req_id}",req_id,"Additional Information Requested","Sarah Henderson","Insurance Reviewer",
            info_at,
            "Additional clinical documentation required before determination can be made. Provider notified via portal.",
            "Pending Review","More Information Required","decision",
            json.dumps({"Action":"Request More Info","Case":case_num}),
        ))

cur.executemany(
    "INSERT INTO audit_log (id,authorization_id,action,performed_by,role,timestamp,details,previous_value,new_value,category,metadata) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
    audit_entries)
print(f"  audit entries: {cur.rowcount}")

# ── 8. NOTIFICATIONS ─────────────────────────────────────────────────────────
print("Inserting notifications...")
notifications = [
    ("notif-001","u-prov-001","Request Approved — PA-2026-00101",
     "Your prior authorization request PA-2026-00101 for John Anderson (Total Knee Arthroplasty) has been approved. Authorization code: AUTH-2026-8821.",
     "success",(now-timedelta(days=146)).strftime("%Y-%m-%d %H:%M:%S"),0,"auth-001"),
    ("notif-002","u-prov-001","Additional Information Requested — PA-2026-00119",
     "PA-2026-00119 for Emily Rodriguez (MRI Brain) requires additional documentation. Please upload previous neurological workup within 5 business days.",
     "warning",(now-timedelta(days=88)).strftime("%Y-%m-%d %H:%M:%S"),0,"auth-004"),
    ("notif-003","u-prov-001","Request Rejected — PA-2026-00108",
     "PA-2026-00108 for Sarah Martinez has been denied. Reason: Insufficient documentation of 6-week conservative treatment. You may appeal within 30 days.",
     "error",(now-timedelta(days=118)).strftime("%Y-%m-%d %H:%M:%S"),1,"auth-002"),
    ("notif-004","u-prov-001","Request Approved — PA-2026-00124",
     "PA-2026-00124 for Robert Wilson (Mammography) has been approved. No additional steps required.",
     "success",(now-timedelta(days=79)).strftime("%Y-%m-%d %H:%M:%S"),1,"auth-005"),
    ("notif-005","u-prov-001","New Request Under Review — PA-2026-00162",
     "PA-2026-00162 for your patient has been received and is currently under AI triage. Expected decision within 2 business days.",
     "info",(now-timedelta(hours=5)).strftime("%Y-%m-%d %H:%M:%S"),0,"auth-015"),
    ("notif-006","u-rev-001","New Urgent Request — PA-2026-00162",
     "Urgent PA request PA-2026-00162 received from Dr. Michael Torres (Oncology). Patient: prostate cancer IMRT. Requires review within 24 hours.",
     "warning",(now-timedelta(hours=5)).strftime("%Y-%m-%d %H:%M:%S"),0,"auth-015"),
    ("notif-007","u-rev-001","New Urgent Request — PA-2026-00159",
     "Urgent PA request PA-2026-00159 for MS patient (Natalizumab infusion) submitted by Dr. Priya Nair. Priority: Urgent.",
     "warning",(now-timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),0,"auth-014"),
    ("notif-008","u-rev-001","Policy Update — MRI Authorization Policy",
     "MRI Authorization Policy has been updated to version 2.2 effective September 1, 2026. Review the updated documentation requirements.",
     "info",(now-timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S"),1,None),
    ("notif-009","u-rev-001","Weekly Summary",
     "This week: 4 requests approved, 1 denied, 2 pending additional info. AI accuracy 94.2%. Average review time: 3.8 hours.",
     "info",(now-timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S"),1,None),
]
cur.executemany(
    "INSERT INTO notifications (id,user_id,title,message,type,timestamp,is_read,case_id) VALUES(%s,%s,%s,%s,%s,%s,%s,%s)",
    notifications)
print(f"  notifications: {cur.rowcount}")

conn.commit()
conn.close()

print("\n" + "="*50)
print("SEED COMPLETE")
print(f"  Users:          {len(users)}")
print(f"  Providers:      {len(providers)}")
print(f"  Patients:       {len(patients)}")
print(f"  Policies:       {len(policies)}")
print(f"  Auth Requests:  {len(requests)}")
print(f"  Documents:      {len(docs)}")
print(f"  Audit Entries:  {len(audit_entries)}")
print(f"  Notifications:  {len(notifications)}")
print("="*50)

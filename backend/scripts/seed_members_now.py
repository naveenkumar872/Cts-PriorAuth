"""
seed_members_now.py
-------------------
Upserts all patient member IDs into TiDB/MySQL database table 'patients'.
Ensures all demo & test member IDs exist in the database.
"""

import sys, logging
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("seed_members")

from core.database import SessionLocal, Patient

def seed_patients():
    db = SessionLocal()
    try:
        patient_data = [
            ("pat-001", "John Miller", "1972-04-12", "MEM-1001", "GRP-501", "Gold HMO Plan", "Apex Health Plan", "Male", "+1 (555) 123-0001", "124 Oak Street, Chicago, IL", "Dr. Alan Vance, MD"),
            ("pat-002", "Eleanor Vance", "1965-09-24", "MEM-1002", "GRP-501", "Platinum PPO", "Apex Health Plan", "Female", "+1 (555) 123-0002", "456 Elm Ave, Chicago, IL", "Dr. Alan Vance, MD"),
            ("pat-003", "Marcus Johnson", "1980-01-15", "MEM-1003", "GRP-502", "Select Choice HMO", "Apex Health Plan", "Male", "+1 (555) 123-0003", "789 Pine Rd, Naperville, IL", "Dr. Maria Santos, MD"),
            ("pat-004", "Sophia Martinez", "1988-11-30", "MEM-1004", "GRP-503", "Advantage Senior Plan", "Apex Health Plan", "Female", "+1 (555) 123-0004", "321 Maple Lane, Evanston, IL", "Dr. Maria Santos, MD"),
            ("pat-005", "David Kim", "1975-06-08", "MEM-1005", "GRP-501", "Gold HMO Plan", "Apex Health Plan", "Male", "+1 (555) 123-0005", "654 Birch St, Schaumburg, IL", "Dr. James Wilson, MD"),
            ("pat-006", "Patricia Davis", "1958-03-19", "MEM-1006", "GRP-504", "Platinum PPO", "Apex Health Plan", "Female", "+1 (555) 123-0006", "987 Cedar Court, Oak Park, IL", "Dr. James Wilson, MD"),
            ("pat-007", "Robert Taylor", "1963-08-04", "MEM-1007", "GRP-502", "Advantage Senior Plan", "Apex Health Plan", "Male", "+1 (555) 123-0007", "159 Lakeview Dr, Chicago, IL", "Dr. Alan Vance, MD"),
            ("pat-008", "Linda Anderson", "1979-12-14", "MEM-1008", "GRP-503", "Select Choice HMO", "Apex Health Plan", "Female", "+1 (555) 123-0008", "753 Highland Ave, Skokie, IL", "Dr. Maria Santos, MD"),
            ("pat-009", "William Thomas", "1952-07-22", "MEM-1009", "GRP-504", "Advantage Senior Plan", "Apex Health Plan", "Male", "+1 (555) 123-0009", "852 Prairie Street, Aurora, IL", "Dr. James Wilson, MD"),
            ("pat-010", "Barbara Jackson", "1985-02-17", "MEM-1010", "GRP-501", "Gold HMO Plan", "Apex Health Plan", "Female", "+1 (555) 123-0010", "951 Sunset Blvd, Naperville, IL", "Dr. Alan Vance, MD"),
            ("pat-011", "Charles White", "1969-10-05", "MEM-1011", "GRP-502", "Platinum PPO", "Apex Health Plan", "Male", "+1 (555) 123-0011", "147 River Road, Des Plaines, IL", "Dr. Maria Santos, MD"),
            ("pat-012", "Susan Harris", "1977-05-28", "MEM-1012", "GRP-503", "Select Choice HMO", "Apex Health Plan", "Female", "+1 (555) 123-0012", "369 Forest Way, Glenview, IL", "Dr. James Wilson, MD"),
            ("pat-013", "Joseph Martin", "1961-09-09", "MEM-1013", "GRP-504", "Advantage Senior Plan", "Apex Health Plan", "Male", "+1 (555) 123-0013", "258 Willow Drive, Wheaton, IL", "Dr. Alan Vance, MD"),
            ("pat-014", "Margaret Thompson", "1982-04-03", "MEM-1014", "GRP-501", "Gold HMO Plan", "Apex Health Plan", "Female", "+1 (555) 123-0014", "147 Park Ave, Oak Brook, IL", "Dr. Maria Santos, MD"),
            ("pat-015", "Christopher Garcia", "1990-12-25", "MEM-1015", "GRP-502", "Platinum PPO", "Apex Health Plan", "Male", "+1 (555) 123-0015", "369 Summit St, Highland Park, IL", "Dr. James Wilson, MD"),
            ("pat-016", "John Anderson", "1965-03-22", "BCB-4821-001", "GRP-77821", "BlueCross PPO Gold", "BlueCross BlueShield", "Male", "(312) 555-0147", "4821 Lakeview Dr, Chicago, IL", "Dr. James Collins"),
            ("pat-017", "Sarah Martinez", "1978-07-15", "AET-2231-002", "GRP-43301", "Aetna HMO Silver", "Aetna", "Female", "(415) 555-0299", "1090 Market St, San Francisco, CA", "Dr. Susan Park"),
            ("pat-018", "Michael Johnson", "1952-11-08", "UHC-9910-003", "GRP-19284", "UnitedHealth Choice Plus", "UnitedHealthcare", "Male", "(713) 555-0871", "3311 Westheimer Rd, Houston, TX", "Dr. David Kim"),
            ("pat-019", "Emily Rodriguez", "1995-01-30", "HUM-5555-004", "GRP-55555", "Humana Gold Plus", "Humana", "Female", "(404) 555-0234", "789 Peachtree St, Atlanta, GA", "Dr. Michelle Brown"),
            ("pat-020", "Robert Wilson", "1970-05-12", "CVS-3333-005", "GRP-33333", "CVS Health Select", "CVS Health", "Male", "(617) 555-0456", "100 Federal St, Boston, MA", "Dr. Richard Thompson"),
            ("pat-021", "qwerty", "2018-06-12", "bcb457", "pt0987", "Platinum", "BlueCross BlueShield Insurance", "Male", "(555) 019-2831", "123 Main St, Chicago, IL", "Dr. James Collins"),
            ("pat-022", "Naveen", "2026-08-01", "72837286", "pt0987", "Platinum", "BlueCross BlueShield Insurance", "Male", "(555) 019-2832", "456 State St, Chicago, IL", "Dr. James Collins"),
            ("pat-023", "KANI", "1985-05-15", "pt0987", "GRP-8812", "Platinum", "BlueCross BlueShield Insurance", "Female", "(555) 019-2833", "789 Lake St, Chicago, IL", "Dr. James Collins"),
        ]

        count = 0
        for pid, name, dob_str, mid, gid, plan, payer, gen, ph, addr, pc in patient_data:
            existing = db.query(Patient).filter(Patient.member_id == mid).first()
            if not existing:
                p = Patient(
                    id=pid,
                    name=name,
                    dob=datetime.strptime(dob_str, "%Y-%m-%d").date(),
                    member_id=mid,
                    group_id=gid,
                    plan=plan,
                    payer=payer,
                    gender=gen,
                    phone=ph,
                    address=addr,
                    primary_care=pc
                )
                db.add(p)
                count += 1
            else:
                existing.name = name
                existing.plan = plan
                existing.payer = payer
                existing.gender = gen

        db.commit()
        log.info(f"Successfully upserted patient records in database! Total member records active: {db.query(Patient).count()} (added {count} new).")
    except Exception as e:
        log.error(f"Error seeding member records: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_patients()

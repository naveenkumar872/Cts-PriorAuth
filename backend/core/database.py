"""
SQLAlchemy ORM models — exactly mirrors the TiDB schema created for this project.
Uses synchronous PyMySQL driver (mysql+pymysql).
JSON columns (diagnoses, procedures, ai_recommendation, etc.) are stored as
MySQL JSON and automatically serialised/deserialised by SQLAlchemy.
"""

from sqlalchemy import (
    create_engine, Column, String, Text, DateTime, Float,
    Integer, ForeignKey, Boolean, Date, JSON,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
from core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
connect_args = {
    "connect_timeout": 5,
    "read_timeout": 10,
    "write_timeout": 10,
    "autocommit": False,
}
if "tidbcloud.com" in settings.DATABASE_URL or "ssl" in settings.DATABASE_URL.lower():
    connect_args["ssl"] = {"ssl_mode": "REQUIRED"}

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=False,
    pool_recycle=300,
    pool_size=15,
    max_overflow=25,
    connect_args=connect_args,
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id            = Column(String(36), primary_key=True)
    name          = Column(String(255), nullable=False)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20), nullable=False)   # provider | reviewer | admin
    organization  = Column(String(255))
    contact       = Column(String(100))
    created_at    = Column(DateTime, default=datetime.utcnow)

    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Provider(Base):
    __tablename__ = "providers"
    id           = Column(String(36), primary_key=True)
    name         = Column(String(255), nullable=False)
    npi          = Column(String(20), nullable=False, unique=True)
    specialty    = Column(String(100))
    organization = Column(String(255))
    phone        = Column(String(50))
    fax          = Column(String(50))
    address      = Column(String(500))
    tax_id       = Column(String(50))
    created_at   = Column(DateTime, default=datetime.utcnow)

    requests = relationship("AuthorizationRequest", back_populates="provider")


class Patient(Base):
    __tablename__ = "patients"
    id           = Column(String(36), primary_key=True)
    name         = Column(String(255), nullable=False)
    dob          = Column(Date, nullable=False)
    member_id    = Column(String(100), nullable=True)
    group_id     = Column(String(100))
    plan         = Column(String(255))
    payer        = Column(String(255))
    gender       = Column(String(20))
    phone        = Column(String(50))
    address      = Column(String(500))
    primary_care = Column(String(255))
    created_at   = Column(DateTime, default=datetime.utcnow)

    requests = relationship("AuthorizationRequest", back_populates="patient")


class Policy(Base):
    __tablename__ = "policies"
    id                     = Column(String(36), primary_key=True)
    title                  = Column(String(255), nullable=False)
    version                = Column(String(20), nullable=False)
    status                 = Column(String(20), nullable=False, default="Active")
    effective_date         = Column(Date)
    last_updated           = Column(Date)
    description            = Column(Text)
    coverage_type          = Column(String(100))
    criteria               = Column(JSON)
    documentation_required = Column(JSON)
    denial_criteria        = Column(JSON)
    related_cpts           = Column(JSON)
    created_at             = Column(DateTime, default=datetime.utcnow)
    updated_at             = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuthorizationRequest(Base):
    __tablename__ = "authorization_requests"
    id                = Column(String(36), primary_key=True)
    case_number       = Column(String(50), nullable=False, unique=True)
    patient_id        = Column(String(36), ForeignKey("patients.id"), nullable=False)
    provider_id       = Column(String(36), ForeignKey("providers.id"), nullable=False)
    # JSON arrays — shapes defined in types/index.ts
    diagnoses         = Column(JSON, nullable=False)
    procedures        = Column(JSON, nullable=False)
    status            = Column(String(50), nullable=False, default="Pending Review")
    priority          = Column(String(20), nullable=False, default="normal")
    risk_level        = Column(String(20), nullable=False, default="medium")
    submitted_at      = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    due_date          = Column(DateTime)
    assigned_to       = Column(String(255))
    clinical_notes    = Column(Text)
    ai_recommendation = Column(JSON)   # full AIRecommendation object
    # Module 4 — Context & Policy Mapping
    policy_id         = Column(String(50))   # provider-supplied policy ID e.g. "MRI-87720129"
    policy_context    = Column(JSON)         # full map-policy response stored here

    patient   = relationship("Patient", back_populates="requests")
    provider  = relationship("Provider", back_populates="requests")
    documents = relationship("Document", back_populates="request", cascade="all, delete-orphan")
    audit_log = relationship("AuditLog", back_populates="request", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    id               = Column(String(36), primary_key=True)
    authorization_id = Column(String(36), ForeignKey("authorization_requests.id"), nullable=False)
    name             = Column(String(500), nullable=False)
    type             = Column(String(50), nullable=False)
    size             = Column(String(20))
    uploaded_at      = Column(DateTime, default=datetime.utcnow)
    uploaded_by      = Column(String(255))
    file_url         = Column(String(1000))

    request = relationship("AuthorizationRequest", back_populates="documents")


class AuditLog(Base):
    __tablename__ = "audit_log"
    id               = Column(String(36), primary_key=True)
    authorization_id = Column(String(36), ForeignKey("authorization_requests.id", ondelete="SET NULL"))
    action           = Column(String(200), nullable=False)
    performed_by     = Column(String(255), nullable=False)
    role             = Column(String(100))
    timestamp        = Column(DateTime, default=datetime.utcnow)
    details          = Column(Text)
    previous_value   = Column(Text)
    new_value        = Column(Text)
    category         = Column(String(50), default="system")
    event_metadata   = Column("metadata", JSON)   # 'metadata' is reserved by SQLAlchemy

    request = relationship("AuthorizationRequest", back_populates="audit_log")


class Notification(Base):
    __tablename__ = "notifications"
    id        = Column(String(36), primary_key=True)
    user_id   = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    title     = Column(String(255), nullable=False)
    message   = Column(Text, nullable=False)
    type      = Column(String(20), nullable=False, default="info")
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_read   = Column(Boolean, default=False)
    case_id   = Column(String(36))

    user = relationship("User", back_populates="notifications")


class PolicyEvidence(Base):
    """
    Stores the RAG retrieval + LLM explanation produced after the rule engine
    makes its decision.  One row per authorization request (upserted on re-run).

    retrieved_chunks : list of {text, policyId, policyName, score} dicts
    llm_explanation  : 2-3 sentence human-readable explanation of the decision
    llm_prompt       : the FULL first prompt sent to the LLM (decision +
                       rule-set + provider input + chunks).  Re-used verbatim
                       as the base context for the Policy Companion.
    """
    __tablename__ = "policy_evidence"

    id                 = Column(String(36), primary_key=True)
    authorization_id   = Column(String(36), ForeignKey("authorization_requests.id", ondelete="CASCADE"), nullable=False, unique=True)
    policy_id          = Column(String(50))          # matched policy id e.g. MRI-87720129
    rule_decision      = Column(String(50))          # Approved / Not Approved / …
    retrieved_chunks   = Column(JSON)                # [{text, policyId, policyName, score}]
    llm_explanation    = Column(Text)                # 2-3 sentence explanation
    llm_prompt         = Column(Text)                # full prompt stored for companion reuse
    weaviate_query     = Column(Text)                # the query LLM wrote to hit Weaviate
    generated_at       = Column(DateTime, default=datetime.utcnow)
    duration_ms        = Column(Integer, default=0)

    request = relationship("AuthorizationRequest", backref="policy_evidence", uselist=False)


class PolicyCompanionMessage(Base):
    """
    Each question + answer exchange in the Policy Companion chat for a case.
    Rows are ordered by created_at.
    """
    __tablename__ = "policy_companion_messages"

    id               = Column(String(36), primary_key=True)
    authorization_id = Column(String(36), ForeignKey("authorization_requests.id", ondelete="CASCADE"), nullable=False)
    role             = Column(String(10), nullable=False)   # "user" | "assistant"
    content          = Column(Text, nullable=False)
    sources          = Column(JSON)     # [{text_preview, policyName, score}] for assistant turns
    created_at       = Column(DateTime, default=datetime.utcnow)

    request = relationship("AuthorizationRequest", backref="companion_messages")


class ValidationResult(Base):
    """
    Stores the Module 3 Validation & Preprocessing pipeline output for
    each authorization request. One row per run (latest wins via upsert).

    pipeline_status: pending | running | passed | failed | warning
    step*_status:    pending | passed  | failed | warning | skipped
    """
    __tablename__ = "validation_results"

    id                 = Column(String(36), primary_key=True)
    authorization_id   = Column(String(36), ForeignKey("authorization_requests.id", ondelete="CASCADE"), nullable=False)
    pipeline_status    = Column(String(20), nullable=False, default="pending")
    ran_at             = Column(DateTime, default=datetime.utcnow)
    duration_ms        = Column(Integer, default=0)

    # Step 1 — Validate required fields
    step1_status       = Column(String(20), default="pending")
    step1_issues       = Column(JSON)     # [{id, field, severity, message, resolution}]
    step1_summary      = Column(Text)

    # Step 2 — Extract text from documents
    step2_status       = Column(String(20), default="pending")
    step2_extracted    = Column(JSON)     # [{doc_id, doc_name, doc_type, text_preview, word_count, key_terms}]
    step2_summary      = Column(Text)

    # Step 3 — Process clinical notes & results
    step3_status       = Column(String(20), default="pending")
    step3_entities     = Column(JSON)     # {diagnoses_found, cpt_found, medications, dates, key_phrases}
    step3_summary      = Column(Text)

    # Step 4 — Convert to structured PA data
    step4_status       = Column(String(20), default="pending")
    step4_structured   = Column(JSON)     # the final structured PA data object
    step4_summary      = Column(Text)

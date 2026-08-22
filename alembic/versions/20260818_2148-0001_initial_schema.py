"""initial_schema

Revision ID: 0001
Revises:
Create Date: 2026-08-18 21:48:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # insurance_plans
    # ------------------------------------------------------------------
    op.create_table(
        "insurance_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("provider", sa.String(255), nullable=False),
        sa.Column("plan_type", sa.String(100), nullable=False),
        sa.Column("active", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # ------------------------------------------------------------------
    # providers
    # ------------------------------------------------------------------
    op.create_table(
        "providers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("organization", sa.String(255), nullable=True),
        sa.Column("license_number", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("license_number"),
    )
    op.create_index("ix_providers_license_number", "providers", ["license_number"])

    # ------------------------------------------------------------------
    # services
    # ------------------------------------------------------------------
    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_services_code", "services", ["code"])

    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ------------------------------------------------------------------
    # patients  (depends on insurance_plans)
    # ------------------------------------------------------------------
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", sa.String(20), nullable=True),
        sa.Column("member_id", sa.String(100), nullable=False),
        sa.Column("insurance_plan_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["insurance_plan_id"], ["insurance_plans.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("member_id"),
    )
    op.create_index("ix_patients_member_id", "patients", ["member_id"])
    op.create_index("ix_patients_insurance_plan_id", "patients", ["insurance_plan_id"])

    # ------------------------------------------------------------------
    # policies  (depends on insurance_plans)
    # ------------------------------------------------------------------
    op.create_table(
        "policies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("insurance_plan_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("version", sa.String(50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["insurance_plan_id"], ["insurance_plans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_policies_insurance_plan_id", "policies", ["insurance_plan_id"])
    op.create_index("ix_policies_plan_active", "policies", ["insurance_plan_id", "active"])

    # ------------------------------------------------------------------
    # policy_rules  (depends on policies)
    # ------------------------------------------------------------------
    op.create_table(
        "policy_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("policy_id", sa.Integer(), nullable=False),
        sa.Column("rule", sa.Text(), nullable=False),
        sa.Column("requirement", sa.Text(), nullable=False),
        sa.Column("source_reference", sa.String(500), nullable=True),
        sa.ForeignKeyConstraint(["policy_id"], ["policies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_policy_rules_policy_id", "policy_rules", ["policy_id"])

    # ------------------------------------------------------------------
    # authorization_requests  (depends on patients, providers, services)
    # ------------------------------------------------------------------
    op.create_table(
        "authorization_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("provider_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("diagnosis", sa.String(500), nullable=False),
        sa.Column("clinical_notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("priority", sa.String(10), server_default="low", nullable=False),
        sa.Column("submitted_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_auth_requests_patient_id", "authorization_requests", ["patient_id"])
    op.create_index("ix_auth_requests_provider_id", "authorization_requests", ["provider_id"])
    op.create_index("ix_auth_requests_service_id", "authorization_requests", ["service_id"])
    op.create_index("ix_auth_requests_status", "authorization_requests", ["status"])
    op.create_index("ix_auth_requests_priority", "authorization_requests", ["priority"])
    op.create_index("ix_auth_requests_status_priority", "authorization_requests", ["status", "priority"])

    # ------------------------------------------------------------------
    # documents  (depends on authorization_requests, users)
    # ------------------------------------------------------------------
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("authorization_id", sa.Integer(), nullable=False),
        sa.Column("document_type", sa.String(100), nullable=False),
        sa.Column("file_url", sa.String(1000), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["authorization_id"], ["authorization_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_authorization_id", "documents", ["authorization_id"])
    op.create_index("ix_documents_uploaded_by", "documents", ["uploaded_by"])

    # ------------------------------------------------------------------
    # ai_decisions  (depends on authorization_requests)
    # ------------------------------------------------------------------
    op.create_table(
        "ai_decisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("authorization_id", sa.Integer(), nullable=False),
        sa.Column("recommendation", sa.String(15), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("confidence_score >= 0.0 AND confidence_score <= 1.0", name="ck_ai_decisions_confidence_score_range"),
        sa.ForeignKeyConstraint(["authorization_id"], ["authorization_requests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_decisions_authorization_id", "ai_decisions", ["authorization_id"])

    # ------------------------------------------------------------------
    # nurse_reviews  (depends on authorization_requests, users)
    # ------------------------------------------------------------------
    op.create_table(
        "nurse_reviews",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("authorization_id", sa.Integer(), nullable=False),
        sa.Column("nurse_id", sa.Integer(), nullable=False),
        sa.Column("decision", sa.String(20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["authorization_id"], ["authorization_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["nurse_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_nurse_reviews_authorization_id", "nurse_reviews", ["authorization_id"])
    op.create_index("ix_nurse_reviews_nurse_id", "nurse_reviews", ["nurse_id"])

    # ------------------------------------------------------------------
    # authorization_decisions  (depends on authorization_requests, users)
    # ------------------------------------------------------------------
    op.create_table(
        "authorization_decisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("authorization_id", sa.Integer(), nullable=False),
        sa.Column("decided_by", sa.Integer(), nullable=False),
        sa.Column("decision", sa.String(15), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["authorization_id"], ["authorization_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["decided_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_auth_decisions_authorization_id", "authorization_decisions", ["authorization_id"])
    op.create_index("ix_auth_decisions_decided_by", "authorization_decisions", ["decided_by"])


def downgrade() -> None:
    op.drop_table("authorization_decisions")
    op.drop_table("nurse_reviews")
    op.drop_table("ai_decisions")
    op.drop_table("documents")
    op.drop_table("authorization_requests")
    op.drop_table("policy_rules")
    op.drop_table("policies")
    op.drop_table("patients")
    op.drop_table("users")
    op.drop_table("services")
    op.drop_table("providers")
    op.drop_table("insurance_plans")

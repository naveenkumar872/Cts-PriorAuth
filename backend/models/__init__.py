# Re-export all models so that Alembic's autogenerate can detect every table
# via Base.metadata. Import order follows dependency (parents before children).

from backend.models.base import Base, TimestampMixin

# Independent reference tables (no FK dependencies)
from backend.models.user import User
from backend.models.insurance_plan import InsurancePlan
from backend.models.provider import Provider
from backend.models.service import Service

# First-level dependents
from backend.models.patient import Patient          # depends on InsurancePlan
from backend.models.policy import Policy, PolicyRule  # depends on InsurancePlan

# Central hub
from backend.models.authorization import AuthorizationRequest, AuthStatus, Priority

# Second-level dependents — all depend on AuthorizationRequest
from backend.models.document import Document
from backend.models.ai_decision import AIDecision, AIRecommendation
from backend.models.nurse_review import NurseReview, NurseDecision
from backend.models.auth_decision import AuthorizationDecision, FinalDecision

__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    # Models
    "User",
    "InsurancePlan",
    "Provider",
    "Service",
    "Patient",
    "Policy",
    "PolicyRule",
    "AuthorizationRequest",
    "Document",
    "AIDecision",
    "NurseReview",
    "AuthorizationDecision",
    # Enums
    "AuthStatus",
    "Priority",
    "AIRecommendation",
    "NurseDecision",
    "FinalDecision",
]

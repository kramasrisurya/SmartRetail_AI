"""Domain enums for the SmartRetail schema.

All enums are ``str``-subclasses so their values survive JSON serialization.
Native PostgreSQL enum types are created from these via :func:`pg_enum`; the
database value is the lowercase ``.value`` of each member (e.g. ``AlertStatus
OPEN`` is stored as ``'open'``).
"""

import enum

from sqlalchemy import Enum as SAEnum


def pg_enum(enum_cls: type[enum.Enum], name: str) -> SAEnum:
    """Build a native PostgreSQL enum type from a Python enum class."""
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        values_callable=lambda e: [m.value for m in e],
    )


class StoreStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class CameraSourceType(str, enum.Enum):
    RTSP = "rtsp"
    FILE = "file"
    SIMULATION = "simulation"


class CameraStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    FAULTED = "faulted"
    REMOVED = "removed"


class CameraRelationshipType(str, enum.Enum):
    OVERLAP = "overlap"
    ENTRY_EXIT = "entry_exit"
    ADJACENT = "adjacent"
    BLIND_SPOT = "blind_spot"


class ZoneType(str, enum.Enum):
    SHELF = "shelf"
    CHECKOUT = "checkout"
    ENTRANCE = "entrance"
    EXIT = "exit"
    RESTRICTED = "restricted"
    CUSTOMER_AREA = "customer_area"
    WALKWAY = "walkway"
    STORAGE = "storage"
    STAFF_AREA = "staff_area"
    OTHER = "other"


class PersonStatus(str, enum.Enum):
    ACTIVE = "active"
    EXITED = "exited"
    UNKNOWN = "unknown"


class ProductState(str, enum.Enum):
    NORMAL = "normal"
    PICKED = "picked"
    CARRIED = "carried"
    CONCEALED = "concealed"
    IN_CART = "in_cart"
    RETURNED = "returned"
    TRANSFERRED = "transferred"
    DROPPED = "dropped"
    PURCHASED = "purchased"
    PENDING_CHECKOUT_RESOLUTION = "pending_checkout_resolution"
    UNKNOWN = "unknown"
    REVIEW_REQUIRED = "review_required"


class CartType(str, enum.Enum):
    CART = "cart"
    BASKET = "basket"
    OTHER = "other"


class CartStatus(str, enum.Enum):
    ACTIVE = "active"
    ABANDONED = "abandoned"
    CHECKED_OUT = "checked_out"
    UNKNOWN = "unknown"


class JourneyType(str, enum.Enum):
    PERSON = "person"
    PRODUCT = "product"


class JourneyStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class RiskLevel(str, enum.Enum):
    NORMAL = "normal"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class AlertStatus(str, enum.Enum):
    OPEN = "open"
    REVIEWING = "reviewing"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"
    ESCALATED = "escalated"


class AlertPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class IncidentStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EvidenceType(str, enum.Enum):
    FRAME = "frame"
    CLIP = "clip"
    SNAPSHOT = "snapshot"
    TRACK = "track"
    DETECTION = "detection"
    OTHER = "other"


class FeedbackDecision(str, enum.Enum):
    TRUE_EVENT = "true_event"
    FALSE_POSITIVE = "false_positive"
    NORMAL_BEHAVIOR = "normal_behavior"
    MISPLACED_PRODUCT = "misplaced_product"
    RETURNED_PRODUCT = "returned_product"
    UNKNOWN = "unknown"
    STAFF_ACTIVITY = "staff_activity"
    CAMERA_ERROR = "camera_error"


class POSPaymentStatus(str, enum.Enum):
    PAID = "paid"
    PENDING = "pending"
    VOIDED = "voided"
    REFUNDED = "refunded"


class RoleCode(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    STORE_MANAGER = "store_manager"
    SECURITY_MANAGER = "security_manager"
    SECURITY_OPERATOR = "security_operator"
    ANALYST = "analyst"
    AUDITOR = "auditor"
    VIEW_ONLY = "view_only"


class PermissionCode(str, enum.Enum):
    VIEW_LIVE_VIDEO = "view_live_video"
    VIEW_HISTORICAL_VIDEO = "view_historical_video"
    VIEW_INCIDENT_EVIDENCE = "view_incident_evidence"
    VIEW_ANALYTICS = "view_analytics"
    MANAGE_USERS = "manage_users"
    MANAGE_MODELS = "manage_models"
    MANAGE_CAMERAS = "manage_cameras"
    EXPORT_DATA = "export_data"
    DELETE_DATA = "delete_data"

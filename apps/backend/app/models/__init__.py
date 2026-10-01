"""ORM models.

Phase 2: the complete relational schema backing the platform. Importing this
package registers every model on ``Base.metadata`` (used by Alembic
autogenerate and by the seed script).

See docs/models/schema.md for the full ER diagram and data-lineage walkthrough.
"""

from app.models.event import Event, EventGraph, Journey, JourneyEvent
from app.models.people import CameraHandoff, Person, Track, TrackFrame
from app.models.product import Cart, Product, ProductDetection, ProductImage, ProductState, Shelf, ShelfProduct
from app.models.risk import (
    Alert,
    Evidence,
    Incident,
    IncidentAlert,
    POSScan,
    ReviewFeedback,
    RiskScore,
)
from app.models.store import (
    Camera,
    CameraHeartbeat,
    CameraRelationship,
    Store,
    Zone,
    ZoneAuthorization,
)
from app.models.system import AuditLog, Permission, Role, RolePermission, User, UserRole

__all__ = [
    "Alert",
    "AuditLog",
    "Camera",
    "CameraHandoff",
    "CameraHeartbeat",
    "CameraRelationship",
    "Cart",
    "Event",
    "EventGraph",
    "Evidence",
    "Incident",
    "IncidentAlert",
    "Journey",
    "JourneyEvent",
    "Permission",
    "Person",
    "POSScan",
    "Product",
    "ProductDetection",
    "ProductImage",
    "ProductState",
    "ReviewFeedback",
    "RiskScore",
    "Role",
    "RolePermission",
    "Shelf",
    "ShelfProduct",
    "Store",
    "Track",
    "TrackFrame",
    "User",
    "UserRole",
    "Zone",
    "ZoneAuthorization",
]

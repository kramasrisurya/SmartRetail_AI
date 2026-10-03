"""Idempotent demo seed data for local development and the Phase 20 demo.

Run from the repository root (after migrations have been applied):

    python -m database.seeds.seed
    # or: scripts/seed.sh | scripts/seed.ps1 | make seed

Seeds one store matching the spec's example store map (section 6), its zones,
12 cameras with camera relationships, a small product catalog, shelf
expectations, and the RBAC baseline (roles, permissions, demo users). Running
it twice is safe: existing rows are reused.
"""

import asyncio
import sys
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "backend"))

from app.db.session import get_session_maker  # noqa: E402
from app.models import (  # noqa: E402
    Camera,
    CameraRelationship,
    Permission,
    Product,
    Role,
    RolePermission,
    Shelf,
    ShelfProduct,
    Store,
    User,
    UserRole,
    Zone,
)
from app.models.enums import (  # noqa: E402
    CameraRelationshipType,
    CameraSourceType,
    CameraStatus,
    PermissionCode,
    RoleCode,
    StoreStatus,
    ZoneType,
)
from sqlalchemy import select, text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

STORE = {
    "name": "SmartRetail Demo Store",
    "address": "1 Market Street, Demo City",
    "timezone": "UTC",
    "status": StoreStatus.ACTIVE,
    # Digital store-map bounds (unitless store-map coordinates). Camera
    # positions are validated against this bounding box by the API.
    "bounds": {"min_x": 0, "min_y": 0, "max_x": 100, "max_y": 150},
}

# Local video file backing the demo file-based camera (CAM-D1). Relative to
# the repository root; the ingestion service resolves it from its workdir.
# Generated on demand by scripts/make-demo-clip; *.mp4 is git-ignored.
DEMO_CLIP_PATH = "datasets/processed/demo_clip.mp4"

# Zone rectangles in store-map coordinates (x1, y1, x2, y2), matching the §6
# example layout: two shelf rows at the top, customer area mid-floor, checkout
# band below it, entrance bottom-left / exit bottom-right, staff-only office on
# the west wall, storage strip behind checkout. Walkway gaps between regions are
# deliberate - locate() must report "no zone" there honestly.
def _rect(x1, y1, x2, y2):
    return {"type": "polygon",
            "points": [{"x": x1, "y": y1}, {"x": x2, "y": y1}, {"x": x2, "y": y2}, {"x": x1, "y": y2}]}


ZONES = [
    # name, type, floor, rectangle
    ("Entrance", ZoneType.ENTRANCE, "1", (0, 134, 30, 149)),
    ("Exit", ZoneType.EXIT, "1", (68, 134, 100, 149)),
    ("Checkout", ZoneType.CHECKOUT, "1", (8, 93, 92, 118)),
    ("Customer Area", ZoneType.CUSTOMER_AREA, "1", (14, 56, 90, 88)),
    ("Shelf A", ZoneType.SHELF, "1", (6, 5, 34, 26)),
    ("Shelf B", ZoneType.SHELF, "1", (37, 5, 63, 26)),
    ("Shelf C", ZoneType.SHELF, "1", (66, 5, 94, 26)),
    ("Shelf D", ZoneType.SHELF, "1", (6, 31, 34, 52)),
    ("Shelf E", ZoneType.SHELF, "1", (37, 31, 63, 52)),
    ("Shelf F", ZoneType.SHELF, "1", (66, 31, 94, 52)),
    ("Staff Office", ZoneType.RESTRICTED, "1", (0, 56, 11, 88)),
    ("Storage", ZoneType.STORAGE, "1", (55, 121, 97, 131)),
]

CAMERAS = [
    # name, zone, location, orientation, fov, gpu, x, y, facing(deg CW from north)
    ("CAM-01", "Gondola A", "NW Ceiling Corner", "southeast", 70, "gpu-0", 4.0, 6.0, 135),
    ("CAM-02", "Gondola B", "NE Ceiling Corner", "southwest", 70, "gpu-0", 96.0, 6.0, 225),
    ("CAM-03", "Gondola C", "East Perimeter Wall", "west", 75, "gpu-0", 97.0, 52.0, 270),
    ("CAM-04", "Cosmetics", "West Perimeter Wall", "east", 75, "gpu-0", 3.0, 52.0, 80),
    ("CAM-05", "Checkout", "Overhead Checkout Gimbal", "south", 85, "gpu-0", 50.0, 92.0, 180),
    ("CAM-06", "Entrance", "Entrance Vestibule Corner", "northeast", 75, "gpu-1", 4.0, 132.0, 60),
]

CAMERA_RELATIONSHIPS = [
    # (camera_a, camera_b, relationship_type). Undirected relationships are
    # stored canonically (smaller camera id first); entry_exit is directed and
    # reads "leaving <a> (its exit) leads into <b> (its entry)".
    ("CAM-01", "CAM-02", CameraRelationshipType.OVERLAP),
    ("CAM-02", "CAM-03", CameraRelationshipType.OVERLAP),
    ("CAM-04", "CAM-05", CameraRelationshipType.OVERLAP),
    ("CAM-05", "CAM-06", CameraRelationshipType.OVERLAP),
    ("CAM-08", "CAM-09", CameraRelationshipType.OVERLAP),
    ("CAM-09", "CAM-10", CameraRelationshipType.OVERLAP),
    ("CAM-11", "CAM-12", CameraRelationshipType.ENTRY_EXIT),
    ("CAM-07", "CAM-11", CameraRelationshipType.ADJACENT),
    ("CAM-07", "CAM-12", CameraRelationshipType.ADJACENT),
    ("CAM-01", "CAM-07", CameraRelationshipType.ADJACENT),
    ("CAM-04", "CAM-07", CameraRelationshipType.ADJACENT),
]

PRODUCTS = [
    # sku, name, category, price
    ("A123", "Coffee Beans 250g", "groceries", Decimal("4.99")),
    ("B222", "Milk 1L", "dairy", Decimal("1.29")),
    ("C991", "Energy Drink 250ml", "beverages", Decimal("2.49")),
    ("D447", "Bread Loaf", "bakery", Decimal("2.99")),
    ("E005", "Chocolate Bar", "confectionery", Decimal("1.49")),
    ("F318", "Laundry Detergent 1kg", "household", Decimal("8.99")),
    ("G702", "Toothpaste 100ml", "personal care", Decimal("2.79")),
    ("H104", "Shampoo 400ml", "personal care", Decimal("5.49")),
    ("J550", "Bottled Water 1.5L", "beverages", Decimal("0.99")),
    ("K881", "Cereal 500g", "groceries", Decimal("3.49")),
]

SHELVES = [
    # (shelf name, zone name, expected SKUs, position rect within the zone)
    ("Shelf A", "Shelf A", ["A123", "K881"], (10, 10, 30, 22)),
    ("Shelf B", "Shelf B", ["B222", "D447"], (41, 10, 59, 22)),
    ("Shelf C", "Shelf C", ["C991", "J550"], (70, 10, 90, 22)),
    ("Shelf D", "Shelf D", ["E005"], (10, 36, 30, 48)),
    ("Shelf E", "Shelf E", ["F318"], (41, 36, 59, 48)),
    ("Shelf F", "Shelf F", ["G702", "H104"], (70, 36, 90, 48)),
]

ROLE_PERMISSIONS = {
    RoleCode.SUPER_ADMIN: list(PermissionCode),
    RoleCode.ORG_ADMIN: list(PermissionCode),
    RoleCode.STORE_MANAGER: [
        PermissionCode.VIEW_LIVE_VIDEO,
        PermissionCode.VIEW_HISTORICAL_VIDEO,
        PermissionCode.VIEW_INCIDENT_EVIDENCE,
        PermissionCode.VIEW_ANALYTICS,
        PermissionCode.EXPORT_DATA,
    ],
    RoleCode.SECURITY_MANAGER: [
        PermissionCode.VIEW_LIVE_VIDEO,
        PermissionCode.VIEW_HISTORICAL_VIDEO,
        PermissionCode.VIEW_INCIDENT_EVIDENCE,
        PermissionCode.VIEW_ANALYTICS,
        PermissionCode.EXPORT_DATA,
        PermissionCode.DELETE_DATA,
    ],
    RoleCode.SECURITY_OPERATOR: [
        PermissionCode.VIEW_LIVE_VIDEO,
        PermissionCode.VIEW_HISTORICAL_VIDEO,
        PermissionCode.VIEW_INCIDENT_EVIDENCE,
    ],
    RoleCode.ANALYST: [
        PermissionCode.VIEW_HISTORICAL_VIDEO,
        PermissionCode.VIEW_ANALYTICS,
        PermissionCode.EXPORT_DATA,
    ],
    RoleCode.AUDITOR: [
        PermissionCode.VIEW_HISTORICAL_VIDEO,
        PermissionCode.VIEW_INCIDENT_EVIDENCE,
        PermissionCode.EXPORT_DATA,
    ],
    RoleCode.VIEW_ONLY: [
        PermissionCode.VIEW_LIVE_VIDEO,
        PermissionCode.VIEW_ANALYTICS,
    ],
}

USERS = [
    # username, full name, role
    ("admin", "System Admin", RoleCode.SUPER_ADMIN, None),
    ("security.operator", "Security Operator", RoleCode.SECURITY_OPERATOR, "SmartRetail Demo Store"),
    ("store.manager", "Store Manager", RoleCode.STORE_MANAGER, "SmartRetail Demo Store"),
    ("analyst", "Analyst", RoleCode.ANALYST, None),
    ("viewer", "Read-Only Viewer", RoleCode.VIEW_ONLY, None),
]


async def get_or_create(session: AsyncSession, model, defaults: dict | None = None, **filters) -> tuple[object, bool]:
    obj = (await session.execute(select(model).filter_by(**filters))).scalars().first()
    if obj is not None:
        return obj, False
    obj = model(**filters, **(defaults or {}))
    session.add(obj)
    await session.flush()
    return obj, True


async def seed(session: AsyncSession) -> dict[str, int]:
    stats = {"created": 0, "existing": 0}

    def count(new: bool) -> None:
        stats["created" if new else "existing"] += 1

    store, new = await get_or_create(
        session,
        Store,
        name=STORE["name"],
        defaults={
            "address": STORE["address"],
            "timezone": STORE["timezone"],
            "status": STORE["status"],
            "bounds": STORE["bounds"],
        },
    )
    count(new)

    zones: dict[str, Zone] = {}
    for name, zone_type, floor, rect in ZONES:
        zone, new = await get_or_create(
            session,
            Zone,
            store_id=store.id,
            name=name,
            defaults={"zone_type": zone_type, "floor": floor, "bounds": _rect(*rect)},
        )
        zones[name] = zone
        count(new)

    cameras: dict[str, Camera] = {}
    for name, zone_name, location, orientation, fov, gpu, x, y, facing in CAMERAS:
        cam, new = await get_or_create(
            session,
            Camera,
            store_id=store.id,
            name=name,
            defaults={
                "zone_id": zones[zone_name].id,
                "location": location,
                "floor": "1",
                "source_type": CameraSourceType.RTSP,
                "rtsp_url": f"rtsp://camera-network.local:554/{name}",
                "resolution": "1920x1080",
                "fps": 15,
                "processing_fps": 10,
                "detection_model": "yolov8n-default",
                "orientation": orientation,
                "field_of_view": fov,
                "map_x": x,
                "map_y": y,
                "facing_direction": facing,
                "status": CameraStatus.ACTIVE,
                "gpu_assignment": gpu,
            },
        )
        cameras[name] = cam
        count(new)

    for cam_a, cam_b, rel_type in CAMERA_RELATIONSHIPS:
        rel, new = await get_or_create(
            session,
            CameraRelationship,
            defaults={"directed": rel_type == CameraRelationshipType.ENTRY_EXIT},
            camera_id=cameras[cam_a].id,
            related_camera_id=cameras[cam_b].id,
            relationship_type=rel_type,
        )
        count(new)

    # Demo-only file camera: ingests a local video clip via the Phase 4
    # ingestion service (source_type 'file'). The clip itself is generated on
    # demand (scripts/make-demo-clip) and is git-ignored, so nothing here
    # requires the file to exist at seed time.
    cam_demo, new = await get_or_create(
        session,
        Camera,
        store_id=store.id,
        name="CAM-D1",
        defaults={
            "zone_id": zones["Entrance"].id,
            "location": "Demo clip (file source)",
            "floor": "1",
            "source_type": CameraSourceType.FILE,
            "file_path": DEMO_CLIP_PATH,
            "resolution": "640x360",
            "fps": 15,
            "processing_fps": 10,
            "detection_model": "yolov8n-default",
            "orientation": "center",
            "field_of_view": 90,
            "map_x": 30.0,
            "map_y": 135.0,
            "facing_direction": 90,
            "status": CameraStatus.ACTIVE,
            "gpu_assignment": "gpu-0",
        },
    )
    count(new)

    products: dict[str, Product] = {}
    for sku, name, category, price in PRODUCTS:
        product, new = await get_or_create(
            session,
            Product,
            sku=sku,
            defaults={
                "name": name,
                "category": category,
                "price": price,
            },
        )
        products[sku] = product
        count(new)

    for shelf_name, zone_name, skus, rect in SHELVES:
        shelf, new = await get_or_create(
            session,
            Shelf,
            store_id=store.id,
            name=shelf_name,
            defaults={
                "zone_id": zones[zone_name].id,
                "position": {"type": "polygon",
                             "points": [{"x": rect[0], "y": rect[1]}, {"x": rect[2], "y": rect[1]},
                                        {"x": rect[2], "y": rect[3]}, {"x": rect[0], "y": rect[3]}]},
            },
        )
        count(new)
        for sku in skus:
            _, new = await get_or_create(
                session,
                ShelfProduct,
                store_id=store.id,
                shelf_id=shelf.id,
                product_id=products[sku].id,
                defaults={"expected_quantity": 12},
            )
            count(new)

    permissions: dict[PermissionCode, Permission] = {}
    for code in PermissionCode:
        perm, new = await get_or_create(
            session,
            Permission,
            code=code,
            defaults={"name": code.value.replace("_", " ").title()},
        )
        permissions[code] = perm
        count(new)

    roles: dict[RoleCode, Role] = {}
    for code in RoleCode:
        role, new = await get_or_create(
            session,
            Role,
            code=code,
            defaults={
                "name": code.value.replace("_", " ").title(),
                "description": f"Role: {code.value}",
            },
        )
        roles[code] = role
        count(new)

    for code, perms in ROLE_PERMISSIONS.items():
        for perm_code in perms:
            _, new = await get_or_create(
                session,
                RolePermission,
                role_id=roles[code].id,
                permission_id=permissions[perm_code].id,
            )
            count(new)

    for username, full_name, role_code, store_name in USERS:
        user, new = await get_or_create(session, User, username=username, defaults={"full_name": full_name})
        count(new)
        store_id = store.id if store_name else None
        _, new = await get_or_create(
            session,
            UserRole,
            user_id=user.id,
            role_id=roles[role_code].id,
            store_id=store_id,
        )
        count(new)

    return stats


async def reset(session: AsyncSession) -> None:
    """Empty every table so the seed can be re-applied from scratch.

    Uses ordered ``DELETE`` instead of ``TRUNCATE ... CASCADE``: on this
    PostgreSQL 18 install, cascading TRUNCATE was observed to wedge
    indefinitely (no waits, pure spin) even on tiny tables — DELETE is fast,
    lock-friendly (row-level), and fails loudly instead of hanging.
    """
    from app.db.session import Base

    for table in reversed(Base.metadata.sorted_tables):
        await session.execute(text(f'DELETE FROM "{table.name}"'))
    await session.commit()


async def main() -> None:
    reset_first = "--reset" in sys.argv
    async with get_session_maker()() as session:
        if reset_first:
            await reset(session)
        stats = await seed(session)
        await session.commit()
    print(
        f"Seed complete: store={STORE['name']} | "
        f"zones={len(ZONES)} cameras={len(CAMERAS) + 1} products={len(PRODUCTS)} "
        f"roles={len(RoleCode)} users={len(USERS)} | "
        f"created={stats['created']} reused={stats['existing']}"
    )


if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from sqlalchemy import select
from app.db.session import get_session_maker
from app.models import Zone, Camera

async def test_db():
    async with get_session_maker()() as session:
        zones = (await session.scalars(select(Zone))).all()
        cams = (await session.scalars(select(Camera).order_by(Camera.name))).all()
        
        z_out = [
            {"id": z.id, "name": z.name,
             "type": z.zone_type.value if hasattr(z.zone_type, "value") else str(z.zone_type),
             "polygon": ((z.bounds or {}).get("points") if z.bounds else [])}
            for z in zones
        ]
        print("Z OUT", z_out)
        
        c_out = [
            {"id": c.id, "name": c.name,
             "status": c.status.value if hasattr(c.status, "value") else str(c.status),
             "map_x": c.map_x, "map_y": c.map_y,
             "facing": c.facing_direction, "fov": c.field_of_view}
            for c in cams
        ]
        print("C OUT", c_out)

if __name__ == "__main__":
    asyncio.run(test_db())

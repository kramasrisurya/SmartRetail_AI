import asyncio
from app.db.session import get_session_maker
from app.models import Zone, Camera
from sqlalchemy import select

async def main():
    try:
        session_maker = get_session_maker()
        async with session_maker() as session:
            zones = (await session.scalars(select(Zone))).all()
            print("Zones:", [z.name for z in zones])
            
            cams = (await session.scalars(select(Camera))).all()
            print("Cameras:", [c.name for c in cams])
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())

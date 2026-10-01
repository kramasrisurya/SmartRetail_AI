"""Aggregates all v1 routers."""

from fastapi import APIRouter

from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.camera_relationships import camera_relationships_router
from app.api.v1.endpoints.cameras import cameras_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.event_graph import router as event_graph_router
from app.api.v1.endpoints.events import router as events_router
from app.api.v1.endpoints.journeys import router as journeys_router
from app.api.v1.endpoints.persons import router as persons_router
from app.api.v1.endpoints.product_states import router as product_states_router
from app.api.v1.endpoints.products import router as products_router
from app.api.v1.endpoints.reports import router as reports_router
from app.api.v1.endpoints.risk_pos import router as risk_pos_router
from app.api.v1.endpoints.spatial import router as spatial_router
from app.api.v1.endpoints.stores import stores_router
from app.api.v1.endpoints.system import system_router
from app.api.v1.endpoints.tracks import router as tracks_router

api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(dashboard_router)
api_router.include_router(cameras_router)
api_router.include_router(camera_relationships_router)
api_router.include_router(stores_router)
api_router.include_router(tracks_router)
api_router.include_router(products_router)
api_router.include_router(events_router)
api_router.include_router(spatial_router)
api_router.include_router(event_graph_router)
api_router.include_router(product_states_router)
api_router.include_router(persons_router)
api_router.include_router(journeys_router)
api_router.include_router(risk_pos_router)
api_router.include_router(analytics_router)
api_router.include_router(reports_router)

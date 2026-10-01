"""Root-level system endpoints, mounted without an API version prefix."""

from fastapi import APIRouter

from app.api.v1.endpoints.system import health, version

root_router = APIRouter(tags=["system"])
root_router.add_api_route("/health", health, methods=["GET"], summary="Dependency health check")
root_router.add_api_route("/version", version, methods=["GET"], summary="Running build version")

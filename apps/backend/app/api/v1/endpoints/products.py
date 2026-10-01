"""Product catalog CRUD + product-detection persistence endpoints (Phase 6).

The catalog is the identification ground truth: the Phase 6 service precomputes
reference embeddings from these rows. Detection writes come batched from the
service; reads back the dashboard and later interaction logic (Phase 7).
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.schemas.products import (
    ProductCreate,
    ProductDetectionBatch,
    ProductDetectionBatchResult,
    ProductDetectionRead,
    ProductImageCreate,
    ProductImageRead,
    ProductListResult,
    ProductRead,
    ProductUpdate,
)
from app.db.session import get_db
from app.models import Camera, Product, ProductDetection, ProductImage

router = APIRouter()


# --- catalog CRUD -------------------------------------------------------------

@router.get("/products", response_model=ProductListResult)
async def list_products(
    category: str | None = Query(default=None, description="Exact category filter"),
    sku: str | None = Query(default=None, description="Exact SKU lookup"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> ProductListResult:
    conditions = []
    if category:
        conditions.append(Product.category == category)
    if sku:
        conditions.append(Product.sku == sku)

    count_stmt = select(func.count()).select_from(Product)
    items_stmt = select(Product).options(selectinload(Product.images))
    if conditions:
        count_stmt = count_stmt.where(*conditions)
        items_stmt = items_stmt.where(*conditions)

    total = await session.scalar(count_stmt)
    rows = (
        await session.scalars(
            items_stmt.order_by(Product.sku).offset((page - 1) * page_size).limit(page_size)
        )
    ).unique().all()
    return ProductListResult(
        items=[_to_read(p) for p in rows],
        pagination={"page": page, "page_size": page_size, "total": int(total or 0),
                    "pages": max(1, -(-(total or 0) // page_size))},
    )


def _to_read(p: Product) -> ProductRead:
    return ProductRead(
        id=p.id,
        sku=p.sku,
        name=p.name,
        category=p.category,
        price=p.price,
        image_reference=p.image_reference,
        images=[
            ProductImageRead(id=i.id, image_reference=i.image_reference, weight=i.weight,
                             source=i.source, created_at=i.created_at)
            for i in p.images
        ],
    )


@router.post("/products", response_model=ProductRead, status_code=201)
async def create_product(body: ProductCreate, session: AsyncSession = Depends(get_db)) -> ProductRead:
    existing = await session.scalar(select(Product).where(Product.sku == body.sku))
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"SKU {body.sku} already exists")
    product = Product(
        sku=body.sku, name=body.name, category=body.category, price=body.price,
        image_reference=body.image_reference,
    )
    for img in body.images:
        product.images.append(ProductImage(**img.model_dump()))
    session.add(product)
    await session.commit()
    # Re-select with images eager-loaded (post-commit refresh would lazy-load
    # outside the greenlet and explode with MissingGreenlet).
    loaded = (
        await session.scalars(
            select(Product).options(selectinload(Product.images)).where(Product.id == product.id)
        )
    ).unique().first()
    return _to_read(loaded)


async def _get_loaded_product(session: AsyncSession, product_id: int) -> Product | None:
    return (
        await session.scalars(
            select(Product).options(selectinload(Product.images)).where(Product.id == product_id)
        )
    ).unique().first()


@router.get("/products/{product_id}", response_model=ProductRead)
async def get_product(product_id: int, session: AsyncSession = Depends(get_db)) -> ProductRead:
    product = await _get_loaded_product(session, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} does not exist")
    return _to_read(product)


@router.patch("/products/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int, body: ProductUpdate, session: AsyncSession = Depends(get_db)
) -> ProductRead:
    product = await _get_loaded_product(session, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} does not exist")
    for field_name, value in body.model_dump(exclude_unset=True).items():
        setattr(product, field_name, value)
    await session.commit()
    loaded = await _get_loaded_product(session, product_id)
    return _to_read(loaded)


@router.post("/products/{product_id}/images", response_model=ProductImageRead, status_code=201)
async def add_product_image(
    product_id: int, body: ProductImageCreate, session: AsyncSession = Depends(get_db)
) -> ProductImage:
    if await session.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} does not exist")
    image = ProductImage(product_id=product_id, **body.model_dump())
    session.add(image)
    await session.commit()
    await session.refresh(image)
    return image


@router.delete("/products/{product_id}/images/{image_id}", status_code=204)
async def delete_product_image(
    product_id: int, image_id: int, session: AsyncSession = Depends(get_db)
) -> None:
    image = await session.get(ProductImage, image_id)
    if image is None or image.product_id != product_id:
        raise HTTPException(status_code=404, detail="Image does not belong to this product")
    await session.delete(image)
    await session.commit()


# --- detections -----------------------------------------------------------------


async def _resolve_camera(session: AsyncSession, camera_cache: dict[int, Camera], camera_id: int) -> Camera:
    camera = camera_cache.get(camera_id)
    if camera is None:
        camera = await session.get(Camera, camera_id)
        if camera is None or camera.status.value == "removed":
            raise HTTPException(status_code=404, detail=f"Camera {camera_id} does not exist")
        camera_cache[camera_id] = camera
    return camera


@router.post("/product-detections/batch", response_model=ProductDetectionBatchResult)
async def apply_detection_batch(
    batch: ProductDetectionBatch, session: AsyncSession = Depends(get_db)
) -> ProductDetectionBatchResult:
    """Persist a flush of product sightings (identified or honestly unidentified)."""
    written = identified = unidentified = unknown_skus = 0
    skus = {op.sku for op in batch.ops if op.sku}
    catalog: dict[str, int] = {}
    if skus:
        rows = (await session.scalars(select(Product).where(Product.sku.in_(skus)))).all()
        catalog = {p.sku: p.id for p in rows}
    camera_cache: dict[int, Camera] = {}
    for op in batch.ops:
        camera = await _resolve_camera(session, camera_cache, op.camera_id)
        product_id: int | None = None
        if op.sku:
            product_id = catalog.get(op.sku)
            if product_id is None:
                unknown_skus += 1
        session.add(
            ProductDetection(
                store_id=camera.store_id,
                camera_id=camera.id,
                product_id=product_id,
                detected_at=op.ts,
                bounding_box={"xyxy": op.bbox} if op.bbox else {},
                confidence=op.confidence,
            )
        )
        written += 1
        if product_id is not None:
            identified += 1
        else:
            unidentified += 1
    await session.commit()
    return ProductDetectionBatchResult(
        written=written, identified=identified, unidentified=unidentified, unknown_skus=unknown_skus
    )


@router.get("/cameras/{camera_id}/products/detected", response_model=list[ProductDetectionRead])
async def list_camera_detections(
    camera_id: int,
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
    identified_only: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=1000),
    session: AsyncSession = Depends(get_db),
) -> list[ProductDetectionRead]:
    camera = await session.get(Camera, camera_id)
    if camera is None or camera.status.value == "removed":
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} does not exist")
    q = select(ProductDetection).where(ProductDetection.camera_id == camera_id)
    if start is not None:
        q = q.where(ProductDetection.detected_at >= start)
    if end is not None:
        q = q.where(ProductDetection.detected_at <= end)
    if identified_only:
        q = q.where(ProductDetection.product_id.is_not(None))
    rows = (await session.scalars(q.order_by(ProductDetection.detected_at.desc()).limit(limit))).all()
    return [
        ProductDetectionRead(
            id=d.id,
            store_id=d.store_id,
            camera_id=d.camera_id,
            product_id=d.product_id,
            detected_at=d.detected_at,
            bounding_box=d.bounding_box,
            confidence=d.confidence,
        )
        for d in rows
    ]

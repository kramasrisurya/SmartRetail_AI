"""Products, product detections, product state machine, carts, and shelves."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Numeric, String, UniqueConstraint, text
from sqlalchemy.types import JSON as JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import CartStatus, CartType, ProductState, pg_enum
from app.models.mixins import IdMixin, StoreScopedMixin, TimestampMixin


class Product(IdMixin, TimestampMixin, Base):
    """Catalog entry (SKU-level), shared across stores.

    ``image_reference`` is an object-storage key/URL for the primary image;
    additional reference images live in :class:`ProductImage`. Detection/
    recognition phases resolve observed product instances back to these
    catalog rows.
    """

    __tablename__ = "products"

    sku: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    image_reference: Mapped[str | None] = mapped_column(String(500), nullable=True)

    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class ProductImage(IdMixin, TimestampMixin, Base):
    """A reference image for a catalog product (visual identification, Phase 6).

    Multiple references per SKU improve embedding-based matching robustness
    (angles/lighting). ``weight`` lets operators mark preferred references;
    embeddings are precomputed over all references at index-build time.
    """

    __tablename__ = "product_images"

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_reference: Mapped[str] = mapped_column(String(500), nullable=False)
    weight: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("1.0"))
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)

    product: Mapped[Product] = relationship(back_populates="images")


class ProductDetection(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A single observed product instance in a camera/frame.

    ``product_id`` is NULL until recognition resolves the instance to a catalog
    SKU. Once ownership association runs, the instance is additionally linked to
    the responsible ``person_id`` and ``track_id`` (nullable until resolved).
    """

    __tablename__ = "product_detections"

    camera_id: Mapped[int] = mapped_column(
        ForeignKey("cameras.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    track_id: Mapped[int | None] = mapped_column(
        ForeignKey("tracks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    bounding_box: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)


class ProductState(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """Product state-machine interval (state history, §19/§102).

    One row per state interval: ``entered_at`` marks when the product entered
    this state and ``exited_at`` (NULL while current) marks the transition out.
    The full ordered history is therefore queryable, not just current state.
    """

    __tablename__ = "product_states"

    product_detection_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_detections.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    camera_id: Mapped[int | None] = mapped_column(
        ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True, index=True
    )
    state: Mapped[ProductState] = mapped_column(
        pg_enum(ProductState, "product_state"), nullable=False, index=True
    )
    entered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    exited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))


class Cart(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A first-class shopping cart or basket (§14).

    Treated as an entity that products and people interact with; ownership is
    established when a person is associated. ``current_zone_id`` tracks where
    the cart last was.
    """

    __tablename__ = "carts"

    cart_type: Mapped[CartType] = mapped_column(
        pg_enum(CartType, "cart_type"), nullable=False, server_default=CartType.CART.value
    )
    status: Mapped[CartStatus] = mapped_column(
        pg_enum(CartStatus, "cart_status"),
        nullable=False,
        server_default=CartStatus.ACTIVE.value,
        index=True,
    )
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True
    )
    camera_id: Mapped[int | None] = mapped_column(
        ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True, index=True
    )
    zone_id: Mapped[int | None] = mapped_column(
        ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    first_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )


class Shelf(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """A physical shelf/gondola that products are expected on.

    The expected product set is captured in :class:`ShelfProduct`; comparing
    observed vs. expected contents powers misplacement and discrepancy detection
    (Phase 16).
    """

    __tablename__ = "shelves"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    zone_id: Mapped[int | None] = mapped_column(
        ForeignKey("zones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    position: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="active")

    expected_products: Mapped[list["ShelfProduct"]] = relationship(
        back_populates="shelf", cascade="all, delete-orphan"
    )


class ShelfProduct(IdMixin, TimestampMixin, StoreScopedMixin, Base):
    """Expected product set for a shelf (with expected quantity).

    Serves as the baseline for shelf-monitoring/discrepancy logic.
    """

    __tablename__ = "shelf_products"
    __table_args__ = (
        UniqueConstraint("shelf_id", "product_id", name="uq_shelf_products_shelf_product"),
    )

    shelf_id: Mapped[int] = mapped_column(
        ForeignKey("shelves.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    expected_quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    shelf: Mapped[Shelf] = relationship(back_populates="expected_products")

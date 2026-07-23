"""Insert 19 curated test items for the dev user.

Two-step usage: `scripts/download_test_items.sh` grabs the PNGs into the
storage volume, then this script inserts DB rows pointing at them. Run
this file from inside the backend container so it picks up the app's
SQLAlchemy config:

    docker cp scripts/seed_test_items.py wardrobe_backend:/tmp/seed.py
    docker exec wardrobe_backend python /tmp/seed.py

Idempotent: deletes any prior "miaur-" seed items for this user before inserting.
"""

import asyncio
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.item import ClothingItem, ItemStatus, TaggedBy, TaggingStatus

USER_ID = UUID("99571cf5-f0f5-409c-85de-d9ba717f2305")

# (slug, type, name, primary_color, colors, tags, style, formality, season, brand, material)
ITEMS = [
    # Tops (4)
    ("miaur-tshirt-black-oversized", "t-shirt", "Camiseta oversized negra",
     "black", ["black"], {"fit": "oversized", "neckline": "crew"},
     ["minimal", "street"], "casual", ["spring", "summer", "autumn"], "Miaur Basics", "cotton"),
    ("miaur-polo-cream-classic", "polo", "Polo crema clásico",
     "beige", ["beige", "cream"], {"fit": "regular", "collar": "polo"},
     ["preppy", "classic"], "smart-casual", ["spring", "autumn"], "Fred Perry", "cotton-piqué"),
    ("miaur-sweater-cable-cream", "sweater", "Jersey ochos crema",
     "beige", ["beige", "cream"], {"knit": "cable", "fit": "regular"},
     ["classic", "cozy"], "casual", ["autumn", "winter"], "Uniqlo", "wool"),
    ("miaur-sweater-burgundy", "sweater", "Jersey burgundy oversized",
     "red", ["burgundy", "red"], {"knit": "chunky", "fit": "oversized"},
     ["romantic", "cozy"], "casual", ["autumn", "winter"], "COS", "wool-blend"),
    # Bottoms (4)
    ("miaur-jeans-wide-leg-blue", "jeans", "Jeans wide leg tiro alto",
     "blue", ["blue", "denim"], {"fit": "wide-leg", "rise": "high"},
     ["y2k", "relaxed"], "casual", ["spring", "autumn", "winter"], "Miss Sixty", "denim"),
    ("miaur-jeans-black-skinny", "jeans", "Jeans skinny negros",
     "black", ["black"], {"fit": "skinny", "rise": "mid"},
     ["edgy", "versatile"], "smart-casual", ["autumn", "winter", "spring"], "AGolde", "stretch-denim"),
    ("miaur-jeans-white-cropped", "jeans", "Jeans blancos cropped",
     "white", ["white"], {"fit": "straight", "length": "cropped"},
     ["fresh", "summer"], "casual", ["spring", "summer"], "Levi's", "denim"),
    ("miaur-leggings-black-textured", "pants", "Leggings negros textura",
     "black", ["black"], {"fit": "leggings", "material": "textured"},
     ["athleisure", "sculptural"], "casual", ["autumn", "winter"], "Nike", "poly-spandex"),
    # Dresses (3)
    ("miaur-dress-slip-black", "dress", "Vestido lencero negro",
     "black", ["black"], {"length": "midi", "neckline": "cowl"},
     ["minimal", "sensual"], "date", ["spring", "summer", "autumn"], "Reformation", "satin"),
    ("miaur-dress-red-cocktail", "dress", "Vestido rojo cocktail",
     "red", ["red"], {"length": "midi", "silhouette": "fit-and-flare"},
     ["romantic", "statement"], "party", ["spring", "summer", "autumn"], "Rixo", "silk-blend"),
    ("miaur-kimono-floral", "dress", "Kimono flores estampado",
     "multi", ["black", "red", "green"], {"style": "kimono", "print": "floral"},
     ["artisanal", "layering"], "smart-casual", ["spring", "summer"], "vintage", "silk"),
    # Outerwear (3)
    ("miaur-jacket-denim-blue", "jacket", "Chaqueta denim clásica",
     "blue", ["blue", "denim"], {"style": "trucker", "fit": "boxy"},
     ["classic", "versatile"], "casual", ["spring", "autumn"], "Levi's", "denim"),
    ("miaur-coat-camel-long", "coat", "Abrigo camel largo",
     "beige", ["camel", "beige"], {"length": "long", "silhouette": "wrap"},
     ["elegant", "timeless"], "smart-casual", ["autumn", "winter"], "Max Mara", "wool"),
    ("miaur-leather-jacket-black", "jacket", "Cazadora cuero negra",
     "black", ["black"], {"material": "leather", "style": "biker"},
     ["edgy", "punk"], "casual", ["spring", "autumn", "winter"], "AllSaints", "leather"),
    # Shoes (3)
    ("miaur-boots-black-combat", "boots", "Botas combat negras",
     "black", ["black"], {"style": "combat", "shaft": "ankle"},
     ["punk", "utility"], "casual", ["autumn", "winter", "spring"], "Dr. Martens", "leather"),
    ("miaur-heels-red-louboutin", "shoes", "Tacones rojos statement",
     "red", ["red"], {"style": "pumps", "heel-height": "high"},
     ["statement", "romantic"], "party", ["all"], "Louboutin", "patent-leather"),
    ("miaur-sneakers-converse-white", "sneakers", "Converse blancas altas",
     "white", ["white"], {"style": "high-top", "material": "canvas"},
     ["y2k", "sporty"], "casual", ["spring", "summer", "autumn"], "Converse", "canvas"),
    # Accessories (2)
    ("miaur-bag-black-crossbody", "bag", "Bolso crossbody negro",
     "black", ["black"], {"style": "crossbody", "size": "medium"},
     ["minimal", "everyday"], "casual", ["all"], "COS", "leather"),
    ("miaur-hat-cream-fedora", "hat", "Fedora crema",
     "beige", ["beige", "cream"], {"style": "fedora"},
     ["romantic", "editorial"], "smart-casual", ["spring", "summer", "autumn"], "Lack of Color", "wool-felt"),
]


async def seed(session: AsyncSession) -> None:
    # Idempotent: wipe any prior "miaur-" seed rows for this user so re-running
    # doesn't duplicate. Uses the image_path prefix as the natural key.
    prefix = f"{USER_ID}/miaur-"
    existing = await session.execute(
        select(ClothingItem).where(
            ClothingItem.user_id == USER_ID,
            ClothingItem.image_path.like(f"{prefix}%"),
        )
    )
    old_ids = [row.id for row in existing.scalars().all()]
    if old_ids:
        await session.execute(delete(ClothingItem).where(ClothingItem.id.in_(old_ids)))
        print(f"Removed {len(old_ids)} previous miaur- seed items")

    now = datetime.now(UTC)
    for entry in ITEMS:
        (
            slug, item_type, name, primary_color, colors, tags,
            style, formality, season, brand, material,
        ) = entry
        rel_path = f"{USER_ID}/{slug}.png"
        item = ClothingItem(
            id=uuid4(),
            user_id=USER_ID,
            image_path=rel_path,
            thumbnail_path=rel_path,
            medium_path=rel_path,
            original_image_path=rel_path,
            type=item_type,
            name=name,
            primary_color=primary_color,
            colors=colors,
            tags=tags,
            style=style,
            formality=formality,
            season=season,
            material=material,
            brand=brand,
            status=ItemStatus.ready,
            tagging_status=TaggingStatus.tagged,
            tagged_by=TaggedBy.manual,
            tagged_at=now,
            ai_processed=False,
            ai_confidence=Decimal("0.99"),
            wear_count=0,
            wears_since_wash=0,
            needs_wash=False,
            favorite=False,
            is_archived=False,
        )
        session.add(item)
    await session.commit()
    print(f"Inserted {len(ITEMS)} items for user {USER_ID}")


async def main() -> None:
    async with async_session_maker() as session:
        await seed(session)


if __name__ == "__main__":
    asyncio.run(main())

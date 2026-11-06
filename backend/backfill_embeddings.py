
from database import SessionLocal
from models import Item
from embedding_service import generate_item_embedding


def backfill_embeddings():
    db = SessionLocal()

    try:
        items = db.query(Item).filter(
            Item.embedding.is_(None)
        ).all()

        print(f"Found {len(items)} items without embeddings.")

        for item in items:
            item.embedding = generate_item_embedding(
                title=item.title,
                description=item.description or "",
                category=item.category or "",
                location=item.location or ""
            )

            print(f"Embedding generated for: {item.title}")

        db.commit()

        print("\nAll missing embeddings generated successfully!")

    except Exception as e:
        db.rollback()
        print("Error generating embeddings:", e)

    finally:
        db.close()


if __name__ == "__main__":
    backfill_embeddings()

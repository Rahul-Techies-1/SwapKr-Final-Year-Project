
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Item, User
from schemas import (
    ItemCreate,
    ItemUpdate,
    ItemResponse,
    UserCreate,
    UserResponse,
    UserLogin,
    TokenResponse,
    SellerContactResponse
)
from storage import upload_item_image
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from embedding_service import generate_item_embedding, generate_embedding


app = FastAPI(title="ReCampus API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {"message": "Welcome to ReCampus API"}


@app.get("/health")
def health_check():
    return {"status": "ReCampus backend is running"}


# Signup
@app.post("/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered"
        )

    new_user = User(
        name=user.name,
        email=user.email,
        password=hash_password(user.password),
        college=user.college,
        phone_number=user.phone_number
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# Login
@app.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not existing_user or not verify_password(
        user.password, existing_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(existing_user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# Current user profile
@app.get("/me", response_model=UserResponse)
def get_my_profile(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User account not found"
        )

    return current_user


# Get all available marketplace items
@app.get("/items", response_model=list[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).filter(
        Item.is_available == True
    ).all()


# AI Semantic Search
@app.get("/items/semantic-search", response_model=list[ItemResponse])
def semantic_search(
    q: str = Query(..., min_length=2, max_length=200),
    db: Session = Depends(get_db)
):
    try:
        # Generate embedding for the search query
        query_embedding = generate_embedding(q)

        # Find the closest matching item embeddings
        results = db.query(Item).filter(
            Item.is_available == True,
            Item.embedding.is_not(None)
        ).order_by(
            Item.embedding.cosine_distance(query_embedding)
        ).limit(10).all()

        return results

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="AI search is temporarily unavailable."
        )


# AI-Powered Similar Items Recommendation
@app.get(
    "/items/{item_id}/similar",
    response_model=list[ItemResponse]
)
def get_similar_items(
    item_id: int,
    db: Session = Depends(get_db)
):
    # Find the item selected by the student
    selected_item = db.query(Item).filter(
        Item.id == item_id,
        Item.is_available == True
    ).first()

    if not selected_item:
        raise HTTPException(
            status_code=404,
            detail="Item not found or no longer available"
        )

    # Recommendations require an existing embedding
    if selected_item.embedding is None:
        return []

    try:
        # Find the most semantically similar available items
        similar_items = db.query(Item).filter(
            Item.is_available == True,
            Item.embedding.is_not(None),
            Item.id != item_id
        ).order_by(
            Item.embedding.cosine_distance(
                selected_item.embedding
            )
        ).limit(4).all()

        return similar_items

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Similar item recommendations are temporarily unavailable."
        )




# Get seller contact details
@app.get(
    "/items/{item_id}/seller-contact",
    response_model=SellerContactResponse
)
def get_seller_contact(
    item_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.is_available == True
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found or no longer available"
        )

    if item.owner_id == user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot contact yourself"
        )

    seller = db.query(User).filter(
        User.id == item.owner_id
    ).first()

    if not seller or not seller.phone_number:
        raise HTTPException(
            status_code=404,
            detail="Seller has not added a WhatsApp number"
        )

    return {
        "name": seller.name,
        "phone_number": seller.phone_number
    }


# Get logged-in user's listings
@app.get("/my-listings", response_model=list[ItemResponse])
def get_my_listings(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Item).filter(
        Item.owner_id == user_id
    ).all()


# Create a listing with AI embedding
@app.post("/items", response_model=ItemResponse)
def create_item(
    item: ItemCreate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User account not found"
        )

    try:
        item_embedding = generate_item_embedding(
            title=item.title,
            description=item.description or "",
            category=item.category or "",
            location=item.location or ""
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="AI embedding generation failed. Please try again."
        )

    new_item = Item(
        **item.model_dump(),
        owner_id=user_id,
        embedding=item_embedding
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item


# Update an existing listing
@app.put("/items/{item_id}", response_model=ItemResponse)
def update_item(
    item_id: int,
    item_data: ItemUpdate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.owner_id == user_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found or you don't have permission to edit it"
        )

    update_data = item_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least one field to update"
        )

    if "title" in update_data and (
        update_data["title"] is None or not update_data["title"].strip()
    ):
        raise HTTPException(
            status_code=422,
            detail="Item title cannot be empty"
        )

    if "price" in update_data and update_data["price"] is None:
        raise HTTPException(
            status_code=422,
            detail="Price cannot be empty"
        )

    semantic_fields = {
        "title",
        "description",
        "category",
        "location"
    }

    try:
        for field, value in update_data.items():
            setattr(item, field, value)

        # Regenerate embedding only when searchable details change
        if semantic_fields.intersection(update_data.keys()):
            item.embedding = generate_item_embedding(
                title=item.title,
                description=item.description or "",
                category=item.category or "",
                location=item.location or ""
            )

        db.commit()
        db.refresh(item)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Unable to update listing or generate its AI embedding."
        )

    return item


# Upload item image
@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    allowed_types = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed"
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Please select an image"
        )

    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image size must be less than 5 MB"
        )

    try:
        image_url = upload_item_image(
            file_bytes=image_bytes,
            content_type=file.content_type,
            extension=allowed_types[file.content_type]
        )

        return {
            "message": "Image uploaded successfully",
            "image_url": image_url
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Image upload failed: {str(e)}"
        )


# Delete a listing
@app.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(Item).filter(
        Item.id == item_id,
        Item.owner_id == user_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found or you don't have permission to delete it"
        )

    db.delete(item)
    db.commit()

    return {"message": "Item deleted successfully"}

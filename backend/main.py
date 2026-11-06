
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
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
    TokenResponse
)
from storage import upload_item_image
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

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
        college=user.college
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


# Get logged-in user's listings
@app.get("/my-listings", response_model=list[ItemResponse])
def get_my_listings(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Item).filter(
        Item.owner_id == user_id
    ).all()


# Create a listing
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

    new_item = Item(
        **item.model_dump(),
        owner_id=user_id
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

    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

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


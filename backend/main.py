from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Item
from schemas import ItemCreate, ItemResponse
from fastapi import UploadFile, File, HTTPException
from storage import upload_item_image
from fastapi import HTTPException
from models import User
from schemas import UserCreate, UserResponse

from auth import hash_password, verify_password, create_access_token
from schemas import UserLogin, TokenResponse

from auth import get_current_user

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

@app.post("/signup", response_model=UserResponse, status_code=201)
def signup(user: UserCreate, db: Session = Depends(get_db)):

    # Check whether email already exists
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered"
        )

    # Hash password
    hashed_password = hash_password(user.password)

    # Create new student
    new_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        college=user.college
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):

    # Find student by email
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    # Verify email and password
    if not existing_user or not verify_password(
        user.password, existing_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Generate JWT token
    access_token = create_access_token(existing_user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


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




# Get all marketplace items
@app.get("/items", response_model=list[ItemResponse])
def get_items(db: Session = Depends(get_db)):
    return db.query(Item).filter(Item.is_available == True).all()


@app.get("/my-listings", response_model=list[ItemResponse])
def get_my_listings(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch only the logged-in student's listings
    my_items = db.query(Item).filter(
        Item.owner_id == user_id
    ).all()

    return my_items



# Add a new marketplace item

@app.post("/items", response_model=ItemResponse)
def create_item(
    item: ItemCreate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify that the logged-in student exists
    current_user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User account not found"
        )

    # Automatically assign listing to logged-in student
    new_item = Item(
        **item.model_dump(),
        owner_id=user_id
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item


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
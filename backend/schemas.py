
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional


# Signup request
class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    college: str = Field(min_length=2, max_length=150)
    phone_number: str = Field(
        min_length=10,
        max_length=20,
        pattern=r"^\+?[0-9]{10,19}$"
    )


# Login request
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# User response (never return password)
class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    college: str
    phone_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Item creation
class ItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: float = 0
    image_url: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None


# Item response
class ItemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    is_available: bool

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    category: Optional[str] = None
    location: Optional[str] = None

# Seller contact response
class SellerContactResponse(BaseModel):
    name: str
    phone_number: str
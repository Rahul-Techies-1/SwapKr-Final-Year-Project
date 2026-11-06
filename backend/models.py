from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    ForeignKey
)

from sqlalchemy.orm import relationship

from database import Base


# Student/User table
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    email = Column(String(150), unique=True, nullable=False)

    password = Column(String(255), nullable=False)

    college = Column(String(150), nullable=False)

    items = relationship("Item", back_populates="owner")


# Marketplace items table
class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(150), nullable=False)

    description = Column(Text)

    price = Column(Float, default=0)

    image_url = Column(String(500))

    category = Column(String(100))

    location = Column(String(200))

    is_available = Column(Boolean, default=True)

    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="items")
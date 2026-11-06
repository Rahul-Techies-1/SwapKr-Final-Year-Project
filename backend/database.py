import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables from .env
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL")

DATABASE_URL = DATABASE_URL.replace(
    "postgresql://",
    "postgresql+psycopg://",
    1
)

# Create database engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Create session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for database models
Base = declarative_base()


# Test database connection
def test_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("Database connected successfully!")
            print("Result:", result.scalar())

    except Exception as e:
        print("Database connection failed!")
        print("Error:", e)


if __name__ == "__main__":
    test_connection()
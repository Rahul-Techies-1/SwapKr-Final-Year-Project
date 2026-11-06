from database import engine, Base
from models import User, Item

Base.metadata.create_all(bind=engine)

print("ReCampus database tables created successfully!")
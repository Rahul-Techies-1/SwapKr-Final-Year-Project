
import os
import uuid

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

BUCKET_NAME = "item-images"

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Supabase credentials are missing in .env")

if "/rest/v1" in SUPABASE_URL or "/storage/v1" in SUPABASE_URL:
    raise ValueError("Use the base Supabase Project URL only.")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def upload_item_image(file_bytes: bytes, content_type: str, extension: str):
    file_name = f"{uuid.uuid4()}.{extension}"

    result = supabase.storage.from_(BUCKET_NAME).upload(
        path=file_name,
        file=file_bytes,
        file_options={
            "content-type": content_type,
            "upsert": "false"
        }
    )

    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(
        file_name
    )

    return public_url


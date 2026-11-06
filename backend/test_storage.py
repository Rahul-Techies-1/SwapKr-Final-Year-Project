
from storage import upload_item_image

try:
    with open("test_image.png", "rb") as image:
        image_bytes = image.read()

    image_url = upload_item_image(
        file_bytes=image_bytes,
        content_type="image/png",
        extension="png"
    )

    print("Image uploaded successfully!")
    print("Image URL:", image_url)

except Exception as e:
    print("Upload failed!")
    print(repr(e))


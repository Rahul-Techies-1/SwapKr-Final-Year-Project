from embedding_service import generate_item_embedding

# Test item
embedding = generate_item_embedding(
    title="Comfortable mattress",
    description="Used hostel mattress in good condition",
    category="Furniture",
    location="Boys Hostel 3"
)

print("Embedding generated successfully!")
print("Vector dimensions:", len(embedding))
print("First 5 values:", embedding[:5])
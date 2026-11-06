from fastembed import TextEmbedding

# Lightweight embedding model
MODEL_NAME = "BAAI/bge-small-en-v1.5"

# Load model once when the service is initialized
embedding_model = TextEmbedding(
    model_name=MODEL_NAME
)


def generate_embedding(text: str) -> list[float]:
    """
    Generate a 384-dimensional embedding
    for the supplied text.
    """

    if not text or not text.strip():
        text = "No description available"

    embeddings = embedding_model.embed([text])

    embedding = next(embeddings)

    return embedding.tolist()


def generate_item_embedding(
    title: str,
    description: str = "",
    category: str = "",
    location: str = ""
) -> list[float]:
    """
    Generate an embedding using item details.
    """

    item_text = f"""
    Item: {title}
    Description: {description or ""}
    Category: {category or ""}
    Location: {location or ""}
    """

    return generate_embedding(item_text)
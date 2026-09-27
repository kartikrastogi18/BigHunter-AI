from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer


app = FastAPI(
    title="BugHunter AI Service",
    description="AI service for code investigation and debugging",
    version="0.1.0"
)


# Load embedding model once when the service starts
model = SentenceTransformer("all-MiniLM-L6-v2")


class EmbeddingRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {
        "success": True,
        "message": "BugHunter AI service is running"
    }


@app.post("/embed")
def generate_embedding(request: EmbeddingRequest):

    embedding = model.encode(
        request.text
    ).tolist()

    return {
        "success": True,
        "dimension": len(embedding),
        "embedding": embedding
    }
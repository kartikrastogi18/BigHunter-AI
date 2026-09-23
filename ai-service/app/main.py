from fastapi import FastAPI

app = FastAPI(
    title="BugHunter AI Service",
    description="AI service for code investigation and debugging",
    version="0.1.0"
)


@app.get("/health")
def health():
    return {
        "success": True,
        "message": "BugHunter AI service is running"
    }
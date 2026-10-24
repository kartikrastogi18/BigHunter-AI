import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai

# Load .env file from ai-service root
dotenv_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="BugHunter AI Service",
    description="AI service for code investigation and debugging",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini Client for bug reasoning & code fixes
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
GEMINI_MODEL = "gemini-2.5-flash"
FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.8-flash"]


import time

def generate_with_fallback(prompt: str, max_retries: int = 2) -> str:
    last_error = None
    for attempt in range(max_retries):
        for model_name in FALLBACK_MODELS:
            try:
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                return response.text
            except Exception as e:
                last_error = e
                print(f"⚠️ Model {model_name} attempt {attempt + 1} note: {e}")
                continue
        time.sleep(2)
    raise last_error

# Lazy-loaded local embedding model for RAG / code search
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Fast local cache load (0ms network request)
            try:
                _embedding_model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
            except Exception:
                _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="sentence-transformers is not installed. Run: pip install sentence-transformers"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to initialize embedding model: {str(e)}"
            )
    return _embedding_model


@app.on_event("startup")
def preload_models():
    try:
        get_embedding_model()
        print("✅ Local embedding model preloaded successfully")
    except Exception as e:
        print(f"⚠️ Embedding model preload note: {e}")


class EmbeddingRequest(BaseModel):
    text: str


class BugAnalysisRequest(BaseModel):
    code: str
    error_message: str | None = None
    language: str | None = None


class PatchRequest(BaseModel):
    code: str
    issue_description: str
    language: str | None = None


class TestGenerationRequest(BaseModel):
    code: str
    issue_description: str
    framework: str | None = None
    language: str | None = None


@app.get("/health")
def health():
    return {
        "success": True,
        "message": "BugHunter AI service is running",
        "gemini_configured": gemini_client is not None,
        "model": GEMINI_MODEL
    }


@app.post("/embed")
def generate_embedding(request: EmbeddingRequest):
    try:
        model = get_embedding_model()
        embedding = model.encode(request.text).tolist()
        return {
            "success": True,
            "dimension": len(embedding),
            "embedding": embedding
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding error: {str(e)}")


@app.post("/analyze-bug")
def analyze_bug(request: BugAnalysisRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured in .env")

    prompt = f"""You are an expert autonomous bug investigator for BugHunter AI.
Analyze the following code for bugs, logic errors, or potential crashes.

Language: {request.language or 'Auto-detect'}
Error Message / Symptoms: {request.error_message or 'None provided'}

Source Code:
```
{request.code}
```

Provide your analysis in the following structured format:
1. **Bug Identification**: What is the bug?
2. **Root Cause**: Why is it happening?
3. **Reproduction Test Scenario**: How to write a unit test to trigger this bug?
4. **Recommended Fix**: Step-by-step fix suggestion.
"""

    try:
        analysis_text = generate_with_fallback(prompt)
        return {
            "success": True,
            "analysis": analysis_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-patch")
def generate_patch(request: PatchRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured in .env")

    prompt = f"""You are an autonomous code repair agent for BugHunter AI.
Fix the bug in the provided code according to the issue description.

Language: {request.language or 'Auto-detect'}
Issue Description: {request.issue_description}

Original Code:
```
{request.code}
```

Instructions:
1. Provide the complete corrected code.
2. Explain the key changes you made.
"""

    try:
        patch_text = generate_with_fallback(prompt)
        return {
            "success": True,
            "patch": patch_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-test")
def generate_test(request: TestGenerationRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured in .env")

    framework_hint = (
        f"Use {request.framework} testing framework."
        if request.framework
        else "Auto-select appropriate framework (e.g. pytest for Python, jest for JavaScript/TypeScript)."
    )

    prompt = f"""You are an autonomous QA & Reproduction Test Engineer for BugHunter AI.
Your objective is to generate an executable reproduction unit test for the reported bug.

Bug Description: {request.issue_description}
Language: {request.language or 'Auto-detect'}
Testing Framework Requirement: {framework_hint}

Source Code:
```
{request.code}
```

Instructions:
1. Generate a self-contained, fully executable test script.
2. The test MUST fail on the original buggy code and pass once the bug is resolved.
3. Include all necessary imports, mocks (if required), and test assertions.
4. Format your response cleanly:
   - **Test File Name**: (e.g. `test_reproduction.py` or `reproduction.test.js`)
   - **Run Command**: (e.g. `pytest test_reproduction.py` or `npm test`)
   - **Executable Test Code**:
   ```
   [Full runnable test code]
   ```
   - **Assertion Logic & Why It Fails On Buggy Code**: (concise explanation)
"""

    try:
        test_text = generate_with_fallback(prompt)
        return {
            "success": True,
            "test": test_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# Ensure UTF-8 stdout/stderr encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google import genai

# Load .env file from ai-service root
dotenv_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path)

from fastapi.middleware.cors import CORSMiddleware

try:
    from app.defect_model import defect_detector_service
except ImportError:
    from defect_model import defect_detector_service

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
                print(f"[WARN] Model {model_name} attempt {attempt + 1} note: {e}")
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
        print("[OK] Local embedding model preloaded successfully")
    except Exception as e:
        print(f"[WARN] Embedding model preload note: {e}")

    try:
        if defect_detector_service.load():
            print("[OK] CodeXGLUE PyTorch defect detector preloaded successfully")
        else:
            print("[INFO] CodeXGLUE defect checkpoint not found yet (train via training/train_defect_detector.py)")
    except Exception as e:
        print(f"[WARN] Defect model preload note: {e}")


class EmbeddingRequest(BaseModel):
    text: str


class DefectDetectionRequest(BaseModel):
    code: str


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
        "defect_model_loaded": defect_detector_service.load(),
        "model": GEMINI_MODEL
    }


@app.get("/defect-model-info")
def defect_model_info():
    return {
        "success": True,
        **defect_detector_service.get_info()
    }


@app.post("/detect-defect")
def detect_defect(request: DefectDetectionRequest):
    try:
        result = defect_detector_service.predict(request.code)
        return {
            "success": True,
            **result
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Defect detection error: {str(e)}")


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


import re

def extract_code_block(text: str) -> str:
    """Extracts the longest fenced code block from markdown output, or returns trimmed text."""
    matches = re.findall(r"```(?:[a-zA-Z0-9_\-\+]+)?\r?\n([\s\S]*?)```", text)
    if matches:
        return max(matches, key=len).strip()
    return text.strip()


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
1. Provide the complete corrected code inside a ```[language] block.
2. Explain the key changes you made.
"""

    try:
        patch_text = generate_with_fallback(prompt)
        clean_code = extract_code_block(patch_text)
        return {
            "success": True,
            "patch": patch_text,
            "cleanCode": clean_code
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
1. Generate a self-contained, fully executable test script inside a ```[language] code block.
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
        clean_test = extract_code_block(test_text)
        
        file_name_match = re.search(r"\*\*Test File Name\*\*:\s*`?([^\r\n`]+)`?", test_text)
        test_file_name = file_name_match.group(1).strip() if file_name_match else None

        return {
            "success": True,
            "test": test_text,
            "cleanTest": clean_test,
            "testFileName": test_file_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PRDescriptionRequest(BaseModel):
    issue_description: str
    analysis: str | None = None
    patch: str | None = None
    test: str | None = None
    repo_name: str | None = None


@app.post("/generate-pr-description")
def generate_pr_description(request: PRDescriptionRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured in .env")

    prompt = f"""You are an autonomous code maintainer for BugHunter AI.
Generate a concise, professional GitHub Pull Request Title and Description for a bug fix.

Repository: {request.repo_name or 'Repository'}
Issue / Bug Description: {request.issue_description}

Bug Analysis / Diagnosis:
{request.analysis or 'Not provided'}

Proposed Patch / Fix:
{request.patch or 'Not provided'}

Reproduction Test:
{request.test or 'Not provided'}

Output Format:
Return your response with two clear sections:

TITLE:
[A standard conventional commit title, e.g. fix(core): resolve negative discount calculation bug]

DESCRIPTION:
[A rich, structured Markdown PR body with:
- ## 📝 Summary of Changes
- ## 🔍 Root Cause Analysis
- ## 🛠️ Solution Details
- ## 🧪 Verification & Reproduction Tests
- ## 🤖 Generated by BugHunter AI]
"""

    try:
        response_text = generate_with_fallback(prompt)
        
        # Parse title and description
        title = "fix: autonomous bug resolution by BugHunter AI"
        description = response_text
        
        if "TITLE:" in response_text and "DESCRIPTION:" in response_text:
            parts = response_text.split("DESCRIPTION:", 1)
            title_part = parts[0].replace("TITLE:", "").strip()
            # Clean title of any markdown quotes or newlines
            first_line = title_part.splitlines()[0].strip().strip('"`')
            if first_line:
                title = first_line
            description = parts[1].strip()
        elif "TITLE:" in response_text:
            lines = response_text.splitlines()
            for line in lines:
                if line.startswith("TITLE:"):
                    title = line.replace("TITLE:", "").strip().strip('"`')
                    break

        return {
            "success": True,
            "title": title,
            "description": description
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class VerificationSynthRequest(BaseModel):
    buggy_code: str
    patched_code: str
    issue_description: str
    test_code: str | None = None
    language: str | None = None


@app.post("/synthesize-verification")
def synthesize_verification(request: VerificationSynthRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured in .env")

    prompt = f"""You are a Senior Automated Verification Engineer for BugHunter AI.
Your job is to prepare an isolated, executable verification harness to test BOTH the original buggy code and the patched code using the EXACT SAME test assertions.

Issue Description: {request.issue_description}
Requested Language Hint: {request.language or 'Auto-detect (javascript or python)'}
Optional Reference Test:
{request.test_code or 'None'}

--- ORIGINAL BUGGY CODE ---
```
{request.buggy_code}
```

--- PATCHED FIXED CODE ---
```
{request.patched_code}
```

CRITICAL RULES:
1. Detect the language: must be either "javascript" or "python".
2. Output `clean_buggy_code` and `clean_patched_code`:
   - Keep all function/class definitions intact.
   - REMOVE any top-level demo calls like `console.log(...)` or `print(...)` or `export ` / `export default ` keywords that might throw prematurely or break a standalone script scope.
3. Output `test_assertions`:
   - Do NOT redefine the functions/classes inside `test_assertions`. Assume `clean_buggy_code` or `clean_patched_code` is placed directly ABOVE `test_assertions` in the exact same file!
   - Do NOT use `require('./...')` or local file imports for the code under test.
   - For JavaScript: write tests using ONLY `test("description", () => {{ ... }})` and `expect(actual).toBe(expected)` / `.toEqual()` / `.toThrow()` / `.toBeTruthy()` / `.toBeFalsy()` / `.toBeGreaterThan()` / `.toBeLessThan()` / `.toBeNull()`.
   - For Python: write standalone functions named `def test_case_1(): ...` using `assert ...` (or `try/except` to verify exceptions).
   - Write 3 to 4 focused tests:
     * 1-2 normal/happy-path tests that PASS on both buggy and patched code.
     * 2 bug-reproduction tests specifically targeting the reported bug that MUST FAIL on `clean_buggy_code` and MUST PASS on `clean_patched_code` (matching the exact behavior/return value/exception of `clean_patched_code`).

Return ONLY valid JSON with no markdown wrapping outside the JSON object, matching this exact schema:
{{
  "language": "javascript" or "python",
  "clean_buggy_code": "...",
  "clean_patched_code": "...",
  "test_assertions": "..."
}}
"""

    try:
        raw_text = generate_with_fallback(prompt).strip()
        # Strip markdown ```json ... ``` fences if present
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw_text)
        json_str = json_match.group(1).strip() if json_match else raw_text

        parsed = json.loads(json_str)
        lang = str(parsed.get("language", "javascript")).lower().strip()
        if "py" in lang:
            lang = "python"
        else:
            lang = "javascript"

        return {
            "success": True,
            "language": lang,
            "clean_buggy_code": parsed.get("clean_buggy_code", request.buggy_code),
            "clean_patched_code": parsed.get("clean_patched_code", request.patched_code),
            "test_assertions": parsed.get("test_assertions", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to synthesize verification harness: {str(e)}")


class PythonSandboxRequest(BaseModel):
    code_under_test: str
    test_assertions: str


@app.post("/execute-python-sandbox")
def execute_python_sandbox(request: PythonSandboxRequest):
    runner_footer = """
import json as _bh_json
import traceback as _bh_tb
import sys as _bh_sys

_bh_results = []
_bh_all_passed = True

for _bh_name, _bh_fn in list(globals().items()):
    if _bh_name.startswith("test_") and callable(_bh_fn):
        try:
            _bh_fn()
            _bh_results.append({"name": _bh_name, "passed": True, "error": None})
        except Exception as _bh_exc:
            _bh_all_passed = False
            _bh_results.append({"name": _bh_name, "passed": False, "error": str(_bh_exc) or repr(_bh_exc)})

if not _bh_results:
    _bh_all_passed = False
    _bh_results.append({"name": "discovery", "passed": False, "error": "No test_* functions found"})

print("__BUGHUNTER_RESULTS__:" + _bh_json.dumps(_bh_results))
_bh_sys.exit(0 if _bh_all_passed else 1)
"""

    full_script = f"{request.code_under_test}\n\n{request.test_assertions}\n\n{runner_footer}"

    start_time = time.perf_counter()
    try:
        with tempfile.TemporaryDirectory(prefix="bughunter_py_") as tmp_dir:
            script_path = Path(tmp_dir) / "sandbox_test.py"
            script_path.write_text(full_script, encoding="utf-8")

            proc = subprocess.run(
                [sys.executable, str(script_path)],
                cwd=tmp_dir,
                capture_output=True,
                text=True,
                timeout=5
            )
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            test_results = []
            clean_stdout_lines = []
            for line in proc.stdout.splitlines():
                if line.startswith("__BUGHUNTER_RESULTS__:"):
                    try:
                        test_results = json.loads(line.replace("__BUGHUNTER_RESULTS__:", "", 1))
                    except Exception:
                        pass
                else:
                    clean_stdout_lines.append(line)

            return {
                "success": True,
                "passed": proc.returncode == 0,
                "exit_code": proc.returncode,
                "duration_ms": duration_ms,
                "stdout": "\n".join(clean_stdout_lines).strip(),
                "stderr": proc.stderr.strip(),
                "test_results": test_results
            }
    except subprocess.TimeoutExpired:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": True,
            "passed": False,
            "exit_code": 124,
            "duration_ms": duration_ms,
            "stdout": "",
            "stderr": "Sandbox execution timed out after 5000ms (possible infinite loop).",
            "test_results": [{"name": "timeout_guard", "passed": False, "error": "Execution timed out (5s limit)"}]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Python sandbox error: {str(e)}")
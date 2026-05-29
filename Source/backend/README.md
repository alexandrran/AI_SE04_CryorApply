# CryorApply Backend

FastAPI service for CV upload, text extraction, and AI feedback generation.

## Local Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

On Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Current Endpoints

- `GET /health` checks that the API is running.
- `POST /api/cv/review` accepts a CV file and returns mocked structured feedback.

The next implementation step is to replace the mock text extraction and mock AI
analysis with real PDF/DOCX parsing and an AI provider integration.

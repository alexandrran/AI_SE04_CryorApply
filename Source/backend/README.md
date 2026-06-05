# CryorApply Backend

FastAPI service for CV upload, text extraction, and structured CV feedback.

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
- `POST /api/cv/review` accepts a PDF or DOCX CV file and returns structured feedback.

## Current Processing Flow

1. The API receives a CV file through multipart form data.
2. The backend validates the file name, file type, and size.
3. PDF files are parsed with `pypdf`.
4. DOCX files are parsed with `python-docx`.
5. Extracted text is reviewed with rule-based prototype logic.
6. The API returns a JSON response with an overall score, category feedback, and next steps.

The next implementation step is to replace the rule-based feedback with an AI
provider integration while keeping the same response format for the frontend.

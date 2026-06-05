# CryorApply API Contract

## Base URL

Local development:

```text
http://localhost:8000
```

## Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

## Review CV

```http
POST /api/cv/review
Content-Type: multipart/form-data
```

Form fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `PDF` or `DOCX` file | Yes | CV uploaded by the user. Maximum size: 10 MB |

Processing:

1. Backend validates file name, type, and size.
2. PDF text is extracted with `pypdf`.
3. DOCX text is extracted with `python-docx`.
4. Extracted text is analyzed with rule-based prototype logic.
5. The response is returned as structured JSON for the frontend.

Response:

```json
{
  "filename": "student-cv.pdf",
  "overall_score": 74,
  "summary": "The CV has the main sections in place, but it should show more specific skills...",
  "feedback": [
    {
      "category": "Structure",
      "score": 78,
      "message": "The CV includes 3 of 4 expected sections: education, skills, experience, and projects.",
      "suggestions": [
        "Add a clear Projects section."
      ]
    }
  ],
  "next_steps": [
    "Add projects with technologies used, your role, and outcomes.",
    "Compare the CV with a target job description and add missing keywords."
  ]
}
```

## Error Responses

| Status | Reason |
|---|---|
| `400` | Missing file or unsupported file type |
| `413` | File is too large |
| `422` | CV text could not be extracted |
| `500` | Unexpected server error |

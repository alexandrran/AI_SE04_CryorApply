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
| `file` | `PDF` or `DOCX` file | Yes | CV uploaded by the user |

Response:

```json
{
  "filename": "student-cv.pdf",
  "overall_score": 76,
  "summary": "The CV has a workable structure for a junior candidate...",
  "feedback": [
    {
      "category": "Structure",
      "score": 82,
      "message": "The CV should be easy to scan...",
      "suggestions": [
        "Keep education, skills, projects, and experience as separate sections."
      ]
    }
  ],
  "next_steps": [
    "Add measurable project outcomes.",
    "Match keywords from the target job description."
  ]
}
```

## Planned Error Responses

| Status | Reason |
|---|---|
| `400` | Missing file or unsupported file type |
| `413` | File is too large |
| `422` | CV text could not be extracted |
| `500` | AI analysis failed |

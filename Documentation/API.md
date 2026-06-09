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
| `file` | `PDF` or `DOCX` file | No | CV uploaded by the user. Maximum size: 10 MB |
| `cv_text` | `string` | No | CV text pasted by the user. Required when no file is uploaded |
| `job_description` | `string` | No | Target role or internship description for job matching |

Processing:

1. Backend validates file name, type, and size.
2. PDF text is extracted with `pypdf`.
3. DOCX text is extracted with `python-docx`.
4. Extracted text is sent to Gemini when `GEMINI_API_KEY` is configured.
5. Gemini returns structured AI feedback, job matching, priority fixes, and rewrite suggestions.
6. If Gemini is unavailable or no API key is configured, the rule-based analyzer is used as a fallback.
7. The response is returned as structured JSON for the frontend.

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
  ],
  "priority_fixes": [
    "Add missing job keywords where they honestly match your skills."
  ],
  "rewrite_suggestions": [
    {
      "section": "Projects",
      "before": "Worked on a student project.",
      "after": "Built a React and FastAPI web application with CV upload and AI feedback.",
      "reason": "The rewritten version shows technologies and outcome."
    }
  ],
  "job_match": {
    "match_score": 72,
    "strong_matches": ["react", "api"],
    "missing_keywords": ["typescript", "testing"],
    "recommendation": "Add missing role keywords and connect them to projects."
  }
}
```

## Rebuild CV

Restructures the user's CV into a clean, ATS-friendly template and returns it as
structured data. The frontend renders this into a preview and a downloadable PDF.
Works with uploaded PDF/DOCX files as well as pasted text.

```http
POST /api/cv/rebuild
Content-Type: multipart/form-data
```

Form fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `PDF` or `DOCX` file | No | CV uploaded by the user. Maximum size: 10 MB |
| `cv_text` | `string` | No | CV text pasted by the user. Required when no file is uploaded |
| `job_description` | `string` | No | Target role used to tailor the summary |

Processing:

1. Backend validates and extracts text using the same logic as `POST /api/cv/review`.
2. The text is sent to Gemini to rewrite weak phrasing into action-verb bullets
   and to organize the content into clean sections, using only real facts.
3. If Gemini is unavailable or no API key is configured, a rule-based fallback
   extracts contact details and skills and keeps the original content as bullets.

Response:

```json
{
  "filename": "student-cv.pdf",
  "full_name": "Aisha Karimova",
  "headline": "Junior Frontend Developer",
  "contact": {
    "email": "aisha.k@example.com",
    "phone": "+7 701 555 0142",
    "location": "Almaty, KZ",
    "links": ["github.com/aishak"]
  },
  "summary": "Computer Science student building frontend projects with React...",
  "skills": ["javascript", "react", "git"],
  "experience": [
    {
      "title": "Sales Assistant",
      "organization": "Local shop",
      "period": "2024",
      "bullets": ["Tracked stock levels in Excel to keep popular items available"]
    }
  ],
  "education": [
    { "school": "KBTU", "program": "BSc Computer Science", "period": "2023-2027", "details": "GPA 3.6" }
  ],
  "projects": [
    { "name": "Weather App", "bullets": ["Built a React app that displays live forecasts from a public API"] }
  ],
  "languages": ["Kazakh", "Russian", "English"],
  "certifications": [],
  "notes": ["No measurable results were provided; add numbers where possible"]
}
```

## Error Responses

| Status | Reason |
|---|---|
| `400` | Missing CV input or unsupported file type |
| `413` | File is too large |
| `422` | CV text could not be extracted |
| `500` | Unexpected server error |

## AI Provider

The backend supports Gemini API integration through the `GEMINI_API_KEY`
environment variable. The default model is `gemini-2.5-flash`, and it can be
changed with `GEMINI_MODEL`.

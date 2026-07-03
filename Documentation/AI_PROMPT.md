# AI Prompt Design

## Goal

Generate structured CV feedback for students and beginner job seekers. The AI
should focus on practical improvements that help the user apply for internships,
part-time roles, and junior positions.

The current implementation uses Gemini for several related AI tasks:

- CV review and scoring.
- Job description matching.
- Rewrite suggestions.
- CV-specific follow-up questions.
- ATS-friendly CV rebuild.
- Cover letter generation.
- CV generation from builder form input.

If Gemini is unavailable or no `GEMINI_API_KEY` is configured, the backend uses
rule-based fallbacks so the demo can still run.

## Input

```text
You are an AI CV reviewer for students and beginner job seekers.

Review the CV text below. Give clear, practical, and beginner-friendly feedback.
Return only valid JSON that follows the response schema.

CV_TEXT:
{{cv_text}}
```

Optional later input:

```text
TARGET_ROLE:
{{target_role}}

JOB_DESCRIPTION:
{{job_description}}
```

## Required JSON Output

```json
{
  "overall_score": 0,
  "summary": "Short overall assessment.",
  "feedback": [
    {
      "category": "Structure",
      "score": 0,
      "message": "What is good or weak in this category.",
      "suggestions": ["Specific improvement 1", "Specific improvement 2"]
    }
  ],
  "next_steps": ["Most important action 1", "Most important action 2"]
}
```

The production schema also includes `priority_fixes`, `rewrite_suggestions`,
and `job_match` so the frontend can show actionable fixes and role matching.

## Categories

- `Structure`: sections, order, readability, completeness.
- `Skills`: relevance, grouping, clarity, evidence.
- `Experience`: projects, internships, achievements, measurable results.
- `Formatting`: consistency, length, ATS compatibility.
- `Role Match`: keywords and relevance to the target role.

## Quality Rules

- Feedback must be specific and actionable.
- Avoid harsh or discouraging language.
- Do not invent experience, degrees, certifications, or employers.
- If information is missing, recommend what the user can add.
- Scores must be integers from `0` to `100`.
- For rebuild and cover letter generation, use only facts from the CV and the
  user's answers. Do not invent employers, achievements, education, or links.

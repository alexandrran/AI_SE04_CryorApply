from pydantic import BaseModel, Field


class FeedbackItem(BaseModel):
    category: str
    score: int = Field(ge=0, le=100)
    message: str
    suggestions: list[str]


class JobMatch(BaseModel):
    match_score: int = Field(ge=0, le=100)
    strong_matches: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    recommendation: str


class RewriteSuggestion(BaseModel):
    section: str
    before: str
    after: str
    reason: str


class CvReviewResponse(BaseModel):
    filename: str
    overall_score: int = Field(ge=0, le=100)
    summary: str
    feedback: list[FeedbackItem]
    next_steps: list[str]
    priority_fixes: list[str] = Field(default_factory=list)
    rewrite_suggestions: list[RewriteSuggestion] = Field(default_factory=list)
    job_match: JobMatch | None = None

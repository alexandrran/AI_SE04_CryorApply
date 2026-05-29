from pydantic import BaseModel, Field


class FeedbackItem(BaseModel):
    category: str
    score: int = Field(ge=0, le=100)
    message: str
    suggestions: list[str]


class CvReviewResponse(BaseModel):
    filename: str
    overall_score: int = Field(ge=0, le=100)
    summary: str
    feedback: list[FeedbackItem]
    next_steps: list[str]

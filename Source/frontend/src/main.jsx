import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  Gauge,
  ListChecks,
  UploadCloud
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

const initialResult = {
  filename: "student-cv.pdf",
  overall_score: 78,
  summary:
    "The CV is suitable for early applications, but it needs stronger evidence of skills, impact, and role-specific keywords.",
  feedback: [
    {
      category: "Structure",
      score: 82,
      message: "Clear sections, but projects should be closer to technical skills.",
      suggestions: []
    },
    {
      category: "Experience",
      score: 68,
      message: "Add measurable outcomes for coursework, internships, and team tasks.",
      suggestions: []
    },
    {
      category: "Skills",
      score: 74,
      message: "Group tools by category and match them to target job descriptions.",
      suggestions: []
    },
    {
      category: "Formatting",
      score: 88,
      message: "Readable layout. Keep spacing consistent between sections.",
      suggestions: []
    }
  ]
};

function App() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reviewResult, setReviewResult] = useState(initialResult);
  const [isReviewing, setIsReviewing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setErrorMessage("");
    setSelectedFile(file ?? null);
  };

  const handleReview = async () => {
    if (!selectedFile) {
      setErrorMessage("Choose a PDF or DOCX CV before starting the review.");
      openFilePicker();
      return;
    }

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(extension)) {
      setErrorMessage("Only PDF and DOCX files are supported.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsReviewing(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/cv/review`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail ?? "CV review failed. Check that the backend is running.");
      }

      const result = await response.json();
      setReviewResult(result);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI CV Reviewer</p>
          <h1>CryorApply</h1>
          <p className="lead">
            Upload a student CV, extract the important details, and receive
            structured feedback before applying for internships or junior roles.
          </p>
          <div className="hero-actions">
            <button className="primary-action" onClick={handleReview} disabled={isReviewing}>
              {isReviewing ? "Reviewing..." : "Start review"}
              <ArrowRight size={18} />
            </button>
            <button
              className="icon-action"
              aria-label="Choose CV file"
              title="Choose CV file"
              onClick={openFilePicker}
            >
              <FileText size={20} />
            </button>
          </div>
        </div>

        <div className="upload-panel" aria-label="CV upload preview">
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
          />
          <button className="upload-target" type="button" onClick={openFilePicker}>
            <UploadCloud size={34} />
            <strong>{selectedFile ? "CV file selected" : "Choose CV file"}</strong>
            <span>PDF or DOCX, up to 10 MB</span>
          </button>
          <div className={`file-row ${selectedFile ? "is-ready" : ""}`}>
            <FileText size={20} />
            <div>
              <strong>{selectedFile?.name ?? "No file selected"}</strong>
              <span>{selectedFile ? "Ready for analysis" : "Select a CV to start"}</span>
            </div>
            {selectedFile ? <CheckCircle2 size={20} /> : <UploadCloud size={20} />}
          </div>
          {errorMessage ? (
            <p className="error-message">
              <AlertCircle size={18} />
              {errorMessage}
            </p>
          ) : null}
        </div>
      </section>

      <section className="workflow-band" aria-label="Product workflow">
        <div className="workflow-step">
          <UploadCloud size={24} />
          <span>Upload CV</span>
        </div>
        <div className="workflow-step">
          <FileText size={24} />
          <span>Extract text</span>
        </div>
        <div className="workflow-step">
          <ListChecks size={24} />
          <span>Analyze content</span>
        </div>
        <div className="workflow-step">
          <Gauge size={24} />
          <span>Show score</span>
        </div>
      </section>

      <section className="results-layout">
        <div className="score-panel">
          <p className="eyebrow">{reviewResult === initialResult ? "Sample result" : "CV result"}</p>
          <div className="score-value">{reviewResult.overall_score}</div>
          <span className="score-label">Overall CV score</span>
          <p>{reviewResult.summary}</p>
        </div>

        <div className="feedback-grid">
          {reviewResult.feedback.map((item) => (
            <article className="feedback-card" key={item.category}>
              <div className="feedback-header">
                <h2>{item.category}</h2>
                <span>{item.score}%</span>
              </div>
              <div className="meter" aria-hidden="true">
                <div style={{ width: `${item.score}%` }} />
              </div>
              <p>{item.message}</p>
              {item.suggestions.length > 0 ? (
                <ul className="suggestion-list">
                  {item.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

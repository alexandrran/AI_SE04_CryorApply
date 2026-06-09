import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import {
  ArrowRight,
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  Keyboard,
  ListChecks,
  PenLine,
  UploadCloud
} from "lucide-react";
import "./styles.css";

// In production (Vercel) the API is served from the same origin, so use a
// relative path. In local dev the Vite server (5173) talks to uvicorn (8000).
// Override with VITE_API_BASE_URL when needed.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "");

const initialResult = {
  filename: "student-cv.pdf",
  overall_score: 78,
  summary:
    "The CV is suitable for early applications, but it needs stronger evidence of skills, impact, and role-specific keywords.",
  priority_fixes: [],
  rewrite_suggestions: [],
  job_match: null,
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
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
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

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReview = async ({ includeJobDescription = false } = {}) => {
    const pastedCvText = cvText.trim();
    const pastedJobDescription = jobDescription.trim();

    if (!selectedFile && !pastedCvText) {
      setErrorMessage("Upload a CV file or paste CV text before starting the review.");
      return;
    }

    if (includeJobDescription && !pastedJobDescription) {
      setErrorMessage("Paste a target job description before matching the CV.");
      return;
    }

    if (selectedFile) {
      const extension = selectedFile.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "docx"].includes(extension)) {
        setErrorMessage("Only PDF and DOCX files are supported.");
        return;
      }
    }

    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
    } else {
      formData.append("cv_text", pastedCvText);
    }

    if (includeJobDescription) {
      formData.append("job_description", pastedJobDescription);
    }

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

  const downloadReport = () => {
    setErrorMessage("");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const maxWidth = pageWidth - margin * 2;
    let y = 18;

    const addText = (text, size = 11, style = "normal", gap = 7) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, maxWidth);

      if (y + lines.length * gap > pageHeight - margin) {
        doc.addPage();
        y = 18;
      }

      doc.text(lines, margin, y);
      y += lines.length * gap;
    };

    addText("CryorApply CV Review Report", 18, "bold", 9);
    addText(`File: ${reviewResult.filename}`, 10);
    addText(`Overall score: ${reviewResult.overall_score}/100`, 14, "bold", 8);
    addText(reviewResult.summary, 11);

    if (reviewResult.job_match) {
      addText("Job Match", 14, "bold", 8);
      addText(`Match score: ${reviewResult.job_match.match_score}/100`);
      addText(`Strong matches: ${reviewResult.job_match.strong_matches.join(", ") || "None yet"}`);
      addText(`Missing keywords: ${reviewResult.job_match.missing_keywords.join(", ") || "None detected"}`);
      addText(reviewResult.job_match.recommendation);
    }

    if (reviewResult.priority_fixes?.length) {
      addText("Priority Fixes", 14, "bold", 8);
      reviewResult.priority_fixes.forEach((fix, index) => addText(`${index + 1}. ${fix}`));
    }

    addText("Category Feedback", 14, "bold", 8);
    reviewResult.feedback.forEach((item) => {
      addText(`${item.category}: ${item.score}/100`, 12, "bold");
      addText(item.message);
      item.suggestions.forEach((suggestion) => addText(`- ${suggestion}`));
    });

    if (reviewResult.rewrite_suggestions?.length) {
      addText("Rewrite Suggestions", 14, "bold", 8);
      reviewResult.rewrite_suggestions.forEach((item) => {
        addText(item.section, 12, "bold");
        addText(`Before: ${item.before}`);
        addText(`After: ${item.after}`);
        addText(`Why: ${item.reason}`);
      });
    }

    try {
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `cryorapply-cv-review-${timestamp}.pdf`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErrorMessage("Could not create the PDF report in this browser.");
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
            <button
              className="primary-action"
              onClick={() => handleReview()}
              disabled={isReviewing}
            >
              {isReviewing ? "Reviewing..." : "Analyze CV"}
              <ArrowRight size={18} />
            </button>
            <button
              className="secondary-action"
              onClick={() => handleReview({ includeJobDescription: true })}
              disabled={isReviewing}
            >
              <BriefcaseBusiness size={18} />
              Match job
            </button>
            <button
              className="icon-action"
              aria-label="Download report"
              title="Download report"
              onClick={downloadReport}
            >
              <Download size={20} />
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
          {selectedFile ? (
            <button className="text-link" type="button" onClick={clearSelectedFile}>
              Use pasted CV text instead
            </button>
          ) : null}
          <label className="field-block">
            <span>
              <Keyboard size={16} />
              Paste CV text
            </span>
            <textarea
              value={cvText}
              onChange={(event) => setCvText(event.target.value)}
              placeholder="Paste CV text here if you do not want to upload a file."
              rows={5}
            />
          </label>
          <label className="field-block">
            <span>
              <BriefcaseBusiness size={16} />
              Target job description
            </span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste a junior role or internship description for match scoring."
              rows={4}
            />
          </label>
          <div className="panel-actions">
            <button
              className="primary-action"
              type="button"
              onClick={() => handleReview()}
              disabled={isReviewing}
            >
              {isReviewing ? "Reviewing..." : "Analyze CV"}
              <ArrowRight size={18} />
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => handleReview({ includeJobDescription: true })}
              disabled={isReviewing}
            >
              <BriefcaseBusiness size={18} />
              Match job
            </button>
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
          <button className="download-action" type="button" onClick={downloadReport}>
            <Download size={18} />
            Download PDF report
          </button>
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

      <section className="insight-layout">
        {reviewResult.job_match ? (
          <article className="insight-panel">
            <div className="section-heading">
              <BriefcaseBusiness size={22} />
              <h2>Job match</h2>
            </div>
            <div className="match-score">{reviewResult.job_match.match_score}%</div>
            <p>{reviewResult.job_match.recommendation}</p>
            <div className="keyword-columns">
              <div>
                <strong>Strong matches</strong>
                <ul>
                  {(reviewResult.job_match.strong_matches.length
                    ? reviewResult.job_match.strong_matches
                    : ["Add a job description for matching"]
                  ).map((keyword) => (
                    <li key={keyword}>{keyword}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Missing keywords</strong>
                <ul>
                  {(reviewResult.job_match.missing_keywords.length
                    ? reviewResult.job_match.missing_keywords
                    : ["No missing keywords detected"]
                  ).map((keyword) => (
                    <li key={keyword}>{keyword}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ) : null}

        {reviewResult.priority_fixes?.length ? (
          <article className="insight-panel">
            <div className="section-heading">
              <ListChecks size={22} />
              <h2>Priority fixes</h2>
            </div>
            <ol className="priority-list">
              {reviewResult.priority_fixes.map((fix) => (
                <li key={fix}>{fix}</li>
              ))}
            </ol>
          </article>
        ) : null}

        {reviewResult.rewrite_suggestions?.length ? (
          <article className="insight-panel rewrite-panel">
            <div className="section-heading">
              <PenLine size={22} />
              <h2>Rewrite suggestions</h2>
            </div>
            <div className="rewrite-list">
              {reviewResult.rewrite_suggestions.map((item) => (
                <div className="rewrite-item" key={`${item.section}-${item.before}`}>
                  <strong>{item.section}</strong>
                  <p><span>Before:</span> {item.before}</p>
                  <p><span>After:</span> {item.after}</p>
                  <small>{item.reason}</small>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

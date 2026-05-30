import React from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  ListChecks,
  UploadCloud
} from "lucide-react";
import "./styles.css";

const feedbackItems = [
  {
    title: "Structure",
    score: 82,
    note: "Clear sections, but projects should be closer to technical skills."
  },
  {
    title: "Experience",
    score: 68,
    note: "Add measurable outcomes for coursework, internships, and team tasks."
  },
  {
    title: "Skills",
    score: 74,
    note: "Group tools by category and match them to target job descriptions."
  },
  {
    title: "Formatting",
    score: 88,
    note: "Readable layout. Keep spacing consistent between sections."
  }
];

function App() {
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
            <button className="primary-action">
              Start review
              <ArrowRight size={18} />
            </button>
            <button className="icon-action" aria-label="Open sample report" title="Open sample report">
              <FileText size={20} />
            </button>
          </div>
        </div>

        <div className="upload-panel" aria-label="CV upload preview">
          <div className="upload-target">
            <UploadCloud size={34} />
            <strong>Drop CV file</strong>
            <span>PDF or DOCX, up to 10 MB</span>
          </div>
          <div className="file-row">
            <FileText size={20} />
            <div>
              <strong>student-cv.pdf</strong>
              <span>Ready for analysis</span>
            </div>
            <CheckCircle2 size={20} />
          </div>
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
          <p className="eyebrow">Sample result</p>
          <div className="score-value">78</div>
          <span className="score-label">Overall CV score</span>
          <p>
            The CV is suitable for early applications, but it needs stronger
            evidence of skills, impact, and role-specific keywords.
          </p>
        </div>

        <div className="feedback-grid">
          {feedbackItems.map((item) => (
            <article className="feedback-card" key={item.title}>
              <div className="feedback-header">
                <h2>{item.title}</h2>
                <span>{item.score}%</span>
              </div>
              <div className="meter" aria-hidden="true">
                <div style={{ width: `${item.score}%` }} />
              </div>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);

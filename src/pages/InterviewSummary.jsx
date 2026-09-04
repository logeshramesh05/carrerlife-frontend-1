import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getSummary } from "../api/interview";
import { SkeletonPage } from "../components/Loader";
import ScorePill from "../components/ScorePill";
import ProgressBar from "../components/ProgressBar";

export default function InterviewSummary() {
  const { sessionId } = useParams();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSummary(sessionId).then(setSummary).catch((err) =>
      setError(err.response?.data?.message || "Failed to load summary")
    );
  }, [sessionId]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!summary) return <SkeletonPage />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Interview Summary</h2>
          <p className="page-sub">{summary.role}</p>
        </div>
        <span className={`badge ${summary.status === "COMPLETED" ? "completed" : "active"}`}>{summary.status}</span>
      </div>

      <div className="stat-card" style={{ marginBottom: 24 }}>
        <ProgressBar label="Average score" value={summary.averageScore} max={10} />
        <p style={{ marginTop: 12 }}>{summary.overallSummary}</p>
      </div>

      <h3>Question Breakdown</h3>
      <div className="turns-list">
        {summary.turns.map((t) => (
          <div key={t.questionIndex} className="turn-card">
            <div className="turn-card-row">
              <p className="question-text" style={{ margin: 0, fontSize: 15.5 }}><strong>Q{t.questionIndex + 1}:</strong> {t.question}</p>
              <ScorePill score={t.score} />
            </div>
            <p style={{ marginTop: 10 }}><strong style={{ color: "var(--text)" }}>Answer:</strong> {t.answer}</p>
            <p><strong style={{ color: "var(--text)" }}>Feedback:</strong> {t.feedback}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
        <Link to="/interview"><button type="button">Start New Interview</button></Link>
        <Link to="/dashboard"><button type="button" className="secondary">Back to Dashboard</button></Link>
      </div>
    </div>
  );
}

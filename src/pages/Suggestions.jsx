import { useEffect, useState } from "react";
import { getSuggestions, getMissingSkills, getImprovementAreas, getBenchmark } from "../api/dashboard";
import { SkeletonPage } from "../components/Loader";
import ProgressBar from "../components/ProgressBar";

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState(null);
  const [missingSkills, setMissingSkills] = useState(null);
  const [improvement, setImprovement] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getSuggestions(),
      getMissingSkills(),
      getImprovementAreas(),
      getBenchmark(),
    ])
      .then(([s, m, i, b]) => {
        setSuggestions(s);
        setMissingSkills(m);
        setImprovement(i);
        setBenchmark(b);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load"));
  }, []);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!suggestions) return <SkeletonPage />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Career Suggestions</h2>
          <p className="page-sub">Career Stage: <strong style={{ color: "var(--text)" }}>{suggestions.careerStage}</strong></p>
        </div>
      </div>

      <div className="turns-list">
        {suggestions.suggestions.map((s, i) => (
          <div key={i} className="turn-card">{s}</div>
        ))}
      </div>

      <h3>Missing Skills (All)</h3>
      <div className="tag-list">
        {missingSkills.skills.map((s) => (
          <span key={s.skill} className="tag bad">{s.skill} · {s.occurrences}</span>
        ))}
      </div>

      <h3>Improvement Areas</h3>
      <h4>Recurring Resume Weaknesses</h4>
      <div className="tag-list">
        {improvement.recurringResumeWeaknesses.map((s) => (
          <span key={s.skill} className="tag warn">{s.skill} · {s.occurrences}</span>
        ))}
      </div>
      <h4 style={{ marginTop: 20 }}>Lowest Scoring Interview Feedback</h4>
      <div className="turns-list">
        {improvement.lowestScoringInterviewFeedback.map((f, i) => (
          <div key={i} className="turn-card">{f}</div>
        ))}
      </div>

      <h3>Benchmark</h3>
      <div className="stat-card">
        <ProgressBar label="Your average score" value={benchmark.yourAverageScore ?? 0} max={10} />
        <ProgressBar label="Typical average score" value={benchmark.typicalAverageScore} max={10} />
        <ProgressBar label="Your ATS score" value={benchmark.yourAverageAtsScore ?? 0} max={100} suffix="%" />
        <ProgressBar label="Typical ATS score" value={benchmark.typicalAverageAtsScore} max={100} suffix="%" />
      </div>
    </div>
  );
}

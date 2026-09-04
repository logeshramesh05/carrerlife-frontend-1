import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startInterview } from "../api/interview";
import { Spinner } from "../components/Loader";

export default function InterviewStart() {
  const [role, setRole] = useState("");
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await startInterview({ role, domain, difficulty, totalQuestions });
      navigate(`/interview/${data.sessionId}`, { state: data });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <div className="page-header">
        <div>
          <h2>Start Mock Interview</h2>
          <p className="page-sub">Practice with a voice-enabled AI interviewer</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="card-form" style={{ background: "var(--bg-elev)", padding: 24, borderRadius: 16, border: "1px solid var(--border)" }}>
        <div className="field">
          <label>Role</label>
          <input placeholder="e.g. Backend Engineer" value={role}
            onChange={(e) => setRole(e.target.value)} required />
        </div>
        <div className="field">
          <label>Domain</label>
          <input placeholder="e.g. Java, System Design" value={domain}
            onChange={(e) => setDomain(e.target.value)} required />
        </div>
        <div className="field">
          <label>Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div className="field">
          <label>Number of Questions</label>
          <input type="number" min="1" max="10" value={totalQuestions}
            onChange={(e) => setTotalQuestions(Number(e.target.value))} />
        </div>
        <button type="submit" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading && <Spinner />} {loading ? "Preparing session" : "Start Interview"}
        </button>
      </form>
    </div>
  );
}

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { analyzeResume } from "../api/resume";
import { Spinner } from "../components/Loader";

export default function ResumeAnalyze() {
  const { resumeId } = useParams();
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await analyzeResume(resumeId, jobDescription);
      navigate(`/resumes/${resumeId}/analyses/${result.analysisId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h2>Analyze Resume</h2>
          <p className="page-sub">Paste a job description to get a match score</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} className="card-form">
        <textarea rows="12" placeholder="Paste job description..."
          value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} required />
        <button type="submit" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading && <Spinner />} {loading ? "Analyzing" : "Analyze"}
        </button>
      </form>
    </div>
  );
}

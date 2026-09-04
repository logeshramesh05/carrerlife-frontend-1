import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAnalyses } from "../api/resume";
import { SkeletonCards } from "../components/Loader";

export default function ResumeAnalysesList() {
  const { resumeId } = useParams();
  const [analyses, setAnalyses] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalyses(resumeId).then(setAnalyses).catch((err) =>
      setError(err.response?.data?.message || "Failed to load analyses")
    );
  }, [resumeId]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Analyses</h2>
          <p className="page-sub">Past resume-to-job matches</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {analyses === null ? (
        <SkeletonCards count={3} />
      ) : analyses.length === 0 ? (
        <div className="empty-state"><div className="icon">📊</div>No analyses yet</div>
      ) : (
        <div className="turns-list">
          {analyses.map((a) => (
            <div key={a.analysisId} className="turn-card">
              <div className="turn-card-row">
                <span><strong>Match:</strong> {a.matchScore}% · <strong>ATS:</strong> {a.atsScore}%</span>
                <Link to={`/resumes/${resumeId}/analyses/${a.analysisId}`}>View Details →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

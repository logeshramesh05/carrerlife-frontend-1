import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAnalysis } from "../api/resume";
import { SkeletonPage } from "../components/Loader";
import ProgressBar from "../components/ProgressBar";

function SkillTags({ title, items, variant }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4>{title}</h4>
      <div className="tag-list">
        {items.map((s) => <span key={s} className={`tag ${variant}`}>{s}</span>)}
      </div>
    </div>
  );
}

export default function ResumeAnalysisDetail() {
  const { resumeId, analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalysis(resumeId, analysisId).then(setAnalysis).catch((err) =>
      setError(err.response?.data?.message || "Failed to load analysis")
    );
  }, [resumeId, analysisId]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!analysis) return <SkeletonPage />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Analysis Detail</h2>
        </div>
      </div>

      <div className="stat-card" style={{ marginBottom: 24 }}>
        <ProgressBar label="Match score" value={analysis.matchScore} max={100} suffix="%" />
        <ProgressBar label="ATS score" value={analysis.atsScore} max={100} suffix="%" />
      </div>

      <SkillTags title="Matched Skills" items={analysis.matchedSkills} variant="good" />
      <SkillTags title="Missing Skills" items={analysis.missingSkills} variant="bad" />
      <SkillTags title="Keyword Gaps" items={analysis.keywordGaps} variant="warn" />
      <SkillTags title="Strengths" items={analysis.strengths} variant="good" />
      <SkillTags title="Weaknesses" items={analysis.weaknesses} variant="bad" />
      <SkillTags title="Recommendations" items={analysis.recommendations} variant="" />
    </div>
  );
}

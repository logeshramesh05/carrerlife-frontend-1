import { useEffect, useState } from "react";
import { getDashboard } from "../api/dashboard";
import { SkeletonPage } from "../components/Loader";
import ProgressBar from "../components/ProgressBar";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard().then(setData).catch((err) =>
      setError(err.response?.data?.message || "Failed to load dashboard")
    );
  }, []);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <SkeletonPage />;

  const completionRate = data.interview.totalSessions
    ? Math.round((data.interview.completedSessions / data.interview.totalSessions) * 100)
    : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-sub">Your progress at a glance</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <h3>Interview Sessions</h3>
          <div className="stat-big">{data.interview.totalSessions}<span> total</span></div>
          <ProgressBar label="Completion rate" value={completionRate} suffix="%" />
          <ProgressBar label="Average score" value={data.interview.averageScore ?? 0} max={10} />
          <ProgressBar label="Best score" value={data.interview.bestScore ?? 0} max={10} />
          <div className="stat-card-row"><span>Questions answered</span><b>{data.interview.totalQuestionsAnswered}</b></div>
        </div>

        <div className="stat-card">
          <h3>Resumes</h3>
          <div className="stat-big">{data.resume.resumesUploaded}<span> uploaded</span></div>
          <ProgressBar label="Avg match score" value={data.resume.averageMatchScore ?? 0} max={100} suffix="%" />
          <ProgressBar label="Avg ATS score" value={data.resume.averageAtsScore ?? 0} max={100} suffix="%" />
          <div className="stat-card-row"><span>Analyses run</span><b>{data.resume.analysesRun}</b></div>
        </div>
      </div>

      <h3>Score Trend</h3>
      {data.scoreTrend.length === 0 ? (
        <div className="empty-state"><div className="icon">📈</div>No sessions completed yet</div>
      ) : (
        <div className="turns-list">
          {data.scoreTrend.map((s) => (
            <div key={s.sessionId} className="turn-card">
              <div className="turn-card-row">
                <span>Session {s.sessionId} · {new Date(s.completedAt).toLocaleDateString()}</span>
                <b style={{ fontFamily: "Manrope", fontSize: 16 }}>{s.score} pts</b>
              </div>
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (s.score / 10) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <h3>Domain Breakdown</h3>
      {data.domainBreakdown.length === 0 ? (
        <div className="empty-state"><div className="icon">🧩</div>No domain data yet</div>
      ) : (
        <div className="turns-list">
          {data.domainBreakdown.map((d) => (
            <div key={d.domain} className="turn-card">
              <div className="turn-card-row">
                <span><strong>{d.domain}</strong> · {d.sessionCount} sessions</span>
              </div>
              <ProgressBar label="Average score" value={d.averageScore ?? 0} max={10} />
            </div>
          ))}
        </div>
      )}

      <h3>Top Missing Skills</h3>
      <div className="tag-list">
        {data.topMissingSkills.length === 0 && <span className="page-sub">Nothing to show yet</span>}
        {data.topMissingSkills.map((s) => (
          <span key={s.skill} className="tag bad">{s.skill} · {s.occurrences}</span>
        ))}
      </div>

      <h3>Top Strengths</h3>
      <div className="tag-list">
        {data.topStrengths.length === 0 && <span className="page-sub">Nothing to show yet</span>}
        {data.topStrengths.map((s) => (
          <span key={s.skill} className="tag good">{s.skill} · {s.occurrences}</span>
        ))}
      </div>
    </div>
  );
}

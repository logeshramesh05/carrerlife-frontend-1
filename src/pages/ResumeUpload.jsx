import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listResumes, uploadResume } from "../api/resume";
import { Spinner, SkeletonCards } from "../components/Loader";

export default function ResumeUpload() {
  const [resumes, setResumes] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const load = () => listResumes().then(setResumes).catch(() => setResumes([]));

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      await uploadResume(file);
      setFile(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Resumes</h2>
          <p className="page-sub">Upload and analyze your resumes against job descriptions</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleUpload} className="card-form">
        <div
          className={`dropzone${dragActive ? " active" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <div className="icon">📄</div>
          <div><strong>{file ? file.name : "Click or drag a resume file here"}</strong></div>
          <small>PDF or DOCX</small>
          <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files[0])} />
        </div>
        <button type="submit" disabled={uploading || !file} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {uploading && <Spinner />} {uploading ? "Uploading" : "Upload Resume"}
        </button>
      </form>

      <h3>Your Resumes</h3>
      {resumes === null ? (
        <SkeletonCards count={2} />
      ) : resumes.length === 0 ? (
        <div className="empty-state"><div className="icon">🗂️</div>No resumes uploaded yet</div>
      ) : (
        <div className="turns-list">
          {resumes.map((r) => (
            <div key={r.id} className="turn-card">
              <div className="turn-card-row">
                <strong>{r.fileName}</strong>
                <span className="page-sub" style={{ margin: 0 }}>{new Date(r.uploadedAt).toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                <Link to={`/resumes/${r.id}/analyze`}>Analyze</Link>
                <Link to={`/resumes/${r.id}/analyses`}>View Analyses</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

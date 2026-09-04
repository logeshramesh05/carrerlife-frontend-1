import client from "./client";

export const listResumes = () => client.get("/resumes").then((r) => r.data);

export const uploadResume = (file) => {
  const form = new FormData();
  form.append("file", file);
  return client
    .post("/resumes/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const analyzeResume = (resumeId, jobDescription) =>
  client
    .post(`/resumes/${resumeId}/analyze`, { jobDescription })
    .then((r) => r.data);

export const getAnalyses = (resumeId) =>
  client.get(`/resumes/${resumeId}/analyses`).then((r) => r.data);

export const getAnalysis = (resumeId, analysisId) =>
  client.get(`/resumes/${resumeId}/analyses/${analysisId}`).then((r) => r.data);

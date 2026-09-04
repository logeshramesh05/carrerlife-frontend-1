import client from "./client";

export const getDashboard = (days) =>
  client.get("/dashboard", { params: days ? { days } : {} }).then((r) => r.data);

export const getInterviewPerformance = (days) =>
  client
    .get("/dashboard/interview", { params: days ? { days } : {} })
    .then((r) => r.data);

export const getResumePerformance = (days) =>
  client
    .get("/dashboard/resume", { params: days ? { days } : {} })
    .then((r) => r.data);

export const getSuggestions = () =>
  client.get("/dashboard/suggestions").then((r) => r.data);

export const getMissingSkills = () =>
  client.get("/dashboard/missing-skills").then((r) => r.data);

export const getImprovementAreas = () =>
  client.get("/dashboard/improvement-areas").then((r) => r.data);

export const getEssentials = () =>
  client.get("/dashboard/essentials").then((r) => r.data);

export const getBenchmark = () =>
  client.get("/dashboard/benchmark").then((r) => r.data);

export const setCareerStage = (careerStage) =>
  client.put("/dashboard/career-stage", { careerStage }).then((r) => r.data);

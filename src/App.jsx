import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Suggestions from "./pages/Suggestions";
import InterviewStart from "./pages/InterviewStart";
import InterviewSession from "./pages/InterviewSession";
import InterviewSummary from "./pages/InterviewSummary";
import ResumeUpload from "./pages/ResumeUpload";
import ResumeAnalyze from "./pages/ResumeAnalyze";
import ResumeAnalysesList from "./pages/ResumeAnalysesList";
import ResumeAnalysisDetail from "./pages/ResumeAnalysisDetail";

function HomeRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Welcome />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/suggestions" element={<ProtectedRoute><Suggestions /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><InterviewStart /></ProtectedRoute>} />
          <Route path="/interview/:sessionId" element={<ProtectedRoute><InterviewSession /></ProtectedRoute>} />
          <Route path="/interview/:sessionId/summary" element={<ProtectedRoute><InterviewSummary /></ProtectedRoute>} />
          <Route path="/resumes" element={<ProtectedRoute><ResumeUpload /></ProtectedRoute>} />
          <Route path="/resumes/:resumeId/analyze" element={<ProtectedRoute><ResumeAnalyze /></ProtectedRoute>} />
          <Route path="/resumes/:resumeId/analyses" element={<ProtectedRoute><ResumeAnalysesList /></ProtectedRoute>} />
          <Route path="/resumes/:resumeId/analyses/:analysisId" element={<ProtectedRoute><ResumeAnalysisDetail /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

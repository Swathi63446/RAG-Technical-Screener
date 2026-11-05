import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000, // LLM calls can be slow
  headers: { "Content-Type": "application/json" },
});

// Global error normaliser
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  }
);

// ── Resume ────────────────────────────────────────────────────────────────────

export const uploadResume = (file, candidateName) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("candidate_name", candidateName);
  return api.post("/upload_resume", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ── Interview ─────────────────────────────────────────────────────────────────

export const startInterview = (sessionId, role) =>
  api.post("/start_interview", { session_id: sessionId, role });

export const getNextQuestion = (sessionId) =>
  api.get(`/next_question/${sessionId}`);

export const submitAnswer = (sessionId, questionId, answer) =>
  api.post("/submit_answer", {
    session_id: sessionId,
    question_id: questionId,
    answer,
  });

export const endInterview = (sessionId) =>
  api.post("/end_interview", { session_id: sessionId });

// ── Summary ───────────────────────────────────────────────────────────────────

export const getSummary = (sessionId) => api.get(`/summary/${sessionId}`);

// ── Admin ─────────────────────────────────────────────────────────────────────

export const triggerIngest = () => api.post("/ingest");

export default api;

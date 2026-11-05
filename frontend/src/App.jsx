import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingPage from "./pages/LandingPage";
import ProcessingPage from "./pages/ProcessingPage";
import InterviewPage from "./pages/InterviewPage";
import SummaryPage from "./pages/SummaryPage";

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/"            element={<LandingPage />} />
        <Route path="/processing"  element={<ProcessingPage />} />
        <Route path="/interview"   element={<InterviewPage />} />
        <Route path="/summary"     element={<SummaryPage />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

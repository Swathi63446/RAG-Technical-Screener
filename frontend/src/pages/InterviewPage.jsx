import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, StopCircle, ChevronDown, ChevronUp,
  Zap, Brain, Clock, BarChart2,
} from "lucide-react";
import { submitAnswer, endInterview } from "../services/api";
import ChatBubble from "../components/ChatBubble";
import ProgressBar from "../components/ProgressBar";
import SourceContext from "../components/SourceContext";

const MAX_QUESTIONS = 8;

const DIFFICULTY_COLOR = {
  easy:   "badge-green",
  medium: "badge-yellow",
  hard:   "badge-purple",
  expert: "badge-red",
};

export default function InterviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [scores, setScores] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5-min timer
  const [timerActive, setTimerActive] = useState(true);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const timerRef = useRef(null);

  // Redirect if no state
  useEffect(() => {
    if (!state?.session_id) { navigate("/"); return; }

    const first = state.firstQuestion;
    if (first) {
      setCurrentQuestion(first);
      setMessages([{ role: "ai", content: first.question, meta: first }]);
    }
  }, []);

  // Timer
  useEffect(() => {
    if (!timerActive || interviewComplete) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, interviewComplete, questionCount]);

  // Reset timer on each new question
  useEffect(() => {
    setSecondsLeft(300);
  }, [questionCount]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, evaluation]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleSubmit = async () => {
    if (!answer.trim() || loading || !currentQuestion) return;

    const userAnswer = answer.trim();
    setAnswer("");
    setLoading(true);
    setEvaluation(null);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userAnswer },
      { role: "typing" },
    ]);

    try {
      const res = await submitAnswer(
        state.session_id,
        currentQuestion.question_id,
        userAnswer
      );
      const { evaluation: eval_, interview_complete, next_question } = res.data;

      setScores((prev) => [...prev, eval_.score]);
      setEvaluation(eval_);

      // Replace typing indicator with feedback bubble
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "typing"),
        { role: "ai-eval", content: eval_.feedback, eval: eval_ },
      ]);

      if (interview_complete || !next_question) {
        setInterviewComplete(true);
        setTimerActive(false);
        setCurrentQuestion(null);
      } else {
        setCurrentQuestion(next_question);
        setQuestionCount((n) => n + 1);
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: next_question.question, meta: next_question },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "typing"),
        { role: "system", content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    setTimerActive(false);
    try {
      await endInterview(state.session_id);
    } catch (_) {}
    navigate("/summary", { state: { session_id: state.session_id, ...state } });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  if (!state?.session_id) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{state.candidateName}</p>
            <p className="text-xs text-white/40">{state.role}</p>
          </div>
        </div>

        <div className="flex-1 max-w-xs hidden sm:block">
          <ProgressBar value={questionCount} max={MAX_QUESTIONS} />
        </div>

        <div className="flex items-center gap-4">
          {/* Score */}
          {scores.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-sm">
              <BarChart2 size={14} className="text-purple-400" />
              <span className="text-white/60">Avg:</span>
              <span className={`font-bold ${avgScore >= 0.7 ? "text-green-400" : avgScore >= 0.4 ? "text-yellow-400" : "text-red-400"}`}>
                {Math.round(avgScore * 100)}%
              </span>
            </div>
          )}

          {/* Timer */}
          <div className={`flex items-center gap-1.5 text-sm
            ${secondsLeft < 60 ? "text-red-400" : "text-white/50"}`}>
            <Clock size={14} />
            <span className="font-mono">{formatTime(secondsLeft)}</span>
          </div>

          {/* Current difficulty */}
          {currentQuestion && (
            <span className={`badge ${DIFFICULTY_COLOR[currentQuestion.difficulty] || "badge-purple"} hidden md:inline`}>
              {currentQuestion.difficulty}
            </span>
          )}

          {/* End button */}
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <StopCircle size={13} />
            End
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChatBubble message={msg} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Completion message */}
        {interviewComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center border border-purple-500/20"
          >
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-xl font-bold mb-2 gradient-text">Interview Complete!</h3>
            <p className="text-white/50 mb-6">
              Great job! Your responses have been recorded and evaluated.
            </p>
            <button onClick={handleEnd} className="btn-primary">
              View Your Results
            </button>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Source context toggle */}
      {currentQuestion?.retrieved_context?.length > 0 && !interviewComplete && (
        <div className="px-4 md:px-8">
          <button
            onClick={() => setShowContext((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/3 border border-white/8 text-xs text-white/40 hover:text-white/60 transition-colors mb-2"
          >
            <span className="flex items-center gap-2">
              <Zap size={12} />
              Knowledge context used for this question
              <span className="badge-purple badge">
                {currentQuestion.retrieved_context.length} chunks
              </span>
            </span>
            {showContext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <AnimatePresence>
            {showContext && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-2"
              >
                <SourceContext chunks={currentQuestion.retrieved_context} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Input area */}
      {!interviewComplete && (
        <div className="shrink-0 px-4 md:px-8 py-4 border-t border-white/5">
          {currentQuestion && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-white/30">
                Q{questionCount}/{MAX_QUESTIONS} · {currentQuestion.topic} ·
              </span>
              <span className={`badge text-xs ${DIFFICULTY_COLOR[currentQuestion.difficulty] || "badge-purple"}`}>
                {currentQuestion.difficulty}
              </span>
              <span className="text-xs text-white/20 capitalize">· {currentQuestion.question_type}</span>
            </div>
          )}

          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer here… (Shift+Enter for new line, Enter to submit)"
              rows={3}
              disabled={loading || interviewComplete}
              className="input-field flex-1 resize-none leading-relaxed text-sm"
              style={{ minHeight: "80px", maxHeight: "200px" }}
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || loading || interviewComplete}
              className="btn-primary h-12 w-12 flex items-center justify-center p-0 shrink-0"
              title="Submit answer (Enter)"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <p className="text-xs text-white/20 mt-1.5">
            Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Enter</kbd> to submit ·
            <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono mx-1">Shift+Enter</kbd> for new line
          </p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle2, Loader2 } from "lucide-react";
import { startInterview } from "../services/api";

const STEPS = [
  { label: "Parsing resume content", duration: 800 },
  { label: "Extracting skills & projects", duration: 700 },
  { label: "Loading role knowledge base", duration: 900 },
  { label: "Building RAG context", duration: 1000 },
  { label: "Crafting your first question", duration: 1200 },
];

export default function ProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state?.session_id) {
      navigate("/");
      return;
    }

    let elapsed = 0;
    const timers = [];

    // Animate through visual steps
    STEPS.forEach((step, i) => {
      const t = setTimeout(() => setCurrentStep(i + 1), elapsed);
      timers.push(t);
      elapsed += step.duration;
    });

    // Kick off real API call simultaneously
    const run = async () => {
      try {
        const res = await startInterview(state.session_id, state.role);
        const question = res.data;

        // Wait until all visual steps have finished before navigating
        setTimeout(() => {
          setDone(true);
          setTimeout(() => {
            navigate("/interview", {
              state: {
                ...state,
                firstQuestion: question,
              },
            });
          }, 700);
        }, elapsed);
      } catch (err) {
        timers.forEach(clearTimeout);
        setError(err.message);
      }
    };

    run();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state?.session_id) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center mb-10"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-glow">
              <Brain size={44} className="text-white" />
            </div>
            <div className="absolute -inset-4 rounded-3xl border border-purple-500/20 animate-pulse-slow" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold mb-2">
            {done ? "Ready!" : "Preparing Your Interview"}
          </h1>
          <p className="text-white/50">
            Hi <span className="text-white/80 font-medium">{state.candidateName}</span>,
            building a personalised <span className="gradient-text font-semibold">{state.role}</span> interview…
          </p>
        </motion.div>

        {/* Steps */}
        <div className="glass-card p-6 space-y-4">
          {STEPS.map((step, i) => {
            const completed = currentStep > i;
            const active = currentStep === i;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {completed ? (
                      <motion.div key="done"
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-green-400" />
                      </motion.div>
                    ) : active ? (
                      <motion.div key="active"
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                        <Loader2 size={16} className="text-purple-400 animate-spin" />
                      </motion.div>
                    ) : (
                      <motion.div key="pending"
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <span className={`text-sm transition-colors duration-300
                  ${completed ? "text-green-300" : active ? "text-white" : "text-white/30"}`}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <p className="text-center text-xs text-white/30 mt-2">
          {currentStep} / {STEPS.length} steps complete
        </p>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center"
          >
            {error}
            <button onClick={() => navigate("/")} className="block mt-2 underline text-red-400">
              Go back
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

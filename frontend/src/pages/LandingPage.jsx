import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload, User, Briefcase, Brain, Database, Code,
  ChevronRight, FileText, Sparkles, AlertCircle, CheckCircle2,
} from "lucide-react";
import { uploadResume } from "../services/api";

const ROLES = [
  {
    id: "AI/ML Engineer",
    icon: Brain,
    title: "AI / ML Engineer",
    desc: "Machine learning, deep learning, MLOps, and LLM engineering",
    gradient: "from-purple-500 to-pink-500",
    glow: "shadow-purple-500/30",
    topics: ["PyTorch", "Transformers", "MLOps", "RAG", "Computer Vision"],
  },
  {
    id: "Backend Engineer",
    icon: Code,
    title: "Backend Engineer",
    desc: "System design, APIs, databases, microservices, and cloud",
    gradient: "from-blue-500 to-cyan-500",
    glow: "shadow-blue-500/30",
    topics: ["System Design", "APIs", "Databases", "Docker", "Kafka"],
  },
  {
    id: "Data Scientist",
    icon: Database,
    title: "Data Scientist",
    desc: "Statistics, analytics, ML modelling, and data pipelines",
    gradient: "from-emerald-500 to-teal-500",
    glow: "shadow-emerald-500/30",
    topics: ["Statistics", "A/B Testing", "SQL", "Feature Engineering", "Pandas"],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

export default function LandingPage() {
  const navigate = useNavigate();

  const [candidateName, setCandidateName] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setError("");
    } else {
      setError("Please upload a PDF file.");
    }
  }, []);

  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setError(""); }
  };

  const canStart = candidateName.trim() && selectedRole && file;

  const handleStart = async () => {
    if (!canStart) return;
    setLoading(true);
    setError("");

    try {
      const res = await uploadResume(file, candidateName.trim());
      const { session_id, resume_data } = res.data;

      navigate("/processing", {
        state: { session_id, role: selectedRole, candidateName: candidateName.trim(), resume_data },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-8 py-5 border-b border-white/5"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">InterviewAI</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-white/40">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          System Ready
        </div>
      </motion.header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="text-center max-w-2xl mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-6">
            <Sparkles size={14} />
            <span>RAG-Powered · Adaptive · Personalised</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight">
            Your{" "}
            <span className="gradient-text">AI Interview</span>
            <br />
            Starts Here
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Upload your resume, choose a role, and experience an intelligent interview
            that adapts to your experience and digs into what you actually know.
          </p>
        </motion.div>

        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column — name + upload */}
          <div className="flex flex-col gap-5">
            {/* Candidate name */}
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible"
              className="glass-card p-6">
              <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                <User size={15} /> Your Name
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="input-field"
              />
            </motion.div>

            {/* PDF upload */}
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible"
              className="glass-card p-6 flex-1">
              <label className="block text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                <FileText size={15} /> Resume Upload
              </label>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                  ${dragging ? "border-purple-400 bg-purple-500/10" : "border-white/10 hover:border-purple-500/40 hover:bg-white/2"}
                  ${file ? "border-green-500/40 bg-green-500/5" : ""}`}
                onClick={() => document.getElementById("resume-input").click()}
              >
                <input
                  id="resume-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={onFileChange}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 size={36} className="text-green-400" />
                    <p className="font-medium text-green-300">{file.name}</p>
                    <p className="text-xs text-white/40">{(file.size / 1024).toFixed(0)} KB · Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center animate-float">
                      <Upload size={24} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white/70">Drop your PDF here</p>
                      <p className="text-xs text-white/40 mt-1">or click to browse · Max 16 MB</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right column — role selection */}
          <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
            className="flex flex-col gap-3">
            <p className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">
              <Briefcase size={15} /> Select Your Target Role
            </p>
            {ROLES.map((role, i) => {
              const Icon = role.icon;
              const active = selectedRole === role.id;
              return (
                <motion.button
                  key={role.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedRole(role.id)}
                  className={`glass-card p-5 text-left transition-all duration-300 cursor-pointer border
                    ${active
                      ? `border-transparent shadow-lg ${role.glow}`
                      : "border-white/5 hover:border-white/15"}`}
                  style={active ? {
                    background: "rgba(255,255,255,0.07)",
                    boxShadow: `0 0 30px var(--tw-shadow-color)`,
                  } : {}}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shrink-0`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-white">{role.title}</p>
                        {active && (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5 mb-2">{role.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {role.topics.map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          variants={fadeUp} custom={5} initial="hidden" animate="visible"
          className="mt-10"
        >
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="btn-primary flex items-center gap-2 text-lg px-10 py-4"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                Start Interview
                <ChevronRight size={20} />
              </>
            )}
          </button>
          {!canStart && !loading && (
            <p className="text-center text-xs text-white/30 mt-3">
              Complete all fields above to begin
            </p>
          )}
        </motion.div>

        {/* Feature pills */}
        <motion.div
          variants={fadeUp} custom={6} initial="hidden" animate="visible"
          className="mt-16 flex flex-wrap justify-center gap-3"
        >
          {[
            "Adaptive difficulty",
            "RAG-enhanced questions",
            "Real-time evaluation",
            "Personalised from your resume",
            "Final analytics dashboard",
          ].map((f) => (
            <span key={f} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-white/40 text-xs">
              ✦ {f}
            </span>
          ))}
        </motion.div>
      </main>
    </div>
  );
}

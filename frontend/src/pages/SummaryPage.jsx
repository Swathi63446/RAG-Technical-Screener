import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, Target, TrendingUp, TrendingDown, BookOpen,
  ChevronDown, ChevronUp, Download, RefreshCw, Brain,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";
import { getSummary } from "../services/api";

const PERF_COLOR = {
  Exceptional: "text-emerald-400",
  Strong: "text-green-400",
  Good: "text-blue-400",
  Average: "text-yellow-400",
  "Needs Improvement": "text-red-400",
};

const HIRE_COLOR = {
  "Strong Hire": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "Hire": "bg-green-500/20 text-green-300 border-green-500/40",
  "Borderline": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  "No Hire": "bg-red-500/20 text-red-300 border-red-500/40",
};

const QUALITY_BADGE = {
  excellent: "badge-green",
  good: "badge-blue",
  average: "badge-yellow",
  weak: "badge-red",
};

function ScoreRing({ score, size = 140 }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#34d399" : score >= 50 ? "#60a5fa" : score >= 30 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-3xl font-bold text-white"
        >
          {Math.round(score)}
        </motion.span>
        <span className="text-xs text-white/40">/100</span>
      </div>
    </div>
  );
}

function QAAccordion({ qa, index }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/2 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-medium text-white line-clamp-1">{qa.question}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/40">{qa.topic}</span>
              <span className={`badge text-xs ${QUALITY_BADGE[qa.quality] || "badge-purple"}`}>
                {qa.quality}
              </span>
              <span className="text-xs text-white/40">
                Score: {Math.round((qa.score || 0) * 100)}%
              </span>
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-white/40 shrink-0" /> : <ChevronDown size={16} className="text-white/40 shrink-0" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0 }} animate={{ height: "auto" }}
          className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3"
        >
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Question</p>
            <p className="text-sm text-white/80">{qa.question}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Answer</p>
            <p className="text-sm text-white/60 whitespace-pre-wrap">{qa.answer || "—"}</p>
          </div>
          {qa.feedback && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">AI Feedback</p>
              <p className="text-sm text-blue-300/80 italic">{qa.feedback}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {qa.strengths?.length > 0 && (
              <div>
                <p className="text-xs text-green-400/60 uppercase tracking-wider mb-1">Strengths</p>
                <ul className="space-y-1">
                  {qa.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-green-300/80 flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {qa.weaknesses?.length > 0 && (
              <div>
                <p className="text-xs text-red-400/60 uppercase tracking-wider mb-1">Gaps</p>
                <ul className="space-y-1">
                  {qa.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-red-300/80 flex items-start gap-1">
                      <span className="text-red-500 mt-0.5">✗</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-white/60">{label}</p>
      <p className="text-white font-bold">{payload[0].value}</p>
    </div>
  );
};

export default function SummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state?.session_id) { navigate("/"); return; }

    getSummary(state.session_id)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Generating your evaluation…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-sm">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate("/")} className="btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, qa_pairs, session } = data;

  // Chart data
  const radarData = (summary.topics_covered || []).map((t) => ({
    topic: t.topic.split(" ")[0], // Shorten
    score: t.score,
  }));

  const diffProgressData = (summary.difficulty_scores || []).map((s, i) => ({
    question: `Q${i + 1}`,
    score: s,
  }));

  const skillData = Object.entries(summary.skill_heatmap || {})
    .map(([skill, score]) => ({ skill: skill.split(" ")[0], score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Interview Report</h1>
            <p className="text-xs text-white/40">
              {session?.candidate_name} · {session?.role}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/")}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} />
            New Interview
          </button>
        </div>
      </motion.div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Score ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 flex flex-col items-center justify-center col-span-1"
        >
          <ScoreRing score={summary.overall_score || 0} />
          <p className={`mt-3 font-bold text-lg ${PERF_COLOR[summary.performance_level] || "text-white"}`}>
            {summary.performance_level}
          </p>
          <p className="text-xs text-white/40">Overall Score</p>
        </motion.div>

        {/* Hiring rec */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 flex flex-col items-center justify-center"
        >
          <Trophy size={32} className="text-yellow-400 mb-2" />
          <span className={`badge text-sm font-bold border px-4 py-1.5 ${HIRE_COLOR[summary.hiring_recommendation] || ""}`}>
            {summary.hiring_recommendation}
          </span>
          <p className="text-xs text-white/40 mt-2">Hiring Recommendation</p>
        </motion.div>

        {/* Technical depth */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6 flex flex-col items-center justify-center"
        >
          <div className="text-4xl font-bold gradient-text mb-1">
            {Math.round(summary.technical_depth_score || 0)}
          </div>
          <p className="text-sm text-white/60 font-medium">Technical Depth</p>
          <div className="w-full mt-3 h-1.5 rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${summary.technical_depth_score || 0}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Communication */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 flex flex-col items-center justify-center"
        >
          <div className="text-4xl font-bold gradient-text mb-1">
            {Math.round(summary.communication_score || 0)}
          </div>
          <p className="text-sm text-white/60 font-medium">Communication</p>
          <div className="w-full mt-3 h-1.5 rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${summary.communication_score || 0}%` }}
              transition={{ duration: 1, delay: 0.4 }}
            />
          </div>
        </motion.div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Radar — topic coverage */}
        {radarData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 lg:col-span-1"
          >
            <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <Target size={15} /> Topic Coverage
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="topic" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Line — difficulty progression */}
        {diffProgressData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 lg:col-span-1"
          >
            <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <TrendingUp size={15} /> Score Progression
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={diffProgressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="question" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" stroke="#60a5fa" strokeWidth={2} dot={{ fill: "#60a5fa", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Bar — skill heatmap */}
        {skillData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 lg:col-span-1"
          >
            <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
              <BookOpen size={15} /> Skill Heatmap
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={skillData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <YAxis dataKey="skill" type="category" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Summary text + strengths/gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 lg:col-span-1"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-green-400" /> Strengths
          </h3>
          <ul className="space-y-2">
            {(summary.strengths || []).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className="text-green-400 mt-0.5 shrink-0">✓</span>{s}
              </li>
            ))}
            {!summary.strengths?.length && <li className="text-sm text-white/30">No data</li>}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 lg:col-span-1"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
            <TrendingDown size={15} className="text-red-400" /> Areas to Improve
          </h3>
          <ul className="space-y-2">
            {(summary.improvement_areas || []).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className="text-red-400 mt-0.5 shrink-0">↑</span>{a}
              </li>
            ))}
            {!summary.improvement_areas?.length && <li className="text-sm text-white/30">No data</li>}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 lg:col-span-1"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
            <BookOpen size={15} className="text-blue-400" /> Recommendations
          </h3>
          <ul className="space-y-2">
            {(summary.recommendations || []).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className="text-blue-400 mt-0.5 shrink-0">→</span>{r}
              </li>
            ))}
            {!summary.recommendations?.length && <li className="text-sm text-white/30">No data</li>}
          </ul>
        </motion.div>
      </div>

      {/* AI summary text */}
      {summary.summary_text && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6 border border-purple-500/15"
        >
          <h3 className="text-sm font-semibold text-purple-300 mb-3">AI Evaluation</h3>
          <p className="text-white/70 leading-relaxed">{summary.summary_text}</p>
        </motion.div>
      )}

      {/* Q&A Review */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-purple-400" /> Interview Review
        </h2>
        <div className="space-y-3">
          {qa_pairs.map((qa, i) => (
            <QAAccordion key={qa.id} qa={qa} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Footer CTA */}
      <div className="flex justify-center pb-12">
        <button onClick={() => navigate("/")} className="btn-primary flex items-center gap-2">
          <RefreshCw size={16} />
          Start a New Interview
        </button>
      </div>
    </div>
  );
}

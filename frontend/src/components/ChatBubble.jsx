import { Brain, User, Zap, AlertTriangle } from "lucide-react";

const QUALITY_STYLE = {
  excellent: "border-green-500/30 bg-green-500/5",
  good:      "border-blue-500/30 bg-blue-500/5",
  average:   "border-yellow-500/30 bg-yellow-500/5",
  weak:      "border-red-500/30 bg-red-500/5",
};

const SCORE_COLOR = (score) =>
  score >= 0.75 ? "text-green-400"
  : score >= 0.5 ? "text-blue-400"
  : score >= 0.25 ? "text-yellow-400"
  : "text-red-400";

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 max-w-2xl">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
        <Brain size={16} className="text-white" />
      </div>
      <div className="glass-card px-4 py-3 flex items-center gap-1.5">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

function AIBubble({ content, meta }) {
  return (
    <div className="flex items-start gap-3 max-w-3xl">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
        <Brain size={15} className="text-white" />
      </div>
      <div className="flex-1">
        {meta && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/30 font-medium uppercase tracking-wide">
              AI Interviewer
            </span>
            {meta.topic && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {meta.topic}
              </span>
            )}
          </div>
        )}
        <div className="glass-card px-5 py-4 border border-white/8">
          <p className="text-white/90 leading-relaxed text-sm">{content}</p>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ content }) {
  return (
    <div className="flex items-start gap-3 max-w-3xl ml-auto flex-row-reverse">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 mt-0.5">
        <User size={15} className="text-white" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-white/30 text-right mb-2 font-medium uppercase tracking-wide">You</p>
        <div className="bg-white/6 border border-white/10 rounded-2xl px-5 py-4">
          <p className="text-white/80 leading-relaxed text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}

function EvalBubble({ content, eval: ev }) {
  const quality = ev?.quality || "average";
  const score = ev?.score ?? 0;

  return (
    <div className={`glass-card p-4 border ${QUALITY_STYLE[quality] || "border-white/10"} max-w-3xl`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-purple-400" />
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Evaluation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${SCORE_COLOR(score)}`}>
            {Math.round(score * 100)}%
          </span>
          <span className={`badge text-xs
            ${quality === "excellent" ? "badge-green"
              : quality === "good" ? "badge-blue"
              : quality === "average" ? "badge-yellow"
              : "badge-red"}`}>
            {quality}
          </span>
        </div>
      </div>

      {content && (
        <p className="text-sm text-white/70 italic mb-3 leading-relaxed">{content}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {ev?.strengths?.length > 0 && (
          <div>
            <p className="text-xs text-green-400/60 uppercase tracking-wider mb-1">Strong</p>
            <ul className="space-y-0.5">
              {ev.strengths.slice(0, 2).map((s, i) => (
                <li key={i} className="text-xs text-green-300/70 flex gap-1">
                  <span>✓</span><span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {ev?.weaknesses?.length > 0 && (
          <div>
            <p className="text-xs text-red-400/60 uppercase tracking-wider mb-1">Could improve</p>
            <ul className="space-y-0.5">
              {ev.weaknesses.slice(0, 2).map((w, i) => (
                <li key={i} className="text-xs text-red-300/70 flex gap-1">
                  <span>↑</span><span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SystemBubble({ content }) {
  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-red-500/8 border border-red-500/15 max-w-xl text-xs text-red-300">
      <AlertTriangle size={13} />
      {content}
    </div>
  );
}

export default function ChatBubble({ message }) {
  switch (message.role) {
    case "ai":       return <AIBubble content={message.content} meta={message.meta} />;
    case "user":     return <UserBubble content={message.content} />;
    case "ai-eval":  return <EvalBubble content={message.content} eval={message.eval} />;
    case "typing":   return <TypingIndicator />;
    case "system":   return <SystemBubble content={message.content} />;
    default:         return null;
  }
}

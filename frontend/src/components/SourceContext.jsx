import { BookOpen } from "lucide-react";

export default function SourceContext({ chunks }) {
  if (!chunks?.length) return null;

  return (
    <div className="glass-card p-4 space-y-3 border border-white/5 mb-2">
      <div className="flex items-center gap-2 text-xs text-white/40">
        <BookOpen size={12} />
        <span>Retrieved knowledge chunks ({chunks.length})</span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {chunks.map((chunk, i) => (
          <div key={i} className="p-3 rounded-lg bg-white/3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-purple-400/60 font-mono">chunk_{i + 1}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{chunk}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function RoleCard({ role, active, onClick }) {
  const Icon = role.icon;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass-card p-5 text-left w-full transition-all duration-300 cursor-pointer border
        ${active
          ? "border-purple-500/40 shadow-lg shadow-purple-500/20"
          : "border-white/5 hover:border-white/15"}`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shrink-0`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">{role.title}</p>
            {active && (
              <CheckCircle2 size={18} className="text-purple-400 shrink-0" />
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
}

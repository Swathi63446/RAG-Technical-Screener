import { motion } from "framer-motion";

export default function ProgressBar({ value, max, label }) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-white/40 mb-1.5">
          <span>{label}</span>
          <span>{value} / {max}</span>
        </div>
      )}
      <div className="relative h-2 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      {!label && (
        <p className="text-right text-xs text-white/30 mt-1">
          Question {value} / {max}
        </p>
      )}
    </div>
  );
}

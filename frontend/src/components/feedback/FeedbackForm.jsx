import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";

import StarRating from "./StarRating.jsx";
import { submitFeedback } from "../../services/feedback.js";

export default function FeedbackForm({ eventId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) { setError("Selectează cel puțin o stea."); return; }
    setLoading(true);
    setError(null);
    try {
      await submitFeedback(eventId, { rating, comment: comment.trim() || null });
      setDone(true);
      onSubmitted?.({ rating, comment });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 rounded-2xl bg-[#A1D6CB]/30 px-4 py-3 text-sm text-teal-800"
      >
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-teal-600" />
        <span>
          Mulțumim pentru feedback!{" "}
          {"★".repeat(rating)}{"☆".repeat(5 - rating)}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/60 bg-white/80 p-5 backdrop-blur space-y-4"
    >
      <h3 className="font-display text-base font-bold text-[#272F54]">
        Lasă un feedback
      </h3>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#272F54]/60">
          Rating *
        </p>
        <StarRating rating={rating} onChange={setRating} size="lg" />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
          Comentariu (opțional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Cum a fost evenimentul? Ce ai putea îmbunătăți?"
          className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20 resize-none"
        />
      </div>

      {error && <p className="text-xs text-[#FF8383]">{error}</p>}

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-[#272F54] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e2544] disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Trimite feedback
      </button>
    </motion.form>
  );
}

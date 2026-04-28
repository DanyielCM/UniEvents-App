import { useState } from "react";
import { motion } from "framer-motion";

export default function StarRating({
  rating = 0,
  onChange,
  readOnly = false,
  size = "md",
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || rating;
  const sz = size === "sm" ? "text-lg" : size === "lg" ? "text-4xl" : "text-2xl";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          whileHover={!readOnly ? { scale: 1.2 } : {}}
          whileTap={!readOnly ? { scale: 0.9 } : {}}
          className={`${sz} leading-none transition-colors ${
            readOnly ? "cursor-default" : "cursor-pointer"
          } ${star <= display ? "text-yellow-400" : "text-slate-200"}`}
        >
          ★
        </motion.button>
      ))}
    </div>
  );
}

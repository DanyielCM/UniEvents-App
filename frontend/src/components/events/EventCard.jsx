import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Users, Wifi } from "lucide-react";

const MODALITY_LABEL = { physical: "Fizic", online: "Online", hybrid: "Hibrid" };
const PART_LABEL = { free: "Intrare liberă", registration: "Cu înscriere", ticketed: "Cu bilet" };

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function EventCard({ event, index = 0 }) {
  const color = event.category?.color_hex || "#83BDE5";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="glass-card-solid group relative flex flex-col overflow-hidden rounded-3xl"
    >
      {/* Top accent stripe */}
      <div className="h-1.5 w-full flex-shrink-0" style={{ background: color }} />

      {/* Cover image */}
      {event.cover_image_url ? (
        <img
          src={event.cover_image_url}
          alt=""
          className="h-40 w-full object-cover"
          style={{ objectPosition: event.cover_image_position || "50% 50%" }}
        />
      ) : (
        <div
          className="h-40 w-full"
          style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }}
        />
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {event.category && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white"
              style={{ backgroundColor: color }}
            >
              {event.category.name}
            </span>
          )}
          <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-[#272F54]/70 border border-[#272F54]/10">
            {MODALITY_LABEL[event.modality] || event.modality}
          </span>
          <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-[#272F54]/70 border border-[#272F54]/10">
            {PART_LABEL[event.participation_type] || event.participation_type}
          </span>
        </div>

        {/* Title */}
        <Link
          to={`/evenimente/${event.id}`}
          className="font-display text-lg font-bold leading-snug text-[#272F54] transition group-hover:text-[#272F54]/80 line-clamp-2"
        >
          {event.title}
        </Link>

        {/* Meta */}
        <div className="mt-auto space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{fmt(event.starts_at)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              {event.location.is_online ? (
                <Wifi className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="truncate">{event.location.name}</span>
            </div>
          )}
          {event.organizer && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">
                {event.organizer.first_name} {event.organizer.last_name}
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          to={`/evenimente/${event.id}`}
          className="mt-2 inline-flex items-center justify-center rounded-xl border border-[#272F54]/15 bg-white/80 py-2 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40 hover:bg-white"
        >
          Vezi detalii
        </Link>
      </div>
    </motion.article>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Edit3,
  Send,
  LogOut,
  ChevronRight,
  Users,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { getMyEvents, deleteEvent, submitEvent } from "../services/events.js";

const STATUS_META = {
  draft:     { label: "Draft",        color: "bg-slate-100 text-slate-600" },
  pending:   { label: "În așteptare", color: "bg-[#FFF574]/60 text-amber-800" },
  approved:  { label: "Aprobat",      color: "bg-[#A1D6CB]/50 text-teal-800" },
  rejected:  { label: "Respins",      color: "bg-[#FF8383]/40 text-rose-800" },
  cancelled: { label: "Anulat",       color: "bg-slate-100 text-slate-500" },
  completed: { label: "Finalizat",    color: "bg-[#A19AD3]/40 text-violet-800" },
};

const TABS = [
  { key: null,        label: "Toate" },
  { key: "draft",     label: "Draft" },
  { key: "pending",   label: "În așteptare" },
  { key: "approved",  label: "Aprobate" },
  { key: "rejected",  label: "Respinse" },
];

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function OrganizerEvents() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  async function load(statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyEvents(statusFilter);
      setEvents(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(activeTab); }, [activeTab]);

  async function handleDelete(event) {
    if (!window.confirm(`Ștergi evenimentul «${event.title}»?`)) return;
    setBusy(event.id);
    try {
      await deleteEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit(event) {
    setBusy(event.id);
    try {
      const updated = await submitEvent(event.id);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-white/40 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-[#272F54]">UniEvents USV</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-sm text-[#272F54]/70 hover:text-[#272F54] transition"
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#272F54]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
            >
              <LogOut className="h-4 w-4" />
              Deconectare
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-bold text-[#272F54]">Evenimentele mele</h1>
            <p className="mt-1 text-sm text-slate-600">
              Creează și gestionează evenimentele tale de pe platformă.
            </p>
          </div>
          <Link
            to="/organizator/eveniment/nou"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#272F54] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#1e2544] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Eveniment nou
          </Link>
        </motion.div>

        {/* Tabs */}
        <div className="mt-8 flex gap-1 rounded-2xl bg-white/60 p-1 backdrop-blur border border-white/50 w-fit shadow-sm">
          {TABS.map((tab) => (
            <button
              key={String(tab.key)}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[#272F54] text-white shadow"
                  : "text-[#272F54]/60 hover:text-[#272F54]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/60" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-[#FF8383]/20 p-4 text-sm text-rose-800">{error}</div>
          ) : events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/80 p-16 text-center backdrop-blur"
            >
              <Calendar className="h-12 w-12 text-[#272F54]/20" />
              <p className="font-display text-lg font-bold text-[#272F54]/50">
                Niciun eveniment {activeTab ? `cu status «${STATUS_META[activeTab]?.label}»` : ""}
              </p>
              <Link
                to="/organizator/eveniment/nou"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#272F54] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Creează primul eveniment
              </Link>
            </motion.div>
          ) : (
            <AnimatePresence>
              <div className="space-y-4">
                {events.map((event, i) => {
                  const sm = STATUS_META[event.status] ?? STATUS_META.draft;
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card-solid flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center"
                    >
                      {event.cover_image_url && (
                        <img
                          src={event.cover_image_url}
                          alt=""
                          className="h-20 w-28 flex-shrink-0 rounded-2xl object-cover"
                          style={{ objectPosition: event.cover_image_position || "50% 50%" }}
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sm.color}`}
                          >
                            {sm.label}
                          </span>
                          {event.category && (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                              style={{ backgroundColor: event.category.color_hex }}
                            >
                              {event.category.name}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 font-display text-lg font-bold text-[#272F54] truncate">
                          {event.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {fmt(event.starts_at)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.location.name}
                            </span>
                          )}
                        </div>
                        {event.status === "rejected" && event.rejection_reason && (
                          <p className="mt-1.5 text-xs text-rose-700 bg-[#FF8383]/10 rounded-lg px-2 py-1">
                            Motiv respingere: {event.rejection_reason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-shrink-0 gap-2">
                        {(event.status === "draft" || event.status === "rejected") && (
                          <button
                            onClick={() => navigate(`/organizator/eveniment/${event.id}/editeaza`)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#272F54]/20 bg-white px-3 py-2 text-xs font-semibold text-[#272F54] transition hover:border-[#272F54]/50"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Editează
                          </button>
                        )}
                        {event.status === "draft" && (
                          <button
                            disabled={busy === event.id}
                            onClick={() => handleSubmit(event)}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#83BDE5] px-3 py-2 text-xs font-semibold text-[#272F54] transition hover:bg-[#6aabdb] disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" /> Trimite spre validare
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/organizator/eveniment/${event.id}/materiale`)}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#272F54]/20 bg-white px-3 py-2 text-xs font-semibold text-[#272F54] transition hover:border-[#272F54]/50"
                        >
                          <FileText className="h-3.5 w-3.5" /> Materiale
                        </button>
                        {event.participation_type !== "free" && (
                          <button
                            onClick={() => navigate(`/organizator/eveniment/${event.id}/participanti`)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#272F54]/20 bg-white px-3 py-2 text-xs font-semibold text-[#272F54] transition hover:border-[#272F54]/50"
                          >
                            <Users className="h-3.5 w-3.5" /> Participanți
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/organizator/eveniment/${event.id}/statistici`)}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#272F54]/20 bg-white px-3 py-2 text-xs font-semibold text-[#272F54] transition hover:border-[#272F54]/50"
                        >
                          <BarChart2 className="h-3.5 w-3.5" /> Statistici
                        </button>
                        {(event.status === "draft" || event.status === "rejected") && (
                          <button
                            disabled={busy === event.id}
                            onClick={() => handleDelete(event)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#FF8383]/40 bg-[#FF8383]/10 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-[#FF8383]/20 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Șterge
                          </button>
                        )}
                        {event.status === "approved" && (
                          <span className="inline-flex items-center gap-1 rounded-xl border border-[#A1D6CB]/50 bg-[#A1D6CB]/20 px-3 py-2 text-xs font-semibold text-teal-700">
                            <ChevronRight className="h-3.5 w-3.5" /> Publicat
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}

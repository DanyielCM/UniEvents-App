import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Clock,
  LogOut,
  MapPin,
  Sparkles,
  Users,
  XCircle,
  Loader2,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { getPendingEvents, approveEvent, rejectEvent } from "../services/events.js";

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const MODALITY_LABEL = { physical: "Fizic", online: "Online", hybrid: "Hibrid" };

export default function AdminEventsValidation() {
  const { logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { event }
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    setLoading(true);
    try {
      setEvents(await getPendingEvents());
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(event) {
    setBusy(event.id);
    try {
      await approveEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function handleRejectConfirm() {
    if (!rejectReason.trim()) return;
    const event = rejectModal;
    setBusy(event.id);
    setRejectModal(null);
    try {
      await rejectEvent(event.id, rejectReason.trim());
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
      setRejectReason("");
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
            <Link to="/dashboard" className="text-sm text-[#272F54]/70 hover:text-[#272F54] transition">
              Dashboard
            </Link>
            <Link to="/admin/cereri-organizatori" className="text-sm text-[#272F54]/70 hover:text-[#272F54] transition">
              Cereri organizatori
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
        >
          <h1 className="font-display text-3xl font-bold text-[#272F54]">
            Validare evenimente
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Evenimentele de mai jos au fost trimise de organizatori și așteaptă aprobarea ta.
          </p>
        </motion.div>

        <div className="mt-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-3xl bg-white/60" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/80 p-16 text-center backdrop-blur"
            >
              <CheckCircle className="h-12 w-12 text-[#A1D6CB]" />
              <p className="font-display text-lg font-bold text-[#272F54]/60">
                Niciun eveniment în așteptare
              </p>
              <p className="text-sm text-slate-500">
                Toate evenimentele au fost procesate. Revino mai târziu.
              </p>
            </motion.div>
          ) : (
            <AnimatePresence>
              <div className="space-y-5">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card-solid rounded-3xl p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      {event.cover_image_url && (
                        <img
                          src={event.cover_image_url}
                          alt=""
                          className="h-24 w-36 flex-shrink-0 rounded-2xl object-cover"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 items-center">
                          {event.category && (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                              style={{ backgroundColor: event.category.color_hex }}
                            >
                              {event.category.name}
                            </span>
                          )}
                          <span className="rounded-full bg-[#FFF574]/60 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            În așteptare
                          </span>
                          <span className="text-xs text-slate-400">
                            {MODALITY_LABEL[event.modality]}
                          </span>
                        </div>

                        <h3 className="mt-2 font-display text-xl font-bold text-[#272F54]">
                          {event.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                          {event.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {fmt(event.starts_at)} → {fmt(event.ends_at)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.location.name}
                            </span>
                          )}
                          {event.capacity && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {event.capacity} locuri
                            </span>
                          )}
                          <span className="font-medium text-[#272F54]/60">
                            Organizator: {event.organizer.first_name} {event.organizer.last_name}
                            {" "}({event.organizer.email})
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 gap-2 sm:flex-col">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={busy === event.id}
                          onClick={() => handleApprove(event)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#A1D6CB] px-5 py-2.5 text-sm font-semibold text-teal-900 shadow transition hover:bg-[#8dc5ba] disabled:opacity-50"
                        >
                          {busy === event.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Aprobă
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          disabled={busy === event.id}
                          onClick={() => {
                            setRejectModal(event);
                            setRejectReason("");
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#FF8383]/20 px-5 py-2.5 text-sm font-semibold text-rose-800 border border-[#FF8383]/40 transition hover:bg-[#FF8383]/30 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Respinge
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#272F54]/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
              <h3 className="font-display text-lg font-bold text-[#272F54] mb-1">
                Respinge evenimentul
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                «{rejectModal.title}»
              </p>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                Motiv *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explică de ce evenimentul nu poate fi publicat..."
                className="w-full rounded-xl border border-[#272F54]/15 bg-slate-50 px-4 py-2.5 text-sm text-[#272F54] outline-none focus:border-[#FF8383] focus:ring-2 focus:ring-[#FF8383]/20 resize-none"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setRejectModal(null)}
                  className="rounded-xl border border-[#272F54]/20 px-4 py-2 text-sm font-semibold text-[#272F54] hover:border-[#272F54]/40 transition"
                >
                  Anulează
                </button>
                <button
                  disabled={!rejectReason.trim()}
                  onClick={handleRejectConfirm}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF8383] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e86f6f] disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Respinge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

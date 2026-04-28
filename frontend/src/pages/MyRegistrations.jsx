import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  QrCode,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { getMyRegistrations, cancelRegistration } from "../services/registrations.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const STATUS_META = {
  confirmed:  { label: "Confirmat",   color: "bg-[#A1D6CB]/40 text-teal-800" },
  waitlisted: { label: "În așteptare", color: "bg-[#FFF574]/60 text-amber-800" },
  cancelled:  { label: "Anulat",      color: "bg-slate-100 text-slate-500" },
  attended:   { label: "Participat",  color: "bg-[#A19AD3]/40 text-violet-800" },
};

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

async function downloadFile(url, filename) {
  const token = localStorage.getItem("access_token");
  try {
    const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) throw new Error();
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

export default function MyRegistrations() {
  const { logout } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState(null); // registration
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    getMyRegistrations()
      .then(setRegistrations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(reg) {
    if (!window.confirm(`Anulezi înscrierea la «${reg.event.title}»?`)) return;
    setBusy(reg.id);
    try {
      await cancelRegistration(reg.event_id);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, status: "cancelled" } : r))
      );
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  const active = registrations.filter((r) => r.status !== "cancelled");
  const cancelled = registrations.filter((r) => r.status === "cancelled");

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-white/40 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-[#272F54]">UniEvents USV</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-[#272F54]/70 hover:text-[#272F54]">Dashboard</Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#272F54]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#272F54] hover:border-[#272F54]/40"
            >
              <LogOut className="h-4 w-4" /> Deconectare
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-3xl font-bold text-[#272F54]">Înscrierile mele</h1>
          <p className="mt-1 text-sm text-slate-600">
            Evenimentele la care te-ai înregistrat, biletele QR și statusul participării.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#272F54]/40" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/80 py-16 text-center backdrop-blur">
            <Ticket className="h-12 w-12 text-[#272F54]/20" />
            <p className="font-display text-lg font-bold text-[#272F54]/50">Nicio înscriere momentan</p>
            <Link to="/evenimente" className="mt-1 text-sm text-[#83BDE5] hover:underline">
              Descoperă evenimente →
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {active.map((reg, i) => {
              const sm = STATUS_META[reg.status] ?? STATUS_META.confirmed;
              const ev = reg.event;
              return (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card-solid flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center"
                >
                  {ev.cover_image_url && (
                    <img
                      src={ev.cover_image_url}
                      alt=""
                      className="h-20 w-28 flex-shrink-0 rounded-2xl object-cover"
                      style={{ objectPosition: ev.cover_image_position || "50% 50%" }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sm.color}`}>
                        {sm.label}
                      </span>
                    </div>
                    <Link
                      to={`/evenimente/${ev.id}`}
                      className="mt-1.5 block font-display text-lg font-bold text-[#272F54] truncate hover:underline"
                    >
                      {ev.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {fmt(ev.starts_at)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {ev.location.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    {reg.status === "confirmed" && (
                      <>
                        <button
                          onClick={() => setQrModal(reg)}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#272F54] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1e2544]"
                        >
                          <QrCode className="h-3.5 w-3.5" /> Bilet QR
                        </button>
                        <button
                          disabled={busy === reg.id}
                          onClick={() => handleCancel(reg)}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#FF8383]/40 bg-[#FF8383]/10 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-[#FF8383]/20 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" /> Anulează
                        </button>
                      </>
                    )}
                    {reg.status === "attended" && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-[#A19AD3]/30 px-3 py-2 text-xs font-semibold text-violet-800">
                        <CheckCircle className="h-3.5 w-3.5" /> Ai participat
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {cancelled.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-[#272F54]/50 hover:text-[#272F54]">
                  {cancelled.length} înscrieri anulate
                </summary>
                <div className="mt-3 space-y-2">
                  {cancelled.map((reg) => (
                    <div key={reg.id} className="rounded-2xl border border-white/40 bg-white/50 px-4 py-3 text-sm text-slate-500 flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{reg.event.title}</span>
                      <span className="ml-auto flex-shrink-0">{fmt(reg.event.starts_at)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </main>

      {/* QR Modal */}
      <AnimatePresence>
        {qrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#272F54]/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setQrModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center"
            >
              <button
                onClick={() => setQrModal(null)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:text-slate-600"
              />
              <h3 className="font-display text-lg font-bold text-[#272F54] mb-1">Biletul tău QR</h3>
              <p className="text-sm text-slate-500 mb-4 truncate">{qrModal.event.title}</p>
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={`${API_BASE}/registrations/${qrModal.id}/qr.png`}
                alt="QR Ticket"
                className="mx-auto w-48 rounded-2xl shadow"
              />
              <p className="mt-3 font-mono text-xs text-slate-400 break-all">
                {qrModal.ticket_token?.slice(0, 20)}…
              </p>
              <button
                onClick={() => downloadFile(`${API_BASE}/registrations/${qrModal.id}/qr.png`, `ticket-${qrModal.id}.png`)}
                className="mt-4 w-full rounded-xl bg-[#272F54] py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e2544]"
              >
                Descarcă QR
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

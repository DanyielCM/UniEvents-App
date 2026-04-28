import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  Download,
  Loader2,
  LogOut,
  QrCode,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from "recharts";

import StarRating from "../components/feedback/StarRating.jsx";
import { useAuth } from "../hooks/useAuth";
import { getParticipants, checkinParticipant } from "../services/registrations.js";
import { getEvent } from "../services/events.js";
import { getEventFeedback, getEventFeedbackSummary } from "../services/feedback.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const STATUS_META = {
  confirmed:  { label: "Confirmat",   color: "bg-[#A1D6CB]/40 text-teal-800" },
  waitlisted: { label: "În așteptare", color: "bg-[#FFF574]/60 text-amber-800" },
  cancelled:  { label: "Anulat",      color: "bg-slate-100 text-slate-500" },
  attended:   { label: "Participat",  color: "bg-[#A19AD3]/40 text-violet-800" },
};

const TABS = [
  { key: null,        label: "Toți" },
  { key: "confirmed", label: "Confirmați" },
  { key: "attended",  label: "Participați" },
  { key: "cancelled", label: "Anulați" },
  { key: "feedback",  label: "Feedback" },
];

const CHART_COLORS = ["#FF8383", "#FFB899", "#FFF574", "#A1D6CB", "#8DC9A0"];

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function OrganizerParticipants() {
  const { id: eventId } = useParams();
  const { logout } = useAuth();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [busy, setBusy] = useState(null);
  const [manualToken, setManualToken] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const tokenInputRef = useRef(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  async function loadParticipants(statusFilter) {
    setLoading(true);
    try {
      const data = await getParticipants(eventId, statusFilter);
      setParticipants(data);
    } catch {
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getEvent(eventId).then(setEvent).catch(() => {});
    loadParticipants(activeTab);
  }, [eventId]);

  useEffect(() => {
    if (activeTab === "feedback") {
      setFeedbackLoading(true);
      Promise.all([getEventFeedback(eventId), getEventFeedbackSummary(eventId)])
        .then(([list, summary]) => { setFeedbackList(list); setFeedbackSummary(summary); })
        .catch(() => {})
        .finally(() => setFeedbackLoading(false));
    } else {
      loadParticipants(activeTab);
    }
  }, [activeTab]);

  async function handleCheckin(ticketToken) {
    setBusy(ticketToken);
    setCheckinResult(null);
    try {
      const p = await checkinParticipant(eventId, ticketToken);
      setCheckinResult({
        ok: true,
        message: `✓ ${p.user.first_name} ${p.user.last_name} — check-in efectuat!`,
      });
      setManualToken("");
      await loadParticipants(activeTab);
    } catch (e) {
      setCheckinResult({ ok: false, message: e.message });
    } finally {
      setBusy(null);
      setTimeout(() => setCheckinResult(null), 4000);
    }
  }

  async function handleExport() {
    const token = localStorage.getItem("access_token");
    try {
      const resp = await fetch(`${API_BASE}/registrations/events/${eventId}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error();
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `participanti-eveniment-${eventId}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Export eșuat");
    }
  }

  const confirmed = participants.filter((p) => p.status === "confirmed").length;
  const attended = participants.filter((p) => p.status === "attended").length;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-white/40 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-[#272F54]">UniEvents USV</span>
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#272F54]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#272F54] hover:border-[#272F54]/40"
          >
            <LogOut className="h-4 w-4" /> Deconectare
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link to="/organizator/evenimente" className="inline-flex items-center gap-1 text-sm text-[#272F54]/60 hover:text-[#272F54] mb-5">
            <ArrowLeft className="h-4 w-4" /> Înapoi la evenimentele mele
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#272F54]">Participanți</h1>
              {event && <p className="mt-0.5 text-sm text-slate-600">{event.title}</p>}
              <div className="mt-2 flex gap-4 text-sm">
                <span className="text-[#272F54]/70">
                  <strong>{confirmed}</strong> confirmați
                </span>
                <span className="text-[#272F54]/70">
                  <strong>{attended}</strong> participați
                </span>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#272F54]/20 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] hover:border-[#272F54]/40"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>

          {/* Manual check-in */}
          <div className="mt-6 rounded-2xl border border-white/60 bg-white/80 p-4 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="h-4 w-4 text-[#272F54]/60" />
              <span className="text-sm font-semibold text-[#272F54]">Check-in manual prin token</span>
            </div>
            <div className="flex gap-2">
              <input
                ref={tokenInputRef}
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && manualToken.trim() && handleCheckin(manualToken.trim())}
                placeholder="Lipește sau introdu token-ul biletului…"
                className="flex-1 rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 font-mono text-sm text-[#272F54] outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
              />
              <button
                disabled={!manualToken.trim() || busy === manualToken.trim()}
                onClick={() => handleCheckin(manualToken.trim())}
                className="inline-flex items-center gap-1 rounded-xl bg-[#272F54] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#1e2544]"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Check-in
              </button>
            </div>
            <AnimatePresence>
              {checkinResult && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-2 text-sm font-semibold ${checkinResult.ok ? "text-teal-700" : "text-rose-700"}`}
                >
                  {checkinResult.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Status tabs */}
          <div className="mt-6 flex gap-1 rounded-2xl bg-white/60 p-1 backdrop-blur border border-white/50 w-fit shadow-sm">
            {TABS.map((tab) => (
              <button
                key={String(tab.key)}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
                  activeTab === tab.key ? "bg-[#272F54] text-white shadow" : "text-[#272F54]/60 hover:text-[#272F54]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Feedback tab content */}
          {activeTab === "feedback" && (
            <div className="mt-4 space-y-5">
              {feedbackLoading ? (
                <div className="h-40 animate-pulse rounded-3xl bg-white/60" />
              ) : (
                <>
                  {/* Summary + chart */}
                  {feedbackSummary && feedbackSummary.count > 0 ? (
                    <div className="glass-card-solid rounded-3xl p-5">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="font-display text-4xl font-bold text-[#272F54]">
                          {feedbackSummary.avg_rating?.toFixed(1) ?? "—"}
                        </span>
                        <div>
                          <StarRating rating={Math.round(feedbackSummary.avg_rating || 0)} readOnly />
                          <p className="text-xs text-slate-500 mt-1">
                            {feedbackSummary.count} recenzi{feedbackSummary.count === 1 ? "e" : "i"}
                          </p>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart
                          data={[1, 2, 3, 4, 5].map((r) => ({
                            name: `${r}★`,
                            count: feedbackSummary.distribution?.[r] || 0,
                          }))}
                          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                        >
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {[1, 2, 3, 4, 5].map((r) => (
                              <Cell key={r} fill={CHART_COLORS[r - 1]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-white/60 bg-white/80 py-12 text-center text-sm text-[#272F54]/50">
                      Niciun feedback primit încă.
                    </div>
                  )}

                  {/* Feedback list */}
                  {feedbackList.length > 0 && (
                    <div className="space-y-3">
                      {feedbackList.map((fb, i) => (
                        <motion.div
                          key={fb.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="glass-card-solid rounded-2xl p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#272F54]/10 text-xs font-bold text-[#272F54]">
                                {fb.user.first_name[0]}{fb.user.last_name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#272F54]">
                                  {fb.user.first_name} {fb.user.last_name}
                                </p>
                                <StarRating rating={fb.rating} readOnly size="sm" />
                              </div>
                            </div>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {new Date(fb.submitted_at).toLocaleDateString("ro-RO")}
                            </span>
                          </div>
                          {fb.comment && (
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                              "{fb.comment}"
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Participants table */}
          <div className="mt-4">
            {activeTab === "feedback" ? null : loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/60" />)}
              </div>
            ) : participants.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/60 bg-white/80 py-14 text-center">
                <Users className="h-10 w-10 text-[#272F54]/20" />
                <p className="text-sm text-[#272F54]/50">Niciun participant{activeTab ? ` cu status «${activeTab}»` : ""}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((p, i) => {
                  const sm = STATUS_META[p.status] ?? STATUS_META.confirmed;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass-card-solid flex items-center gap-4 rounded-2xl p-4"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#272F54]/10 font-display font-bold text-sm text-[#272F54]">
                        {p.user.first_name[0]}{p.user.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#272F54]">
                          {p.user.first_name} {p.user.last_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{p.user.email}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
                        <span>{fmt(p.registered_at)}</span>
                        {p.checked_in_at && <span className="text-violet-600">✓ {fmt(p.checked_in_at)}</span>}
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${sm.color}`}>
                        {sm.label}
                      </span>
                      {p.status === "confirmed" && p.ticket_token && (
                        <button
                          disabled={busy === p.ticket_token}
                          onClick={() => handleCheckin(p.ticket_token)}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#A1D6CB]/50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-[#A1D6CB]/70 disabled:opacity-50 flex-shrink-0"
                        >
                          {busy === p.ticket_token ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          )}
                          Check-in
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

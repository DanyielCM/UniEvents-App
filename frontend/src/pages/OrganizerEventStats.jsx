import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  ArrowLeft, CheckCircle, Loader2, LogOut, Sparkles,
  Star, TrendingUp, Users,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { getEvent } from "../services/events.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const CHART_COLORS = ["#FF8383", "#FFB899", "#FFF574", "#A1D6CB", "#8DC9A0"];

async function fetchStats(eventId) {
  const token = localStorage.getItem("access_token");
  const resp = await fetch(`${API_BASE}/events/${eventId}/stats`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)] backdrop-blur"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#272F54]/50 mb-2">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="font-display text-3xl font-bold text-[#272F54]">{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </motion.div>
  );
}

export default function OrganizerEventStats() {
  const { id: eventId } = useParams();
  const { logout } = useAuth();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getEvent(eventId), fetchStats(eventId)])
      .then(([ev, st]) => { setEvent(ev); setStats(st); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  const distData = stats
    ? [1, 2, 3, 4, 5].map((r) => ({
        name: `${r}★`,
        count: stats.rating_distribution[r] || 0,
      }))
    : [];

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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#272F54]/40" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-[#FF8383]/20 p-4 text-sm text-rose-800">{error}</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Link to="/organizator/evenimente" className="inline-flex items-center gap-1 text-sm text-[#272F54]/60 hover:text-[#272F54] mb-5">
              <ArrowLeft className="h-4 w-4" /> Înapoi la evenimente
            </Link>

            <h1 className="font-display text-2xl font-bold text-[#272F54]">Statistici eveniment</h1>
            {event && <p className="mt-0.5 text-sm text-slate-600">{event.title}</p>}

            {/* KPI grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={Users}
                label="Total înscriși"
                value={stats.total_registrations}
                sub={`Capacitate: ${stats.capacity ?? "nelimitată"}`}
                color="#8EAEE0"
              />
              <KpiCard
                icon={CheckCircle}
                label="Au participat"
                value={stats.attended}
                sub={`${stats.confirmed} confirmați`}
                color="#8DC9A0"
              />
              <KpiCard
                icon={TrendingUp}
                label="Rată prezență"
                value={stats.show_up_rate != null ? `${stats.show_up_rate}%` : "—"}
                sub="Din cei confirmați"
                color="#FFB899"
              />
              <KpiCard
                icon={Star}
                label="Rating mediu"
                value={stats.avg_rating?.toFixed(1) ?? "—"}
                sub={`${stats.feedback_count} recenzii`}
                color="#FFF574"
              />
            </div>

            {/* Occupancy bar */}
            {stats.capacity && (
              <div className="mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-[#272F54]">Ocupare capacitate</span>
                  <span className="text-sm text-slate-500">
                    {stats.confirmed + stats.attended} / {stats.capacity} locuri
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-[#272F54]/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "#83BDE5" }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(stats.occupancy_rate || 0, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {stats.occupancy_rate?.toFixed(1) ?? 0}% ocupat
                  {stats.cancelled > 0 && ` · ${stats.cancelled} anulate`}
                  {stats.waitlisted > 0 && ` · ${stats.waitlisted} în așteptare`}
                </p>
              </div>
            )}

            {/* Rating distribution chart */}
            {stats.feedback_count > 0 && (
              <div className="mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]">
                <h2 className="font-display text-base font-bold text-[#272F54] mb-4">
                  Distribuție rating-uri
                </h2>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={distData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} label={{ position: "top", fontSize: 12 }}>
                      {distData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Registration breakdown */}
            <div className="mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]">
              <h2 className="font-display text-base font-bold text-[#272F54] mb-4">
                Detalii înscrieri
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Confirmați", val: stats.confirmed, color: "#A1D6CB" },
                  { label: "Participați", val: stats.attended, color: "#8DC9A0" },
                  { label: "Anulate",    val: stats.cancelled, color: "#FF8383" },
                  { label: "Așteptare", val: stats.waitlisted, color: "#FFF574" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="rounded-2xl p-4" style={{ backgroundColor: `${color}30` }}>
                    <p className="text-xs font-semibold text-[#272F54]/60">{label}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-[#272F54]">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

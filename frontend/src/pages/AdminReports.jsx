import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, Legend,
} from "recharts";
import {
  CalendarDays, Loader2, LogOut, Sparkles, Star,
  TrendingUp, Users,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const COLORS = ["#8EAEE0", "#A1D6CB", "#FFB899", "#8DC9A0", "#A19AD3", "#E6A1C0", "#FFF574", "#FF8383", "#83BDE5", "#272F54", "#8DC9A0", "#FFB899"];

async function apiFetch(path) {
  const token = localStorage.getItem("access_token");
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function KpiCard({ icon: Icon, label, value, color }) {
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
    </motion.div>
  );
}

export default function AdminReports() {
  const { logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/admin/reports/overview"),
      apiFetch(`/admin/reports/monthly?year=${year}`),
      apiFetch("/admin/reports/organizers"),
    ])
      .then(([ov, mo, org]) => {
        setOverview(ov);
        setMonthly(mo);
        setOrganizers(org);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  const monthlyChartData = monthly?.months.filter((m) => m.events_count > 0) || [];
  const eventsInYear = monthly?.months.reduce((s, m) => s + m.events_count, 0) || 0;

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
            <Link to="/dashboard" className="text-sm text-[#272F54]/70 hover:text-[#272F54]">Dashboard</Link>
            <Link to="/admin/validare-evenimente" className="text-sm text-[#272F54]/70 hover:text-[#272F54]">Validare</Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#272F54]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#272F54] hover:border-[#272F54]/40"
            >
              <LogOut className="h-4 w-4" /> Deconectare
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-3xl font-bold text-[#272F54]">Rapoarte platformă</h1>
          <p className="mt-1 text-sm text-slate-600">Statistici agregate pentru întreaga platformă UniEvents USV.</p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#272F54]/40" />
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl bg-[#FF8383]/20 p-4 text-sm text-rose-800">{error}</div>
        ) : (
          <>
            {/* Overview KPIs */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard icon={CalendarDays} label="Événements totale" value={overview.total_events} color="#8EAEE0" />
              <KpiCard icon={Users} label="Înscrieri totale" value={overview.total_registrations} color="#A1D6CB" />
              <KpiCard icon={Star} label="Rating mediu" value={overview.avg_rating?.toFixed(1)} color="#FFF574" />
              <KpiCard icon={TrendingUp} label="Organizatori activi" value={overview.total_organizers} color="#FFB899" />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-center backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#272F54]/50">Aprobate</p>
                <p className="font-display text-2xl font-bold text-[#272F54] mt-1">{overview.approved_events}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-center backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#272F54]/50">În așteptare</p>
                <p className="font-display text-2xl font-bold text-amber-700 mt-1">{overview.pending_events}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-center backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#272F54]/50">Studenți</p>
                <p className="font-display text-2xl font-bold text-[#272F54] mt-1">{overview.total_students}</p>
              </div>
            </div>

            {/* Monthly chart */}
            <div className="mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#272F54]">
                    Evenimente pe luni — {year}
                  </h2>
                  <p className="text-xs text-slate-500">{eventsInYear} evenimente în total</p>
                </div>
                <div className="flex gap-1">
                  {[year - 1, year, year + 1].map((y) => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                        y === year ? "bg-[#272F54] text-white" : "border border-[#272F54]/20 text-[#272F54]/60 hover:text-[#272F54]"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
              {monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={monthly.months}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="month_name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, name) => [value, name === "events_count" ? "evenimente" : "înscrieri"]}
                    />
                    <Bar dataKey="events_count" name="events_count" radius={[4, 4, 0, 0]}>
                      {monthly.months.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-sm text-[#272F54]/40 py-10">Niciun eveniment aprobat în {year}.</p>
              )}
            </div>

            {/* Organizers table */}
            {organizers.length > 0 && (
              <div className="mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]">
                <h2 className="font-display text-base font-bold text-[#272F54] mb-4">
                  Statistici organizatori
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#272F54]/10 text-xs font-semibold uppercase tracking-wider text-[#272F54]/50">
                        <th className="pb-2 text-left">#</th>
                        <th className="pb-2 text-left">Organizator</th>
                        <th className="pb-2 text-right">Evenimente</th>
                        <th className="pb-2 text-right">Participanți</th>
                        <th className="pb-2 text-right">Rating mediu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizers.map((org, i) => (
                        <motion.tr
                          key={org.organizer.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-[#272F54]/5 hover:bg-[#272F54]/3"
                        >
                          <td className="py-3 text-slate-400 font-semibold">{i + 1}</td>
                          <td className="py-3">
                            <div>
                              <p className="font-semibold text-[#272F54]">
                                {org.organizer.first_name} {org.organizer.last_name}
                              </p>
                              <p className="text-xs text-slate-500">{org.organizer.email}</p>
                            </div>
                          </td>
                          <td className="py-3 text-right font-semibold text-[#272F54]">
                            {org.events_count}
                          </td>
                          <td className="py-3 text-right text-[#272F54]/70">
                            {org.total_participants}
                          </td>
                          <td className="py-3 text-right">
                            {org.avg_rating ? (
                              <span className="font-semibold text-[#272F54]">
                                ⭐ {org.avg_rating.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

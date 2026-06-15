import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Frown,
  Loader2,
  Meh,
  MessageSquare,
  Smile,
  Star,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { getEvent } from '../services/events.js';
import { getEventFeedback, getEventFeedbackSummary } from '../services/feedback.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const CHART_COLORS = ['#FF8383', '#FFB899', '#FFF574', '#A1D6CB', '#8DC9A0'];

const SENTIMENT_INFO = {
  positive: { label: 'Pozitiv', icon: Smile, color: '#1f7a52', bg: '#A1D6CB' },
  neutral: { label: 'Neutru', icon: Meh, color: '#6b7280', bg: '#e5e7eb' },
  negative: { label: 'Negativ', icon: Frown, color: '#b3433f', bg: '#FF8383' },
};

function SentimentBadge({ sentiment }) {
  const info = SENTIMENT_INFO[sentiment];
  if (!info) return null;
  const Icon = info.icon;
  return (
    <span
      className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold'
      style={{ backgroundColor: `${info.bg}55`, color: info.color }}
    >
      <Icon className='h-3 w-3' />
      {info.label}
    </span>
  );
}

async function fetchStats(eventId) {
  const token = localStorage.getItem('access_token');
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
      className='relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)] backdrop-blur'
    >
      <div className='absolute inset-x-0 top-0 h-3' style={{ background: color }} />
      <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#272F54]/50 mb-2'>
        <Icon className='h-4 w-4' />
        {label}
      </div>
      <p className='font-display text-3xl font-bold text-[#272F54]'>
        {value ?? '—'}
      </p>
      {sub && <p className='mt-0.5 text-xs text-slate-500'>{sub}</p>}
    </motion.div>
  );
}

function StarDisplay({ rating, max = 5 }) {
  return (
    <div className='flex gap-0.5'>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'fill-[#FFF574] text-amber-400' : 'text-[#272F54]/15'
          }`}
        />
      ))}
    </div>
  );
}

export default function OrganizerEventStats() {
  const { id: eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getEvent(eventId),
      fetchStats(eventId),
      getEventFeedback(eventId).catch(() => []),
      getEventFeedbackSummary(eventId).catch(() => null),
    ])
      .then(([ev, st, fb, fbSummary]) => {
        setEvent(ev);
        setStats(st);
        setFeedback(fb);
        setFeedbackSummary(fbSummary);
      })
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
    <div className='min-h-screen bg-gradient-hero'>
      <Navbar maxWidth='max-w-5xl' />

      <main className='mx-auto max-w-5xl px-4 py-10'>
        {loading ? (
          <div className='flex items-center justify-center py-20'>
            <Loader2 className='h-8 w-8 animate-spin text-[#272F54]/40' />
          </div>
        ) : error ? (
          <div className='rounded-2xl bg-[#FF8383]/20 p-4 text-sm text-rose-800'>
            {error}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              to='/organizator/evenimente'
              className='inline-flex items-center gap-1 text-sm text-[#272F54]/60 hover:text-[#272F54] mb-5'
            >
              <ArrowLeft className='h-4 w-4' /> Înapoi la evenimente
            </Link>

            <h1 className='font-display text-2xl font-bold text-[#272F54]'>
              Statistici eveniment
            </h1>
            {event && (
              <p className='mt-0.5 text-sm text-slate-600'>{event.title}</p>
            )}

            {/* KPI grid */}
            <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <KpiCard
                icon={Users}
                label='Total înscriși'
                value={stats.total_registrations}
                sub={`Capacitate: ${stats.capacity ?? 'nelimitată'}`}
                color='#8EAEE0'
              />
              <KpiCard
                icon={XCircle}
                label='Înscrieri anulate'
                value={stats.cancelled}
                sub={`${stats.waitlisted} în așteptare`}
                color='#FFB899'
              />
              <KpiCard
                icon={TrendingUp}
                label='Rată prezență'
                value={
                  stats.show_up_rate != null ? `${stats.show_up_rate}%` : '—'
                }
                sub={
                  stats.show_up_rate != null
                    ? 'Pe baza codurilor QR scanate'
                    : 'Nu există date disponibile'
                }
                color='#8DC9A0'
              />
              <KpiCard
                icon={Star}
                label='Rating mediu'
                value={stats.avg_rating?.toFixed(1) ?? '—'}
                sub={`${stats.feedback_count} recenzii`}
                color='#FFF574'
              />
            </div>

            {/* Occupancy bar */}
            {stats.capacity && (
              <div className='mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]'>
                <div className='flex justify-between mb-2'>
                  <span className='text-sm font-semibold text-[#272F54]'>
                    Ocupare capacitate
                  </span>
                  <span className='text-sm text-slate-500'>
                    {stats.confirmed + stats.attended} / {stats.capacity} locuri
                  </span>
                </div>
                <div className='h-3 w-full rounded-full bg-[#272F54]/10 overflow-hidden'>
                  <motion.div
                    className='h-full rounded-full'
                    style={{ background: '#83BDE5' }}
                    initial={{ width: '0%' }}
                    animate={{
                      width: `${Math.min(stats.occupancy_rate || 0, 100)}%`,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <p className='mt-1 text-xs text-slate-500'>
                  {stats.occupancy_rate?.toFixed(1) ?? 0}% ocupat
                  {stats.cancelled > 0 && ` · ${stats.cancelled} anulate`}
                  {stats.waitlisted > 0 &&
                    ` · ${stats.waitlisted} în așteptare`}
                </p>
              </div>
            )}

            {/* Rating distribution chart */}
            {stats.feedback_count > 0 && (
              <div className='mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]'>
                <h2 className='font-display text-base font-bold text-[#272F54] mb-4'>
                  Distribuție rating-uri
                </h2>
                <ResponsiveContainer width='100%' height={160}>
                  <BarChart
                    data={distData}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey='name' tick={{ fontSize: 13 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar
                      dataKey='count'
                      radius={[6, 6, 0, 0]}
                      label={{ position: 'top', fontSize: 12 }}
                    >
                      {distData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Feedback de la participanți */}
            <div className='mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]'>
              <div className='flex flex-wrap items-center justify-between gap-2 mb-4'>
                <div className='flex items-center gap-2'>
                  <MessageSquare className='h-5 w-5 text-[#272F54]/60' />
                  <h2 className='font-display text-base font-bold text-[#272F54]'>
                    Feedback de la participanți
                  </h2>
                </div>
                {feedbackSummary?.sentiment_counts && (
                  <div className='flex flex-wrap items-center gap-2'>
                    {Object.entries(SENTIMENT_INFO).map(([key, info]) => {
                      const Icon = info.icon;
                      return (
                        <span
                          key={key}
                          className='inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold'
                          style={{ backgroundColor: `${info.bg}55`, color: info.color }}
                        >
                          <Icon className='h-3 w-3' />
                          {feedbackSummary.sentiment_counts[key] ?? 0}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {feedback.length === 0 ? (
                <p className='text-sm text-slate-400 text-center py-6'>
                  Nu există feedback pentru acest eveniment.
                </p>
              ) : (
                <div className='space-y-3'>
                  {feedback.map((fb) => (
                    <div
                      key={fb.id}
                      className='flex items-start gap-4 rounded-2xl border border-[#272F54]/8 bg-white/70 px-4 py-3'
                    >
                      <div className='flex-shrink-0 pt-0.5'>
                        <StarDisplay rating={fb.rating} />
                        <span className='mt-1 block text-xs font-semibold text-[#272F54]/50'>
                          {fb.rating}/5
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex flex-wrap items-start gap-2'>
                          {fb.comment ? (
                            <p className='flex-1 min-w-0 text-sm text-[#272F54]/80 leading-relaxed'>
                              {fb.comment}
                            </p>
                          ) : (
                            <p className='flex-1 min-w-0 text-sm italic text-slate-400'>
                              Fără comentariu
                            </p>
                          )}
                          <SentimentBadge sentiment={fb.sentiment} />
                        </div>
                        <p className='mt-1 text-xs text-slate-400'>
                          {new Date(fb.submitted_at).toLocaleDateString(
                            'ro-RO',
                            { day: 'numeric', month: 'long', year: 'numeric' },
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

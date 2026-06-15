import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart2,
  CalendarDays,
  CalendarCheck,
  Heart,
  History,
  Mail,
  Sparkles,
  ShieldCheck,
  Users,
  PlusCircle,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../hooks/useAuth';
import { getRecommendedEvents } from '../services/events.js';

const ROLE_LABELS = {
  admin: 'Administrator',
  organizer: 'Organizator',
  student: 'Student',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    if (user?.role !== 'student') return;
    getRecommendedEvents(6)
      .then(setRecommended)
      .catch(() => setRecommended([]));
  }, [user]);

  return (
    <div className='min-h-screen bg-gradient-hero'>
      <Navbar />

      <main className='mx-auto max-w-6xl px-4 py-10'>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <h1 className='font-display text-3xl font-bold text-[#272F54] sm:text-4xl'>
            Bun venit, {user?.first_name}!
          </h1>
          <p className='mt-1 text-sm text-slate-600'>
            Iată un rezumat al contului tău pe UniEvents USV.
          </p>
        </motion.div>

        <div className='mt-8 grid gap-4 sm:grid-cols-3'>
          <StatCard
            icon={ShieldCheck}
            label='Rol'
            value={ROLE_LABELS[user?.role] ?? user?.role}
            tone='#83BDE5'
          />
          <StatCard
            icon={Mail}
            label='Email'
            value={user?.email}
            tone='#A19AD3'
            small
          />
          <StatCard
            icon={CalendarDays}
            label='Membru din'
            value={
              user?.created_at
                ? new Date(user.created_at).toLocaleDateString('ro-RO')
                : '—'
            }
            tone='#FFB899'
          />
        </div>

        {user?.role === 'admin' && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className='mt-8 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.35)] backdrop-blur'
          >
            <div className='flex items-center gap-2 mb-3'>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white'>
                <Users className='h-5 w-5' />
              </div>
              <h2 className='font-display text-lg font-bold text-[#272F54]'>
                Panou administrator
              </h2>
            </div>
            <p className='text-sm text-slate-600 mb-4'>
              Gestionează conturile organizatorilor și validează evenimentele
              trimise spre publicare.
            </p>
            <div className='flex flex-wrap gap-3'>
              <Link
                to='/admin/cereri-organizatori'
                className='inline-flex items-center gap-2 rounded-xl bg-[#272F54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e2544]'
              >
                <Users className='h-4 w-4' />
                Cereri organizatori
              </Link>
              <Link
                to='/admin/validare-evenimente'
                className='inline-flex items-center gap-2 rounded-xl bg-[#FFF574]/80 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-[#FFF574]'
              >
                <CalendarCheck className='h-4 w-4' />
                Validare evenimente
              </Link>
              <Link
                to='/admin/rapoarte'
                className='inline-flex items-center gap-2 rounded-xl border border-[#272F54]/20 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40'
              >
                <BarChart2 className='h-4 w-4' />
                Rapoarte
              </Link>
              <Link
                to='/evenimente?archived=1'
                className='inline-flex items-center gap-2 rounded-xl border border-[#272F54]/20 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40'
              >
                <History className='h-4 w-4' />
                Evenimente încheiate
              </Link>
              <Link
                to='/admin/utilizatori'
                className='inline-flex items-center gap-2 rounded-xl border border-[#272F54]/20 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40'
              >
                <Users className='h-4 w-4' />
                Utilizatori
              </Link>
            </div>
          </motion.section>
        )}

        {user?.role === 'organizer' && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className='mt-8 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.35)] backdrop-blur'
          >
            <div className='flex items-center gap-2 mb-3'>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#A19AD3] text-white'>
                <CalendarDays className='h-5 w-5' />
              </div>
              <h2 className='font-display text-lg font-bold text-[#272F54]'>
                Evenimentele tale
              </h2>
            </div>
            <p className='text-sm text-slate-600 mb-4'>
              Creează, editează și trimite spre publicare evenimentele tale.
            </p>
            <div className='flex flex-wrap gap-3'>
              <Link
                to='/organizator/evenimente'
                className='inline-flex items-center gap-2 rounded-xl bg-[#272F54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e2544]'
              >
                <CalendarDays className='h-4 w-4' />
                Evenimentele mele
              </Link>
              <Link
                to='/organizator/eveniment/nou'
                className='inline-flex items-center gap-2 rounded-xl bg-[#A19AD3]/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8f87c2]'
              >
                <PlusCircle className='h-4 w-4' />
                Eveniment nou
              </Link>
            </div>
          </motion.section>
        )}

        {user?.role === 'student' && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className='mt-8 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.35)] backdrop-blur'
          >
            <div className='flex items-center gap-2 mb-3'>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#83BDE5] text-white'>
                <CalendarDays className='h-5 w-5' />
              </div>
              <h2 className='font-display text-lg font-bold text-[#272F54]'>
                Student
              </h2>
            </div>
            <p className='text-sm text-slate-600 mb-4'>
              Descoperă evenimente, înscrie-te și vizualizează biletele QR de
              participare.
            </p>
            <div className='flex flex-wrap gap-3'>
              <Link
                to='/evenimente'
                className='inline-flex items-center gap-2 rounded-xl bg-[#272F54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e2544]'
              >
                <CalendarDays className='h-4 w-4' />
                Descoperă evenimente
              </Link>
              <Link
                to='/inscrierile-mele'
                className='inline-flex items-center gap-2 rounded-xl bg-[#83BDE5]/80 px-4 py-2 text-sm font-semibold text-[#272F54] transition hover:bg-[#83BDE5]'
              >
                Înscrierile mele
              </Link>
              <Link
                to='/evenimente-favorite'
                className='inline-flex items-center gap-2 rounded-xl border border-[#272F54]/20 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40'
              >
                <Heart className='h-4 w-4' />
                Evenimente favorite
              </Link>
            </div>
          </motion.section>
        )}

        {user?.role === 'student' && recommended.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className='mt-8 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.35)] backdrop-blur'
          >
            <div className='flex items-center gap-2 mb-4'>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFB899] text-white'>
                <Sparkles className='h-5 w-5' />
              </div>
              <h2 className='font-display text-lg font-bold text-[#272F54]'>
                Recomandate pentru tine
              </h2>
            </div>
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {recommended.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, small }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className='relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.3)] backdrop-blur'
    >
      <div
        className='absolute inset-x-0 top-0 h-1.5'
        style={{ background: tone }}
      />
      <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#272F54]/60'>
        <Icon className='h-4 w-4' />
        {label}
      </div>
      <p
        className={`mt-2 font-display font-bold text-[#272F54] ${small ? 'text-base break-all' : 'text-2xl'}`}
      >
        {value || '—'}
      </p>
    </motion.div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  ShieldOff,
  Users,
} from 'lucide-react';

import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';
import { getUsers, updateUser } from '../services/users.js';

const ROLE_TABS = [
  { key: '', label: 'Toți' },
  { key: 'student', label: 'Studenți' },
  { key: 'organizer', label: 'Organizatori' },
  { key: 'admin', label: 'Administratori' },
];

const ROLE_LABELS = {
  student: 'Student',
  organizer: 'Organizator',
  admin: 'Administrator',
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [activeOnly, setActiveOnly] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, page: 1, size: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [banner, setBanner] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getUsers({
      role: role || undefined,
      q: q || undefined,
      is_active: activeOnly || undefined,
      page,
      size: 20,
    })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [role, q, activeOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [role, q, activeOnly]);

  async function handleRoleChange(targetUser, newRole) {
    setBusyId(targetUser.id);
    setBanner(null);
    try {
      await updateUser(targetUser.id, { role: newRole });
      await load();
    } catch (e) {
      setBanner({ kind: 'error', text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(targetUser) {
    setBusyId(targetUser.id);
    setBanner(null);
    try {
      await updateUser(targetUser.id, { is_active: !targetUser.is_active });
      await load();
    } catch (e) {
      setBanner({ kind: 'error', text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  const pages = Math.max(1, Math.ceil(data.total / data.size));

  return (
    <div className='min-h-screen bg-gradient-hero'>
      <Navbar />
      <div className='mx-auto max-w-6xl px-4 py-8'>
        <div className='mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h1 className='font-display text-3xl font-bold text-[#272F54] sm:text-4xl'>
              Utilizatori
            </h1>
            <p className='mt-1 text-sm text-slate-600'>
              Gestionează rolurile și starea conturilor de pe platformă.
            </p>
          </div>
        </div>

        <div className='mt-6 flex flex-wrap items-center gap-3'>
          <div className='inline-flex rounded-2xl border border-[#272F54]/10 bg-white/80 p-1 shadow-sm backdrop-blur'>
            {ROLE_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setRole(t.key)}
                className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  role === t.key
                    ? 'text-white'
                    : 'text-[#272F54]/70 hover:text-[#272F54]'
                }`}
              >
                {role === t.key && (
                  <motion.span
                    layoutId='role-tab-pill'
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    className='absolute inset-0 rounded-xl bg-[#272F54]'
                  />
                )}
                <span className='relative'>{t.label}</span>
              </button>
            ))}
          </div>

          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#272F54]/40' />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Caută după nume sau email…'
              className='w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-[#272F54] shadow-sm transition focus:border-[#83BDE5] focus:outline-none focus:ring-2 focus:ring-[#83BDE5]/40'
            />
          </div>

          <div className='inline-flex rounded-2xl border border-[#272F54]/10 bg-white/80 p-1 shadow-sm backdrop-blur'>
            {[
              { key: '', label: 'Toate' },
              { key: 'true', label: 'Active' },
              { key: 'false', label: 'Dezactivate' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveOnly(t.key)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeOnly === t.key
                    ? 'bg-[#83BDE5] text-white'
                    : 'text-[#272F54]/70 hover:text-[#272F54]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className='mt-6 rounded-xl border border-[#FF8383]/50 bg-[#FF8383]/15 px-4 py-3 text-sm text-[#7a1e1e]'
          >
            {banner.text}
          </motion.div>
        )}

        {error && (
          <div className='mt-6 rounded-xl border border-[#FF8383]/50 bg-[#FF8383]/15 px-4 py-3 text-sm text-[#7a1e1e]'>
            {error}
          </div>
        )}

        <div className='mt-6 rounded-3xl border border-white/60 bg-white/85 p-5 backdrop-blur shadow-[0_8px_24px_-12px_rgba(39,47,84,0.2)]'>
          {loading ? (
            <div className='space-y-2'>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className='h-12 animate-pulse rounded-xl bg-white/60' />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className='py-10 text-center'>
              <Users className='mx-auto h-10 w-10 text-[#272F54]/20' />
              <p className='mt-3 font-display text-lg font-bold text-[#272F54]/50'>
                Niciun utilizator găsit
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b border-[#272F54]/10 text-xs font-semibold uppercase tracking-wider text-[#272F54]/50'>
                    <th className='pb-2 text-left'>Utilizator</th>
                    <th className='pb-2 text-left'>Rol</th>
                    <th className='pb-2 text-left'>Stare</th>
                    <th className='pb-2 text-right'>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr
                        key={u.id}
                        className='border-b border-[#272F54]/5 hover:bg-[#272F54]/3'
                      >
                        <td className='py-3'>
                          <p className='font-semibold text-[#272F54]'>
                            {u.first_name} {u.last_name}
                            {isSelf && (
                              <span className='ml-2 rounded-full bg-[#83BDE5]/25 px-2 py-0.5 text-xs font-semibold text-[#272F54]'>
                                Tu
                              </span>
                            )}
                          </p>
                          <p className='text-xs text-slate-500'>
                            {u.email}
                            {u.organization && ` · ${u.organization}`}
                          </p>
                        </td>
                        <td className='py-3'>
                          <select
                            value={u.role}
                            disabled={isSelf || busyId === u.id}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className='rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm text-[#272F54] shadow-sm transition focus:border-[#83BDE5] focus:outline-none focus:ring-2 focus:ring-[#83BDE5]/40 disabled:opacity-60'
                          >
                            {Object.entries(ROLE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className='py-3'>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              u.is_active
                                ? 'bg-[#A1D6CB]/40 text-teal-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {u.is_active ? 'Activ' : 'Dezactivat'}
                          </span>
                        </td>
                        <td className='py-3 text-right'>
                          <button
                            disabled={isSelf || busyId === u.id}
                            onClick={() => handleToggleActive(u)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                              u.is_active
                                ? 'border-[#FF8383]/40 bg-[#FF8383]/10 text-rose-700 hover:bg-[#FF8383]/20'
                                : 'border-[#8DC9A0]/40 bg-[#8DC9A0]/10 text-[#1f4d3f] hover:bg-[#8DC9A0]/20'
                            }`}
                          >
                            {u.is_active ? (
                              <>
                                <ShieldOff className='h-3.5 w-3.5' /> Dezactivează
                              </>
                            ) : (
                              <>
                                <ShieldCheck className='h-3.5 w-3.5' /> Activează
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && data.items.length > 0 && (
            <div className='mt-4 flex items-center justify-between text-sm text-slate-500'>
              <span>
                Pagina {data.page} din {pages} · {data.total} utilizatori
              </span>
              <div className='flex gap-2'>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className='inline-flex items-center gap-1 rounded-xl border border-[#272F54]/20 px-3 py-1.5 font-semibold text-[#272F54] transition hover:border-[#272F54]/40 disabled:opacity-40'
                >
                  <ChevronLeft className='h-4 w-4' /> Anterior
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className='inline-flex items-center gap-1 rounded-xl border border-[#272F54]/20 px-3 py-1.5 font-semibold text-[#272F54] transition hover:border-[#272F54]/40 disabled:opacity-40'
                >
                  Următor <ChevronRight className='h-4 w-4' />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

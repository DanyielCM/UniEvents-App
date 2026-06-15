import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, ChevronDown, Filter, List, Search, X } from 'lucide-react';

import Navbar from '../components/Navbar';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../hooks/useAuth';
import {
  getCategories,
  getPublicEvents,
  getPublicOrganizers,
} from '../services/events.js';
import {
  addFavorite,
  getMyFavoriteIds,
  removeFavorite,
} from '../services/favorites.js';

const MODALITY_OPTIONS = [
  { value: '', label: 'Toate modalitățile' },
  { value: 'physical', label: 'Fizic' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hibrid' },
];

const SORT_OPTIONS = [
  { value: 'starts_at', label: 'Cele mai apropiate' },
  { value: '-starts_at', label: 'Cele mai recente' },
  { value: 'title', label: 'Titlu (A-Z)' },
];

function Chip({ label, onRemove }) {
  return (
    <span className='inline-flex items-center gap-1 rounded-full bg-[#272F54]/10 px-3 py-1 text-xs font-semibold text-[#272F54]'>
      {label}
      <button
        onClick={onRemove}
        className='ml-0.5 rounded-full hover:bg-[#272F54]/20 p-0.5'
      >
        <X className='h-3 w-3' />
      </button>
    </span>
  );
}

function SelectInput({ value, onChange, className = '', children }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className='w-full appearance-none rounded-xl border border-[#272F54]/15 bg-white/80 pl-3 pr-8 py-2 text-sm text-[#272F54] outline-none focus:border-[#83BDE5]'
      >
        {children}
      </select>
      <ChevronDown className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#272F54]/50' />
    </div>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [view, setView] = useState('list');
  const [events, setEvents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [includeEnded, setIncludeEnded] = useState(
    searchParams.get('archived') === '1',
  );
  const [filters, setFilters] = useState({
    q: '',
    category_id: '',
    organizer_id: '',
    modality: '',
    date_from: '',
    date_to: '',
    sort: 'starts_at',
  });

  const inputRef = useRef(null);

  // Load support data once
  useEffect(() => {
    Promise.all([getCategories(), getPublicOrganizers().catch(() => [])])
      .then(([cats, orgs]) => {
        setCategories(cats);
        setOrganizers(orgs);
      })
      .catch(() => {});
  }, []);

  // Load favorite IDs for students
  useEffect(() => {
    if (user?.role !== 'student') return;
    getMyFavoriteIds()
      .then((ids) => setFavoriteIds(new Set(ids)))
      .catch(() => {});
  }, [user]);

  async function toggleFavorite(event) {
    const isFav = favoriteIds.has(event.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(event.id);
      else next.add(event.id);
      return next;
    });
    try {
      if (isFav) await removeFavorite(event.id);
      else await addFavorite(event.id);
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(event.id);
        else next.delete(event.id);
        return next;
      });
    }
  }

  // Load events when filters or page changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = { ...filters, page, size: 12 };
    if (includeEnded) params.include_ended = true;
    // Strip empty strings
    for (const k of Object.keys(params)) {
      if (params[k] === '' || params[k] === false || params[k] == null)
        delete params[k];
    }

    getPublicEvents(params)
      .then((data) => {
        if (!cancelled) {
          setEvents(data.items);
          setTotal(data.total);
          setPages(data.pages);
        }
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, page, includeEnded]);

  // Load all approved events for calendar (larger batch)
  useEffect(() => {
    if (view !== 'calendar') return;
    getPublicEvents({ sort: 'starts_at', size: 200 })
      .then((data) => setCalendarEvents(data.items))
      .catch(() => setCalendarEvents([]));
  }, [view]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearAllFilters() {
    setSearchInput('');
    setFilters({
      q: '',
      category_id: '',
      organizer_id: '',
      modality: '',
      date_from: '',
      date_to: '',
      sort: 'starts_at',
    });
    setPage(1);
  }

  function applySearch(e) {
    e.preventDefault();
    setFilter('q', searchInput.trim());
  }

  const activeFilterCount = [
    filters.q,
    filters.category_id,
    filters.organizer_id,
    filters.modality,
    filters.date_from,
    filters.date_to,
  ].filter(Boolean).length;

  const calFCEvents = calendarEvents.map((e) => ({
    id: String(e.id),
    title: e.title,
    start: e.starts_at,
    end: e.ends_at,
    backgroundColor: e.category?.color_hex || '#272F54',
    borderColor: e.category?.color_hex || '#272F54',
  }));

  return (
    <div className='min-h-screen bg-gradient-hero'>
      <Navbar />

      <main className='mx-auto max-w-6xl px-4 py-10'>
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-8'
        >
          <h1 className='font-display text-3xl font-bold text-[#272F54]'>
            Evenimente USV
          </h1>
          <p className='mt-1 text-sm text-slate-600'>
            {total > 0
              ? `${total} eveniment${total !== 1 ? 'e' : ''} disponibil${total !== 1 ? 'e' : ''}`
              : 'Caută și filtrează evenimente'}
          </p>
        </motion.div>

        {/* Search + controls bar */}
        <div className='flex flex-wrap gap-3 mb-5'>
          <form onSubmit={applySearch} className='flex flex-1 min-w-56 gap-2'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#272F54]/40 pointer-events-none' />
              <input
                ref={inputRef}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder='Caută după titlu sau descriere…'
                className='w-full rounded-xl border border-[#272F54]/15 bg-white/80 pl-9 pr-4 py-2 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20'
              />
            </div>
            <button
              type='submit'
              className='rounded-xl bg-[#272F54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e2544]'
            >
              Caută
            </button>
          </form>

          <div className='flex gap-2'>
            <SelectInput
              value={filters.sort}
              onChange={(e) => setFilter('sort', e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectInput>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                showFilters || activeFilterCount > 0
                  ? 'border-[#272F54] bg-[#272F54] text-white'
                  : 'border-[#272F54]/20 bg-white/80 text-[#272F54]'
              }`}
            >
              <Filter className='h-4 w-4' />
              Filtre {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>

            {/* View toggle */}
            <div className='flex rounded-xl border border-[#272F54]/15 bg-white/80 overflow-hidden'>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 transition ${view === 'list' ? 'bg-[#272F54] text-white' : 'text-[#272F54]/60 hover:text-[#272F54]'}`}
                title='Vizualizare listă'
              >
                <List className='h-4 w-4' />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`px-3 py-2 transition ${view === 'calendar' ? 'bg-[#272F54] text-white' : 'text-[#272F54]/60 hover:text-[#272F54]'}`}
                title='Vizualizare calendar'
              >
                <Calendar className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className='mb-5 rounded-2xl border border-white/60 bg-white/80 p-5 backdrop-blur grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
          >
            <div>
              <label className='block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1'>
                Categorie
              </label>
              <SelectInput
                value={filters.category_id}
                onChange={(e) => setFilter('category_id', e.target.value)}
                className='w-full'
              >
                <option value=''>Toate categoriile</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className='block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1'>
                Modalitate
              </label>
              <SelectInput
                value={filters.modality}
                onChange={(e) => setFilter('modality', e.target.value)}
                className='w-full'
              >
                {MODALITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className='block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1'>
                De la data
              </label>
              <input
                type='date'
                value={filters.date_from}
                onChange={(e) => setFilter('date_from', e.target.value)}
                className='w-full rounded-xl border border-[#272F54]/15 bg-white px-3 py-2 text-sm text-[#272F54] outline-none focus:border-[#83BDE5]'
              />
            </div>
            <div>
              <label className='block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1'>
                Până la data
              </label>
              <input
                type='date'
                value={filters.date_to}
                onChange={(e) => setFilter('date_to', e.target.value)}
                className='w-full rounded-xl border border-[#272F54]/15 bg-white px-3 py-2 text-sm text-[#272F54] outline-none focus:border-[#83BDE5]'
              />
            </div>
            <div>
              <label className='block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1'>
                Organizator
              </label>
              <SelectInput
                value={filters.organizer_id}
                onChange={(e) => setFilter('organizer_id', e.target.value)}
                className='w-full'
              >
                <option value=''>Toți organizatorii</option>
                {organizers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.organization ||
                      [o.first_name, o.last_name].filter(Boolean).join(' ')}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div className='sm:col-span-2 lg:col-span-4 flex items-center justify-between flex-wrap gap-3'>
              <label className='inline-flex items-center gap-2 cursor-pointer select-none'>
                <input
                  type='checkbox'
                  checked={includeEnded}
                  onChange={(e) => {
                    setIncludeEnded(e.target.checked);
                    setPage(1);
                  }}
                  className='h-4 w-4 rounded border-[#272F54]/30 accent-[#272F54]'
                />
                <span className='text-sm font-medium text-[#272F54]/70'>
                  Evenimente arhivate
                </span>
              </label>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className='text-sm text-rose-600 hover:text-rose-800 font-semibold transition'
                >
                  Șterge toate filtrele
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && !showFilters && (
          <div className='mb-4 flex flex-wrap gap-2'>
            {filters.q && (
              <Chip
                label={`"${filters.q}"`}
                onRemove={() => {
                  setSearchInput('');
                  setFilter('q', '');
                }}
              />
            )}
            {filters.category_id && (
              <Chip
                label={
                  categories.find((c) => String(c.id) === filters.category_id)
                    ?.name || 'Categorie'
                }
                onRemove={() => setFilter('category_id', '')}
              />
            )}
            {filters.modality && (
              <Chip
                label={
                  { physical: 'Fizic', online: 'Online', hybrid: 'Hibrid' }[
                    filters.modality
                  ]
                }
                onRemove={() => setFilter('modality', '')}
              />
            )}
          </div>
        )}

        {/* Content */}
        {view === 'calendar' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='rounded-3xl border border-white/60 bg-white/90 p-4 backdrop-blur shadow-[0_10px_40px_-20px_rgba(39,47,84,0.2)]'
          >
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView='dayGridMonth'
              events={calFCEvents}
              eventClick={(info) => navigate(`/evenimente/${info.event.id}`)}
              height='auto'
              buttonText={{ today: 'Azi', month: 'Lună' }}
            />
          </motion.div>
        ) : loading ? (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className='h-72 animate-pulse rounded-3xl bg-white/60'
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className='flex flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/80 p-16 text-center backdrop-blur'>
            <Calendar className='h-12 w-12 text-[#272F54]/20' />
            <p className='font-display text-lg font-bold text-[#272F54]/50'>
              Niciun eveniment găsit
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className='text-sm text-[#83BDE5] hover:underline'
              >
                Șterge filtrele
              </button>
            )}
          </div>
        ) : (
          <>
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {events.map((event, i) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={i}
                  isFavorite={favoriteIds.has(event.id)}
                  onToggleFavorite={
                    user?.role === 'student' ? toggleFavorite : undefined
                  }
                />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className='mt-8 flex items-center justify-center gap-2'>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className='rounded-xl border border-[#272F54]/20 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] disabled:opacity-40 hover:border-[#272F54]/40 transition'
                >
                  ← Anterior
                </button>
                <span className='text-sm text-[#272F54]/60'>
                  Pagina {page} din {pages}
                </span>
                <button
                  disabled={page === pages}
                  onClick={() => setPage((p) => p + 1)}
                  className='rounded-xl border border-[#272F54]/20 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] disabled:opacity-40 hover:border-[#272F54]/40 transition'
                >
                  Următor →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

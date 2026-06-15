import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Loader2 } from 'lucide-react';

import Navbar from '../components/Navbar';
import EventCard from '../components/events/EventCard';
import { getMyFavorites, removeFavorite } from '../services/favorites.js';

export default function MyFavorites() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMyFavorites()
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(event) {
    setEvents((prev) => prev.filter((e) => e.id !== event.id));
    try {
      await removeFavorite(event.id);
    } catch {
      // ignore — list stays without the item even if the request fails
    }
  }

  return (
    <div className='min-h-screen bg-gradient-hero'>
      <Navbar />

      <main className='mx-auto max-w-6xl px-4 py-10'>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='mb-8'
        >
          <h1 className='font-display text-3xl font-bold text-[#272F54]'>
            Evenimente favorite
          </h1>
          <p className='mt-1 text-sm text-slate-600'>
            Evenimentele pe care le-ai marcat ca favorite.
          </p>
        </motion.div>

        {loading ? (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className='h-72 animate-pulse rounded-3xl bg-white/60'
              />
            ))}
          </div>
        ) : error ? (
          <div className='rounded-2xl bg-[#FF8383]/20 p-4 text-sm text-rose-800'>
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className='flex flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/80 p-16 text-center backdrop-blur'>
            <Heart className='h-12 w-12 text-[#272F54]/20' />
            <p className='font-display text-lg font-bold text-[#272F54]/50'>
              Nu ai niciun eveniment favorit
            </p>
            <Link
              to='/evenimente'
              className='text-sm text-[#83BDE5] hover:underline'
            >
              Descoperă evenimente
            </Link>
          </div>
        ) : (
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {events.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                index={i}
                isFavorite
                onToggleFavorite={handleRemove}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

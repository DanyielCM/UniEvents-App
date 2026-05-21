import { Link } from 'react-router-dom';
import { LogOut, Sparkles } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';

export default function Navbar({
  maxWidth = 'max-w-6xl',
  sticky = true,
  children,
}) {
  const { user, logout } = useAuth();

  return (
    <header
      className={`border-b border-white/40 bg-white/70 backdrop-blur${sticky ? ' sticky top-0 z-10' : ''}`}
    >
      <div
        className={`mx-auto flex ${maxWidth} items-center justify-between gap-4 px-4 py-4`}
      >
        <Link to='/' className='flex items-center gap-2'>
          <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white shadow'>
            <Sparkles className='h-5 w-5' />
          </div>
          <span className='font-display text-xl font-bold text-[#272F54]'>
            UniEvents USV
          </span>
        </Link>

        <div className='flex items-center gap-3'>
          {children}

          {user ? (
            <>
              <Link
                to='/dashboard'
                className='rounded-xl bg-[#272F54] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1e2544]'
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className='inline-flex items-center gap-1.5 rounded-xl border border-[#272F54]/15 bg-white px-3 py-2 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40'
              >
                <LogOut className='h-4 w-4' />
                Deconectare
              </button>
            </>
          ) : (
            <Link
              to='/login'
              className='rounded-xl border border-[#272F54]/15 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40'
            >
              Autentificare
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

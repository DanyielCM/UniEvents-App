import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";

import EventCard from "../components/events/EventCard";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../hooks/useAuth";
import { loginWithGoogle } from "../services/auth";
import { getPublicEvents } from "../services/events.js";

export default function Landing() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    getPublicEvents({ sort: "starts_at", size: 6 })
      .then((data) => setUpcomingEvents(data.items || []))
      .catch(() => {});
  }, []);

  async function handleGoogleSuccess(tokenResponse) {
    setError("");
    setPending(true);
    try {
      await loginWithGoogle(tokenResponse.access_token);
      await refreshUser();
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div
        className="floating-blob -top-20 right-0 h-80 w-80"
        style={{ background: "#83BDE5" }}
      />
      <div
        className="floating-blob top-60 -left-24 h-96 w-96"
        style={{ background: "#A1D6CB", animationDelay: "4s" }}
      />

      <header className="relative z-10 border-b border-white/40 bg-white/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-[#272F54]">
              UniEvents USV
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-xl bg-[#272F54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e2544]"
                >
                  Deschide dashboard
                </Link>
                <button
                  onClick={logout}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Deconectare
                </button>
              </>
            ) : (
              <>
                <div className="hidden sm:block">
                  <GoogleSignInButton
                    onSuccess={handleGoogleSuccess}
                    onError={() =>
                      setError(
                        "Autentificarea cu Google nu a putut fi finalizată.",
                      )
                    }
                    label="Student — conectare cu Google"
                    disabled={pending}
                    className="!py-2 !px-4 !text-[13px]"
                  />
                </div>
                <Link
                  to="/login"
                  className="rounded-xl border border-[#272F54]/15 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
                >
                  Autentificare organizator/admin
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <section className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#83BDE5]/40 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#272F54]/80"
          >
            <span className="h-2 w-2 rounded-full bg-[#83BDE5]" />
            Platforma oficială USV
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl"
          >
            <span className="text-gradient-brand">Evenimente universitare</span>
            <br />
            <span className="text-[#272F54]">
              care prind viață la Suceava
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg"
          >
            Descoperă, înscrie-te și participă la evenimentele organizate de
            Universitatea „Ștefan cel Mare" din Suceava — academice, de carieră,
            culturale, sportive, sociale sau de voluntariat.
          </motion.p>

          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mx-auto mt-8 flex max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
            >
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setError(
                    "Autentificarea cu Google nu a putut fi finalizată.",
                  )
                }
                disabled={pending}
              />
              <Link
                to="/cerere-organizator"
                className="inline-flex items-center justify-center rounded-2xl border border-[#272F54]/15 bg-white/80 px-5 py-3 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40 hover:bg-white"
              >
                Vreau să devin organizator
              </Link>
            </motion.div>
          )}

          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-[#FF8383]/60 bg-[#FF8383]/15 px-4 py-3 text-sm text-[#7a1e1e]">
              {error}
            </div>
          )}
        </section>

        <section className="mt-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#272F54] sm:text-3xl">
                Ce urmează pe campus
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Cele mai apropiate evenimente aprobate.
              </p>
            </div>
            <Link
              to="/evenimente"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#272F54]/70 hover:text-[#272F54] transition"
            >
              Vezi toate <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/60 bg-white/70 py-14 text-center backdrop-blur">
              <CalendarDays className="h-10 w-10 text-[#272F54]/20" />
              <p className="text-sm text-[#272F54]/50">
                Niciun eveniment publicat momentan. Revino curând!
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-center sm:hidden">
            <Link
              to="/evenimente"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#272F54]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
            >
              Toate evenimentele <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mt-16 border-t border-white/40 bg-white/50 py-6 text-center text-xs text-[#272F54]/70 backdrop-blur">
        © {new Date().getFullYear()} UniEvents USV · Universitatea „Ștefan cel
        Mare" din Suceava
      </footer>
    </div>
  );
}

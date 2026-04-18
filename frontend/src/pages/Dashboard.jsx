import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";

const ROLE_LABELS = {
  admin: "Administrator",
  organizer: "Organizator",
  student: "Student",
};

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-white/40 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-[#272F54]">
              UniEvents USV
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm shadow-sm sm:flex">
              <UserCircle2 className="h-4 w-4 text-[#272F54]/60" />
              <span className="text-[#272F54]">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="rounded-full bg-[#83BDE5]/25 px-2 py-0.5 text-xs font-semibold text-[#272F54]">
                {ROLE_LABELS[user?.role] ?? user?.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#272F54]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
            >
              <LogOut className="h-4 w-4" />
              Deconectare
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <h1 className="font-display text-3xl font-bold text-[#272F54] sm:text-4xl">
            Bun venit, {user?.first_name}!
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Iată un rezumat al contului tău pe UniEvents USV.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={ShieldCheck}
            label="Rol"
            value={ROLE_LABELS[user?.role] ?? user?.role}
            tone="#83BDE5"
          />
          <StatCard
            icon={Mail}
            label="Email"
            value={user?.email}
            tone="#A19AD3"
            small
          />
          <StatCard
            icon={CalendarDays}
            label="Membru din"
            value={
              user?.created_at
                ? new Date(user.created_at).toLocaleDateString("ro-RO")
                : "—"
            }
            tone="#FFB899"
          />
        </div>

        {user?.role === "admin" && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-8 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.35)] backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-bold text-[#272F54]">
                Panou administrator
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Administrezi conturile platformei și aprobi cereri noi de
              organizatori.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/admin/cereri-organizatori"
                className="inline-flex items-center gap-2 rounded-xl bg-[#272F54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e2544]"
              >
                Cereri organizatori
              </Link>
            </div>
          </motion.section>
        )}

        {user?.role === "organizer" && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-8 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.35)] backdrop-blur"
          >
            <h2 className="font-display text-lg font-bold text-[#272F54]">
              Evenimentele tale
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              De aici vei putea crea și gestiona evenimentele. Funcționalitatea
              va fi disponibilă în curând.
            </p>
          </motion.section>
        )}

        {user?.role === "student" && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-8 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.35)] backdrop-blur"
          >
            <h2 className="font-display text-lg font-bold text-[#272F54]">
              Evenimentele mele
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Vei vedea aici evenimentele la care te-ai înscris și codurile QR
              de participare.
            </p>
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
      className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.3)] backdrop-blur"
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: tone }}
      />
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#272F54]/60">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p
        className={`mt-2 font-display font-bold text-[#272F54] ${
          small ? "text-base break-all" : "text-2xl"
        }`}
      >
        {value || "—"}
      </p>
    </motion.div>
  );
}

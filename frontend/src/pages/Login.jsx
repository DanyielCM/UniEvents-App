import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  GraduationCap,
  KeyRound,
  Mail,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../hooks/useAuth";
import { loginWithCredentials, loginWithGoogle } from "../services/auth";

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "onTouched" });
  const [serverError, setServerError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [googlePending, setGooglePending] = useState(false);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  async function onSubmitCredentials(data) {
    setServerError("");
    try {
      await loginWithCredentials(data.email, data.password);
      await refreshUser();
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.message);
    }
  }

  async function handleGoogleSuccess(tokenResponse) {
    setGoogleError("");
    setGooglePending(true);
    try {
      await loginWithGoogle(tokenResponse.access_token);
      await refreshUser();
      navigate("/dashboard");
    } catch (err) {
      setGoogleError(err.message);
    } finally {
      setGooglePending(false);
    }
  }

  function handleGoogleError() {
    setGoogleError(
      "Nu am putut finaliza autentificarea cu Google. Încearcă din nou.",
    );
    setGooglePending(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div
        className="floating-blob -top-20 -left-20 h-80 w-80"
        style={{ background: "#83BDE5" }}
      />
      <div
        className="floating-blob top-40 -right-24 h-96 w-96"
        style={{ background: "#A19AD3", animationDelay: "3s" }}
      />
      <div
        className="floating-blob bottom-0 left-1/3 h-72 w-72"
        style={{ background: "#FFB899", animationDelay: "6s" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#272F54]/80 transition hover:text-[#272F54]"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la evenimente
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-8 text-center sm:mt-12"
        >
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient-brand">Bine ai revenit</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-slate-600">
            Alege modul de autentificare potrivit rolului tău în comunitatea
            UniEvents USV.
          </p>
        </motion.div>

        <div className="mt-10 grid flex-1 gap-6 md:grid-cols-2 md:gap-8">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card flex flex-col rounded-3xl p-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A1D6CB]/60">
                <GraduationCap className="h-6 w-6 text-[#272F54]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#272F54]/60">
                  Studenți
                </p>
                <h2 className="font-display text-xl font-bold text-[#272F54]">
                  Intră cu contul tău USV
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Folosește adresa ta instituțională{" "}
              <span className="font-medium text-[#272F54]">
                @student.usv.ro
              </span>
              . Nu ai nevoie de parolă — te autentifici cu un singur clic prin
              Google.
            </p>

            <div className="mt-6">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={googlePending}
              />
            </div>

            {googleError && (
              <div className="mt-4 rounded-xl border border-[#FF8383]/60 bg-[#FF8383]/15 px-4 py-3 text-sm text-[#7a1e1e]">
                {googleError}
              </div>
            )}

            <div className="mt-auto pt-6">
              <div className="rounded-2xl border border-[#83BDE5]/30 bg-[#83BDE5]/10 p-4 text-xs text-[#272F54]/80">
                <p className="font-semibold">Ce primești ca student?</p>
                <ul className="mt-2 space-y-1">
                  <li>• Înscrieri rapide la evenimente</li>
                  <li>• Cod QR personal pentru check-in</li>
                  <li>• Istoric participări și diplome digitale</li>
                </ul>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card flex flex-col rounded-3xl p-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#A19AD3]/50">
                <UserCog className="h-6 w-6 text-[#272F54]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#272F54]/60">
                  Organizatori și Administratori
                </p>
                <h2 className="font-display text-xl font-bold text-[#272F54]">
                  Autentificare organizator/admin
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Accesează contul tău cu email și parolă. Valabil pentru personalul
              USV, asociații studențești și organizatori externi aprobați.
            </p>

            {serverError && (
              <div className="mt-4 rounded-xl border border-[#FF8383]/60 bg-[#FF8383]/15 px-4 py-3 text-sm text-[#7a1e1e]">
                {serverError}
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmitCredentials)}
              className="mt-5 space-y-4"
              noValidate
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#272F54]/70"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#272F54]/40" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nume@domeniu.ro"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-3 text-sm text-[#272F54] placeholder:text-slate-400 shadow-sm transition focus:border-[#83BDE5] focus:outline-none focus:ring-2 focus:ring-[#83BDE5]/40"
                    {...register("email", {
                      required: "Te rugăm să introduci emailul.",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Format de email invalid.",
                      },
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-[#c63a3a]">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#272F54]/70"
                >
                  Parolă
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#272F54]/40" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-3 text-sm text-[#272F54] placeholder:text-slate-400 shadow-sm transition focus:border-[#83BDE5] focus:outline-none focus:ring-2 focus:ring-[#83BDE5]/40"
                    {...register("password", {
                      required: "Te rugăm să introduci parola.",
                    })}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-[#c63a3a]">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#272F54] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(39,47,84,0.55)] transition hover:bg-[#1e2544] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#83BDE5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                {isSubmitting ? "Se autentifică…" : "Autentifică-te"}
              </motion.button>
            </form>

            <div className="mt-6 border-t border-[#272F54]/10 pt-4 text-sm text-slate-600">
              Nu ai cont de organizator?{" "}
              <Link
                to="/cerere-organizator"
                className="font-semibold text-[#272F54] underline decoration-[#83BDE5] decoration-2 underline-offset-4 transition hover:text-[#1e2544]"
              >
                Trimite o cerere
              </Link>
              .
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

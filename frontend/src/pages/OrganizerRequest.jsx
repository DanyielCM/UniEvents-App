import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  Mail,
  MessageSquareText,
  Sparkles,
  User,
} from "lucide-react";

const ORGANIZER_TYPES = [
  { value: "usv_staff", label: "Membru USV (cadru didactic / personal)" },
  { value: "usv_association", label: "Asociație studențească USV / club USV" },
  { value: "external_company", label: "Firmă / companie din Suceava" },
  { value: "external_ngo", label: "ONG / asociație din Suceava" },
  { value: "external_individual", label: "Organizator extern – persoană fizică" },
];

export default function OrganizerRequest() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "onTouched" });
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const passwordValue = watch("password");

  async function onSubmit(data) {
    setServerError("");
    setSuccess(false);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "/api/v1"}/organizer-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: data.first_name.trim(),
            last_name: data.last_name.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password,
            organization: data.organization.trim(),
            organizer_type: data.organizer_type,
            motivation: data.motivation.trim(),
          }),
        },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const detail =
          typeof err.detail === "string"
            ? err.detail
            : "Nu am putut trimite cererea. Încearcă din nou.";
        throw new Error(detail);
      }
      setSuccess(true);
      reset();
    } catch (err) {
      setServerError(err.message);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      <div
        className="floating-blob -top-32 left-1/3 h-96 w-96"
        style={{ background: "#A1D6CB" }}
      />
      <div
        className="floating-blob bottom-10 -right-28 h-96 w-96"
        style={{ background: "#E6A1C0", animationDelay: "4s" }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#272F54]/80 transition hover:text-[#272F54]"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la pagina principală
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#A19AD3]/40 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#272F54]/80">
            <Sparkles className="h-3.5 w-3.5" />
            Cerere organizator
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-gradient-brand">
              Vreau să organizez evenimente pe UniEvents
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-slate-600">
            Trimite această cerere pentru a deveni organizator. Un administrator
            o va analiza și te va contacta pe email.
          </p>
        </motion.div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mt-8 rounded-3xl p-8 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#8DC9A0]/40">
              <CheckCircle2 className="h-8 w-8 text-[#2e6a3d]" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-[#272F54]">
              Cererea a fost trimisă!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Ți-am trimis un email de confirmare. Vei primi un al doilea email
              imediat ce administratorul îți analizează cererea.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#272F54] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e2544]"
            >
              Mă întorc la evenimente
            </Link>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="glass-card mt-8 rounded-3xl p-6 sm:p-8"
          >
            {serverError && (
              <div className="mb-5 rounded-xl border border-[#FF8383]/60 bg-[#FF8383]/15 px-4 py-3 text-sm text-[#7a1e1e]">
                {serverError}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Prenume"
                icon={User}
                error={errors.first_name?.message}
              >
                <input
                  type="text"
                  autoComplete="given-name"
                  placeholder="ex. Maria"
                  className={inputClass}
                  {...register("first_name", {
                    required: "Prenumele este obligatoriu.",
                    maxLength: { value: 100, message: "Maxim 100 caractere." },
                  })}
                />
              </Field>
              <Field
                label="Nume"
                icon={User}
                error={errors.last_name?.message}
              >
                <input
                  type="text"
                  autoComplete="family-name"
                  placeholder="ex. Ionescu"
                  className={inputClass}
                  {...register("last_name", {
                    required: "Numele este obligatoriu.",
                    maxLength: { value: 100, message: "Maxim 100 caractere." },
                  })}
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field label="Email" icon={Mail} error={errors.email?.message}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="nume@domeniu.ro"
                  className={inputClass}
                  {...register("email", {
                    required: "Emailul este obligatoriu.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Format de email invalid.",
                    },
                  })}
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Parolă"
                icon={KeyRound}
                error={errors.password?.message}
                hint="Minim 8 caractere."
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...register("password", {
                    required: "Parola este obligatorie.",
                    minLength: {
                      value: 8,
                      message: "Parola trebuie să aibă minim 8 caractere.",
                    },
                    maxLength: {
                      value: 128,
                      message: "Parola poate avea maxim 128 caractere.",
                    },
                  })}
                />
              </Field>
              <Field
                label="Confirmă parola"
                icon={KeyRound}
                error={errors.confirm_password?.message}
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={inputClass}
                  {...register("confirm_password", {
                    required: "Te rugăm să confirmi parola.",
                    validate: (v) =>
                      v === passwordValue || "Parolele nu coincid.",
                  })}
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field
                label="Tip organizator"
                icon={Sparkles}
                error={errors.organizer_type?.message}
              >
                <select
                  className={inputClass + " appearance-none pr-8"}
                  defaultValue=""
                  {...register("organizer_type", {
                    required: "Alege tipul de organizator.",
                  })}
                >
                  <option value="" disabled>
                    Alege o opțiune…
                  </option>
                  {ORGANIZER_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-5">
              <Field
                label="Facultate / Organizație"
                icon={Building2}
                error={errors.organization?.message}
                hint="Numele entității care va organiza evenimentele."
              >
                <input
                  type="text"
                  placeholder="ex. Facultatea de Inginerie Electrică sau Asociația X"
                  className={inputClass}
                  {...register("organization", {
                    required: "Te rugăm să completezi acest câmp.",
                    minLength: {
                      value: 2,
                      message: "Minim 2 caractere.",
                    },
                    maxLength: {
                      value: 255,
                      message: "Maxim 255 caractere.",
                    },
                  })}
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field
                label="Motivație"
                icon={MessageSquareText}
                error={errors.motivation?.message}
                hint="Spune-ne pe scurt ce tip de evenimente vrei să organizezi și pentru cine. Minim 30 caractere."
              >
                <textarea
                  rows={5}
                  placeholder="Descrie scopul, publicul țintă și frecvența estimată…"
                  className={inputClass + " resize-y"}
                  {...register("motivation", {
                    required: "Motivația este obligatorie.",
                    minLength: {
                      value: 30,
                      message: "Motivația trebuie să aibă minim 30 caractere.",
                    },
                    maxLength: {
                      value: 2000,
                      message: "Maxim 2000 caractere.",
                    },
                  })}
                />
              </Field>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#272F54] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(39,47,84,0.55)] transition hover:bg-[#1e2544] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#83BDE5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Se trimite cererea…" : "Trimite cererea"}
            </motion.button>

            <p className="mt-4 text-center text-xs text-slate-500">
              Prin trimitere confirmi că datele de mai sus sunt reale și că ai
              dreptul de a reprezenta organizația indicată.
            </p>
          </motion.form>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-10 pr-3 text-sm text-[#272F54] placeholder:text-slate-400 shadow-sm transition focus:border-[#83BDE5] focus:outline-none focus:ring-2 focus:ring-[#83BDE5]/40";

function Field({ label, icon: Icon, error, hint, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#272F54]/70">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#272F54]/40" />
        {children}
      </div>
      {hint && !error && (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-[#c63a3a]">{error}</p>}
    </div>
  );
}

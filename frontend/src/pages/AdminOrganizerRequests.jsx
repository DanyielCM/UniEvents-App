import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquareText,
  User,
  XCircle,
} from "lucide-react";

import { apiFetch } from "../services/api";

const ORGANIZER_TYPE_LABELS = {
  usv_staff: "Membru USV",
  usv_association: "Asociație USV",
  external_company: "Firmă",
  external_ngo: "ONG",
  external_individual: "Persoană fizică",
};

const STATUS_META = {
  pending: { label: "În așteptare", color: "#FFF574", text: "#6b5a00" },
  approved: { label: "Aprobată", color: "#A1D6CB", text: "#1f4d3f" },
  rejected: { label: "Respinsă", color: "#FF8383", text: "#7a1e1e" },
};

const TABS = [
  { key: "pending", label: "În așteptare" },
  { key: "approved", label: "Aprobate" },
  { key: "rejected", label: "Respinse" },
];

export default function AdminOrganizerRequests() {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [banner, setBanner] = useState(null);
  const [actionPendingId, setActionPendingId] = useState(null);

  const load = useCallback(
    async (status) => {
      setLoading(true);
      setLoadError("");
      try {
        const resp = await apiFetch(
          `/organizer-requests?status=${status}&limit=100`,
        );
        if (!resp.ok) throw new Error("Nu am putut încărca cererile.");
        const data = await resp.json();
        setItems(data);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  async function handleApprove(req) {
    setActionPendingId(req.id);
    setBanner(null);
    try {
      const resp = await apiFetch(
        `/organizer-requests/${req.id}/approve`,
        { method: "POST" },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Nu am putut aproba cererea.");
      }
      setBanner({
        kind: "success",
        text: `Cererea #${req.id} a fost aprobată. Userul ${req.email} este acum organizator.`,
      });
      await load(tab);
    } catch (err) {
      setBanner({ kind: "error", text: err.message });
    } finally {
      setActionPendingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#272F54]/80 transition hover:text-[#272F54]"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#272F54] sm:text-4xl">
              Cereri organizatori
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Revizuiește și aprobă sau respinge cererile de organizator.
            </p>
          </div>
        </div>

        <div className="mt-6 inline-flex rounded-2xl border border-[#272F54]/10 bg-white/80 p-1 shadow-sm backdrop-blur">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === t.key
                  ? "text-white"
                  : "text-[#272F54]/70 hover:text-[#272F54]"
              }`}
            >
              {tab === t.key && (
                <motion.span
                  layoutId="tab-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-[#272F54]"
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
              banner.kind === "success"
                ? "border-[#8DC9A0]/50 bg-[#8DC9A0]/15 text-[#2e6a3d]"
                : "border-[#FF8383]/50 bg-[#FF8383]/15 text-[#7a1e1e]"
            }`}
          >
            {banner.text}
          </motion.div>
        )}

        {loadError && (
          <div className="mt-6 rounded-xl border border-[#FF8383]/50 bg-[#FF8383]/15 px-4 py-3 text-sm text-[#7a1e1e]">
            {loadError}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {loading ? (
            <LoadingSkeleton />
          ) : items.length === 0 ? (
            <EmptyState status={tab} />
          ) : (
            items.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                onApprove={() => handleApprove(req)}
                onReject={() => setRejectTarget(req)}
                disabled={actionPendingId === req.id}
              />
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {rejectTarget && (
          <RejectModal
            req={rejectTarget}
            onClose={() => setRejectTarget(null)}
            onDone={async () => {
              setRejectTarget(null);
              await load(tab);
              setBanner({
                kind: "success",
                text: "Cererea a fost respinsă și solicitantul a fost notificat.",
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RequestCard({ req, onApprove, onReject, disabled }) {
  const status = STATUS_META[req.status] ?? STATUS_META.pending;
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.35)] backdrop-blur sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#272F54]/50">
              Cerere #{req.id}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: `${status.color}80`, color: status.text }}
            >
              {status.label}
            </span>
            <span className="rounded-full bg-[#A19AD3]/25 px-2.5 py-0.5 text-xs font-semibold text-[#272F54]">
              {ORGANIZER_TYPE_LABELS[req.organizer_type] ?? req.organizer_type}
            </span>
          </div>
          <h3 className="mt-2 font-display text-lg font-bold text-[#272F54]">
            {req.first_name} {req.last_name}
          </h3>
        </div>
        <div className="text-right text-xs text-slate-500">
          <Clock className="mr-1 inline h-3.5 w-3.5" />
          {new Date(req.created_at).toLocaleString("ro-RO")}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <InfoRow icon={Mail} label="Email" value={req.email} />
        <InfoRow
          icon={Building2}
          label="Organizație"
          value={req.organization}
        />
      </dl>

      <div className="mt-4 rounded-xl bg-[#F6F8FD] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#272F54]/60">
          <MessageSquareText className="h-3.5 w-3.5" /> Motivație
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {req.motivation}
        </p>
      </div>

      {req.rejection_reason && (
        <div className="mt-3 rounded-xl border border-[#FF8383]/40 bg-[#FF8383]/10 p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#7a1e1e]">
            Motiv respingere
          </div>
          <p className="text-sm text-[#7a1e1e]">{req.rejection_reason}</p>
        </div>
      )}

      {req.status === "pending" && (
        <div className="mt-5 flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={disabled}
            onClick={onApprove}
            className="inline-flex items-center gap-2 rounded-xl bg-[#8DC9A0] px-4 py-2 text-sm font-semibold text-[#1f4d3f] transition hover:bg-[#7cb88e] disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" /> Aprobă cererea
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={disabled}
            onClick={onReject}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FF8383]/60 bg-white px-4 py-2 text-sm font-semibold text-[#7a1e1e] transition hover:bg-[#FF8383]/10 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" /> Respinge
          </motion.button>
        </div>
      )}
    </motion.article>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#272F54]/50" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-[#272F54]/50">
          {label}
        </div>
        <div className="text-sm text-[#272F54]">{value}</div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-3xl bg-white/50"
        />
      ))}
    </div>
  );
}

function EmptyState({ status }) {
  const messages = {
    pending: {
      icon: User,
      title: "Niciun organizator în așteptare",
      desc: "Cererile noi vor apărea aici imediat ce sunt trimise.",
    },
    approved: {
      icon: CheckCircle2,
      title: "Nu există cereri aprobate",
      desc: "Aprobările vor apărea aici după ce procesezi cererile.",
    },
    rejected: {
      icon: XCircle,
      title: "Nu există cereri respinse",
      desc: "Respingerile vor apărea aici după ce procesezi cererile.",
    },
  };
  const m = messages[status] ?? messages.pending;
  const Icon = m.icon;
  return (
    <div className="rounded-3xl border border-dashed border-[#272F54]/15 bg-white/60 p-10 text-center backdrop-blur">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#83BDE5]/25">
        <Icon className="h-6 w-6 text-[#272F54]/70" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-[#272F54]">
        {m.title}
      </h3>
      <p className="mt-1 text-sm text-slate-600">{m.desc}</p>
    </div>
  );
}

function RejectModal({ req, onClose, onDone }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "onTouched" });
  const [serverError, setServerError] = useState("");

  async function onSubmit(data) {
    setServerError("");
    try {
      const resp = await apiFetch(`/organizer-requests/${req.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: data.rejection_reason.trim() }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const detail =
          typeof err.detail === "string"
            ? err.detail
            : "Nu am putut respinge cererea.";
        throw new Error(detail);
      }
      onDone();
    } catch (err) {
      setServerError(err.message);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#272F54]/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        onSubmit={handleSubmit(onSubmit)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <h2 className="font-display text-xl font-bold text-[#272F54]">
          Respingere cerere #{req.id}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Solicitantul ({req.email}) va primi un email cu motivul respingerii.
        </p>

        {serverError && (
          <div className="mt-4 rounded-xl border border-[#FF8383]/60 bg-[#FF8383]/15 px-4 py-3 text-sm text-[#7a1e1e]">
            {serverError}
          </div>
        )}

        <label className="mt-5 mb-1 block text-xs font-semibold uppercase tracking-wider text-[#272F54]/70">
          Motivul respingerii *
        </label>
        <textarea
          rows={5}
          placeholder="Explică pe scurt motivul respingerii (minim 10 caractere)…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#272F54] shadow-sm transition focus:border-[#83BDE5] focus:outline-none focus:ring-2 focus:ring-[#83BDE5]/40"
          {...register("rejection_reason", {
            required: "Motivul este obligatoriu.",
            minLength: {
              value: 10,
              message: "Motivul trebuie să aibă minim 10 caractere.",
            },
            maxLength: { value: 1000, message: "Maxim 1000 caractere." },
          })}
        />
        {errors.rejection_reason && (
          <p className="mt-1 text-xs text-[#c63a3a]">
            {errors.rejection_reason.message}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#272F54] transition hover:bg-slate-50"
          >
            Anulează
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF8383] px-4 py-2 text-sm font-semibold text-[#7a1e1e] transition hover:bg-[#ff6f6f] disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            {isSubmitting ? "Se respinge…" : "Respinge cererea"}
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  );
}

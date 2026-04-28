import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  QrCode,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

import EventCard from "../components/events/EventCard";
import FeedbackForm from "../components/feedback/FeedbackForm.jsx";
import StarRating from "../components/feedback/StarRating.jsx";
import { useAuth } from "../hooks/useAuth";
import { getPublicEvent, getPublicEventMaterials, getPublicEvents } from "../services/events.js";
import { getMyFeedback, getPublicFeedbackSummary } from "../services/feedback.js";
import {
  cancelRegistration,
  getMyRegistrationForEvent,
  getRegistrationInfo,
  registerForEvent,
} from "../services/registrations.js";

async function downloadFile(url, filename) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error();
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const MODALITY_LABEL = { physical: "Fizic", online: "Online", hybrid: "Hibrid" };
const PART_LABEL = { free: "Intrare liberă", registration: "Cu înscriere", ticketed: "Cu bilet" };

function fmtFull(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function buildGcalUrl(event) {
  const toFmt = (iso) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toFmt(event.starts_at)}/${toFmt(event.ends_at)}`,
    details: (event.description || "").substring(0, 500),
    location: event.location?.name || "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [related, setRelated] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myReg, setMyReg] = useState(null);
  const [regInfo, setRegInfo] = useState(null);
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState(null);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [myFeedback, setMyFeedback] = useState(undefined); // undefined=loading, null=none

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getPublicEvent(id),
      getPublicEventMaterials(id).catch(() => []),
      user?.role === "student" ? getMyRegistrationForEvent(id).catch(() => null) : Promise.resolve(null),
      getPublicFeedbackSummary(id).catch(() => null),
      user?.role === "student" ? getMyFeedback(id).catch(() => null) : Promise.resolve(undefined),
      getRegistrationInfo(id).catch(() => null),
    ])
      .then(([ev, mats, reg, summary, myFb, info]) => {
        setEvent(ev);
        setMaterials(mats);
        setMyReg(reg);
        setFeedbackSummary(summary);
        setMyFeedback(myFb);
        setRegInfo(info);
        if (ev.category?.id) {
          return getPublicEvents({ category_id: ev.category.id, size: 3 });
        }
        return { items: [] };
      })
      .then((rel) => {
        setRelated((rel.items || []).filter((e) => e.id !== Number(id)));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-[#272F54]/40" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-hero">
        <p className="text-lg font-semibold text-[#272F54]/60">Evenimentul nu a fost găsit.</p>
        <Link to="/evenimente" className="text-sm text-[#83BDE5] hover:underline">
          ← Înapoi la evenimente
        </Link>
      </div>
    );
  }

  const color = event.category?.color_hex || "#83BDE5";
  const deadlinePassed = Boolean(
    event.registration_deadline && new Date(event.registration_deadline) < new Date()
  );
  const deadlineSoon = Boolean(
    event.registration_deadline && !deadlinePassed &&
    new Date(event.registration_deadline) - new Date() < 24 * 60 * 60 * 1000
  );
  const icsUrl = `${API_BASE}/public/events/${id}/ics`;
  const gcalUrl = buildGcalUrl(event);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-white/40 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-[#272F54]">UniEvents USV</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link
            to="/evenimente"
            className="inline-flex items-center gap-1 text-sm text-[#272F54]/60 hover:text-[#272F54] mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Toate evenimentele
          </Link>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Cover */}
              {event.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full rounded-3xl object-cover max-h-72"
                  style={{ objectPosition: event.cover_image_position || "50% 50%" }}
                />
              ) : (
                <div
                  className="w-full rounded-3xl h-48"
                  style={{ background: `linear-gradient(135deg, ${color}44, ${color}22)` }}
                />
              )}

              {/* Badges */}
              <div className="mt-5 flex flex-wrap gap-2">
                {event.category && (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold text-white uppercase tracking-wider"
                    style={{ backgroundColor: color }}
                  >
                    {event.category.name}
                  </span>
                )}
                <span className="rounded-full border border-[#272F54]/15 bg-white/80 px-3 py-1 text-xs font-semibold text-[#272F54]">
                  {MODALITY_LABEL[event.modality]}
                </span>
                <span className="rounded-full border border-[#272F54]/15 bg-white/80 px-3 py-1 text-xs font-semibold text-[#272F54]">
                  {PART_LABEL[event.participation_type]}
                </span>
              </div>

              <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-[#272F54] sm:text-4xl">
                {event.title}
              </h1>

              <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {event.description}
              </p>

              {/* Materials */}
              {materials.length > 0 && (
                <div className="mt-8">
                  <h2 className="font-display text-base font-bold text-[#272F54] mb-3">
                    Materiale eveniment
                  </h2>
                  <div className="space-y-2">
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => downloadFile(mat.download_url, mat.original_name)}
                        className="flex w-full items-center gap-3 rounded-xl border border-[#272F54]/10 bg-white/70 px-4 py-3 text-sm transition hover:border-[#272F54]/30 hover:bg-white text-left"
                      >
                        <FileText className="h-4 w-4 flex-shrink-0 text-[#272F54]/40" />
                        <span className="flex-1 truncate font-medium text-[#272F54]">
                          {mat.original_name}
                        </span>
                        <span className="flex-shrink-0 text-xs text-slate-500">
                          {fmtBytes(mat.size_bytes)}
                        </span>
                        <Download className="h-3.5 w-3.5 flex-shrink-0 text-[#272F54]/40" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback form — for students after event ends */}
              {user?.role === "student" && event && new Date(event.ends_at) < new Date() && (
                <div className="mt-8">
                  {myFeedback ? (
                    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 flex items-center gap-3">
                      <StarRating rating={myFeedback.rating} readOnly size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-[#272F54]">Ai lăsat feedback</p>
                        {myFeedback.comment && (
                          <p className="text-xs text-slate-500 mt-0.5">{myFeedback.comment}</p>
                        )}
                      </div>
                    </div>
                  ) : myFeedback === null ? (
                    <FeedbackForm
                      eventId={id}
                      onSubmitted={(fb) => {
                        setMyFeedback(fb);
                        setFeedbackSummary((prev) => prev
                          ? { ...prev, count: prev.count + 1 }
                          : { avg_rating: fb.rating, count: 1, distribution: { [fb.rating]: 1 } }
                        );
                      }}
                    />
                  ) : null}
                </div>
              )}

              {/* Sponsors */}
              {event.sponsors?.length > 0 && (
                <div className="mt-8">
                  <h2 className="font-display text-base font-bold text-[#272F54] mb-3">Sponsori</h2>
                  <div className="flex flex-wrap gap-4 items-center">
                    {event.sponsors.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        {s.logo_url && (
                          <img src={s.logo_url} alt={s.name} className="h-10 w-auto object-contain" />
                        )}
                        {s.website_url ? (
                          <a
                            href={s.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-[#272F54] hover:underline"
                          >
                            {s.name}
                          </a>
                        ) : (
                          <span className="text-sm font-semibold text-[#272F54]">{s.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              {/* Date & location card */}
              <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.2)] backdrop-blur">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#272F54]/60 mb-3">
                  Detalii
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-2">
                    <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#272F54]/50" />
                    <div>
                      <p className="font-semibold text-[#272F54]">{fmtFull(event.starts_at)}</p>
                      <p className="text-slate-500">→ {fmtFull(event.ends_at)}</p>
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex gap-2">
                      {event.location.is_online ? (
                        <Wifi className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#272F54]/50" />
                      ) : (
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#272F54]/50" />
                      )}
                      <div>
                        <p className="font-semibold text-[#272F54]">{event.location.name}</p>
                        {event.location.address && (
                          <p className="text-slate-500">{event.location.address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {event.capacity && (
                    <div className="flex gap-2">
                      <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#272F54]/50" />
                      <p className="text-[#272F54]">{event.capacity} locuri</p>
                    </div>
                  )}

                  {event.organizer && (
                    <div className="flex gap-2">
                      <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#272F54]/50" />
                      <p className="text-[#272F54]">
                        {event.organizer.first_name} {event.organizer.last_name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.2)] backdrop-blur space-y-2">
                {/* Registration via platform */}
                {user?.role === "student" && event.participation_type !== "free" && (
                  <>
                    {/* Deadline indicator */}
                    {event.registration_deadline && (
                      <div className={`rounded-xl px-3 py-2 text-xs font-semibold text-center ${
                        deadlinePassed
                          ? "bg-[#FF8383]/20 text-rose-700"
                          : deadlineSoon
                          ? "bg-[#FFF574]/40 text-amber-800"
                          : "bg-[#272F54]/8 text-[#272F54]/60"
                      }`}>
                        {deadlinePassed
                          ? "Înregistrările s-au închis"
                          : `Termen înscriere: ${new Date(event.registration_deadline).toLocaleString("ro-RO", {
                              day: "2-digit", month: "long",
                              hour: "2-digit", minute: "2-digit",
                            })}`}
                      </div>
                    )}

                    {/* Capacity indicator */}
                    {regInfo?.capacity && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-[#272F54]/60">
                          <span>Locuri disponibile</span>
                          <span className="font-semibold">
                            {Math.max(0, regInfo.capacity - regInfo.confirmed_count)}/{regInfo.capacity}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#272F54]/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min((regInfo.confirmed_count / regInfo.capacity) * 100, 100)}%`,
                              background: regInfo.is_full ? "#FF8383" : "#83BDE5",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {regError && (
                      <p className="text-xs text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{regError}</p>
                    )}
                    {myReg && myReg.status !== "cancelled" ? (
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                          myReg.status === "waitlisted"
                            ? "bg-[#FFF574]/40 text-amber-800"
                            : "bg-[#A1D6CB]/30 text-teal-800"
                        }`}>
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                          <span>
                            {myReg.status === "attended" ? "Ai participat" :
                             myReg.status === "waitlisted" ? "Ești pe lista de așteptare" :
                             "Ești înregistrat"}
                          </span>
                        </div>
                        {myReg.status === "confirmed" && (
                          <button
                            disabled={regBusy}
                            onClick={async () => {
                              setRegBusy(true); setRegError(null);
                              try {
                                await cancelRegistration(id);
                                setMyReg(null);
                              } catch (e) { setRegError(e.message); }
                              finally { setRegBusy(false); }
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FF8383]/40 bg-[#FF8383]/10 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50"
                          >
                            {regBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Anulează înscrierea
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        disabled={regBusy || deadlinePassed}
                        onClick={async () => {
                          setRegBusy(true); setRegError(null);
                          try {
                            const reg = await registerForEvent(id);
                            setMyReg(reg);
                            setRegInfo((prev) => prev && reg.status === "confirmed"
                              ? { ...prev, confirmed_count: prev.confirmed_count + 1, is_full: prev.confirmed_count + 1 >= prev.capacity }
                              : prev
                            );
                          } catch (e) { setRegError(e.message); }
                          finally { setRegBusy(false); }
                        }}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition ${
                          regInfo?.is_full
                            ? "bg-[#FFF574]/80 text-amber-900 hover:bg-[#FFF574]"
                            : "bg-[#272F54] text-white hover:bg-[#1e2544]"
                        }`}
                      >
                        {regBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {myReg?.status === "cancelled"
                          ? "Reînscrie-te"
                          : regInfo?.is_full
                          ? "Adaugă-mă pe lista de așteptare"
                          : "Înscrie-te pe platformă"}
                      </button>
                    )}
                  </>
                )}
                {event.registration_link && (
                  <a
                    href={event.registration_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#272F54]/20 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
                  >
                    Link extern de înscriere
                  </a>
                )}
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#272F54]/20 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Adaugă în Google Calendar
                </a>
                <a
                  href={icsUrl}
                  download
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#272F54]/20 bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
                >
                  <Download className="h-4 w-4" />
                  Descarcă fișier .ics
                </a>
              </div>

              {/* Avg rating */}
              {feedbackSummary?.count > 0 && (
                <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.2)] backdrop-blur">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#272F54]/60 mb-2">
                    Recenzii
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl font-bold text-[#272F54]">
                      {feedbackSummary.avg_rating?.toFixed(1)}
                    </span>
                    <div>
                      <StarRating rating={Math.round(feedbackSummary.avg_rating || 0)} readOnly size="sm" />
                      <p className="mt-0.5 text-xs text-slate-500">
                        {feedbackSummary.count} recenzi{feedbackSummary.count === 1 ? "e" : "i"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code */}
              {event.qr_token && (
                <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_10px_30px_-20px_rgba(39,47,84,0.2)] backdrop-blur text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <QrCode className="h-4 w-4 text-[#272F54]/60" />
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#272F54]/60">
                      Cod QR eveniment
                    </h2>
                  </div>
                  <motion.img
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={`${API_BASE}/public/events/${id}/qr.png`}
                    alt="QR Code"
                    className="mx-auto w-40 rounded-xl"
                  />
                </div>
              )}
            </aside>
          </div>

          {/* Related events */}
          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-xl font-bold text-[#272F54] mb-6">
                Evenimente similare
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((ev, i) => (
                  <EventCard key={ev.id} event={ev} index={i} />
                ))}
              </div>
            </section>
          )}
        </motion.div>
      </main>

      <footer className="mt-16 border-t border-white/40 bg-white/50 py-6 text-center text-xs text-[#272F54]/70 backdrop-blur">
        © {new Date().getFullYear()} UniEvents USV · Universitatea „Ștefan cel Mare" din Suceava
      </footer>
    </div>
  );
}

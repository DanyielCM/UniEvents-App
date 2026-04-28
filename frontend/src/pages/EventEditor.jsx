import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { ArrowLeft, ImagePlus, Loader2, Sparkles, Save, LogOut, X } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import {
  getCategories,
  getLocations,
  createEvent,
  updateEvent,
  getEvent,
  uploadCover,
} from "../services/events.js";

const MODALITY_OPTIONS = [
  { value: "physical", label: "Fizic" },
  { value: "online",   label: "Online" },
  { value: "hybrid",   label: "Hibrid" },
];

const PARTICIPATION_OPTIONS = [
  { value: "free",         label: "Liber" },
  { value: "registration", label: "Cu înscriere" },
  { value: "ticketed",     label: "Cu bilet" },
];

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISO(localStr) {
  if (!localStr) return null;
  return new Date(localStr).toISOString();
}

export default function EventEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locationMode, setLocationMode] = useState("existing");
  const [serverError, setServerError] = useState(null);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState(null);
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 });
  const pickerRef = useRef(null);
  const dragging = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      modality: "physical",
      participation_type: "free",
    },
  });

  useEffect(() => {
    Promise.all([getCategories(), getLocations()])
      .then(([cats, locs]) => {
        setCategories(cats);
        setLocations(locs);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getEvent(id)
      .then((ev) => {
        reset({
          title: ev.title,
          description: ev.description,
          starts_at: toLocalInput(ev.starts_at),
          ends_at: toLocalInput(ev.ends_at),
          registration_deadline: toLocalInput(ev.registration_deadline),
          category_id: ev.category?.id ?? "",
          location_id: ev.location?.id ?? "",
          modality: ev.modality,
          participation_type: ev.participation_type,
          registration_link: ev.registration_link ?? "",
          capacity: ev.capacity ?? "",
          max_file_size_mb: ev.max_file_size_mb ?? "",
          max_files: ev.max_files ?? "",
        });
        if (ev.location) setLocationMode("existing");
        if (ev.cover_image_url) setExistingCoverUrl(ev.cover_image_url);
        if (ev.cover_image_position) {
          const [px, py] = ev.cover_image_position.split(" ").map((v) => parseInt(v));
          if (!isNaN(px) && !isNaN(py)) setCoverPosition({ x: px, y: py });
        }
      })
      .catch((e) => setServerError(e.message))
      .finally(() => setLoadingData(false));
  }, [id, isEdit, reset]);

  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }

  function getPosFromEvent(e) {
    const rect = pickerRef.current.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100),
    };
  }

  function onPickerPointerDown(e) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCoverPosition(getPosFromEvent(e));
  }

  function onPickerPointerMove(e) {
    if (!dragging.current) return;
    setCoverPosition(getPosFromEvent(e));
  }

  function onPickerPointerUp() { dragging.current = false; }

  async function onSubmit(values) {
    setServerError(null);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        starts_at: toISO(values.starts_at),
        ends_at: toISO(values.ends_at),
        modality: values.modality,
        participation_type: values.participation_type,
        registration_link: values.registration_link || null,
        registration_deadline: values.registration_deadline
          ? toISO(values.registration_deadline)
          : null,
        capacity: values.capacity ? Number(values.capacity) : null,
        max_file_size_mb: values.max_file_size_mb ? Number(values.max_file_size_mb) : null,
        max_files: values.max_files ? Number(values.max_files) : null,
        category_id: values.category_id ? Number(values.category_id) : null,
        cover_image_position: `${coverPosition.x}% ${coverPosition.y}%`,
      };

      if (locationMode === "existing" && values.location_id) {
        payload.location_id = Number(values.location_id);
      } else if (locationMode === "new" && values.new_location_name) {
        payload.new_location = {
          name: values.new_location_name,
          address: values.new_location_address || null,
          is_online: values.modality === "online",
        };
      }

      let saved;
      if (isEdit) {
        saved = await updateEvent(id, payload);
      } else {
        saved = await createEvent(payload);
      }
      if (coverFile) {
        await uploadCover(saved.id, coverFile);
      }
      navigate("/organizator/evenimente");
    } catch (e) {
      setServerError(e.message);
    }
  }

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-[#272F54]/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-white/40 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#272F54] text-white shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold text-[#272F54]">UniEvents USV</span>
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#272F54]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
          >
            <LogOut className="h-4 w-4" />
            Deconectare
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/organizator/evenimente"
            className="inline-flex items-center gap-1 text-sm text-[#272F54]/60 hover:text-[#272F54] mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Înapoi la evenimente
          </Link>

          <h1 className="font-display text-3xl font-bold text-[#272F54]">
            {isEdit ? "Editează evenimentul" : "Eveniment nou"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isEdit
              ? "Modifică detaliile evenimentului. Poți retrimite spre validare după salvare."
              : "Completează detaliile evenimentului. Îl vei putea trimite spre validare după creare."}
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 space-y-6"
        >
          {serverError && (
            <div className="rounded-2xl bg-[#FF8383]/20 p-4 text-sm text-rose-800">
              {serverError}
            </div>
          )}

          {/* Imagine cover */}
          <section className="glass-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold text-[#272F54] mb-4">
              Imagine cover
            </h2>
            <div className="space-y-3">
              {(coverPreview || existingCoverUrl) && (
                <div className="relative w-full">
                  {/* Drag picker */}
                  <div
                    ref={pickerRef}
                    className="relative h-44 w-full cursor-crosshair select-none overflow-hidden rounded-2xl"
                    onPointerDown={onPickerPointerDown}
                    onPointerMove={onPickerPointerMove}
                    onPointerUp={onPickerPointerUp}
                    onPointerLeave={onPickerPointerUp}
                  >
                    <img
                      src={coverPreview || existingCoverUrl}
                      alt="Cover preview"
                      className="pointer-events-none h-full w-full object-cover"
                      style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
                      draggable={false}
                    />
                    {/* Crosshair marker */}
                    <div
                      className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] transition-transform"
                      style={{ left: `${coverPosition.x}%`, top: `${coverPosition.y}%` }}
                    />
                    {/* Grid guide lines */}
                    <div className="pointer-events-none absolute inset-0">
                      <div className="h-full w-px opacity-20 bg-white" style={{ marginLeft: "33.33%" }} />
                      <div className="h-full w-px opacity-20 bg-white" style={{ marginLeft: "66.66%" }} />
                    </div>
                    <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
                      Trage pentru a poziționa imaginea · {coverPosition.x}% {coverPosition.y}%
                    </div>
                  </div>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow transition hover:bg-white"
                    >
                      <X className="h-4 w-4 text-[#272F54]" />
                    </button>
                  )}
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#272F54]/20 bg-white/60 px-4 py-3 transition hover:border-[#272F54]/40 hover:bg-white/80">
                <ImagePlus className="h-5 w-5 flex-shrink-0 text-[#272F54]/40" />
                <span className="text-sm text-[#272F54]/60">
                  {coverFile
                    ? coverFile.name
                    : existingCoverUrl
                    ? "Înlocuiește imaginea cover"
                    : "Alege o imagine cover (JPEG, PNG, WebP)"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setCoverFile(f);
                    const reader = new FileReader();
                    reader.onload = (ev) => setCoverPreview(ev.target.result);
                    reader.readAsDataURL(f);
                  }}
                />
              </label>
            </div>
          </section>

          {/* Info de bază */}
          <section className="glass-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold text-[#272F54] mb-4">
              Informații de bază
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                  Titlu *
                </label>
                <input
                  {...register("title", { required: "Titlul este obligatoriu" })}
                  className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                  placeholder="ex. Workshop Python pentru studenți"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-[#FF8383]">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                  Descriere *
                </label>
                <textarea
                  {...register("description", { required: "Descrierea este obligatorie" })}
                  rows={4}
                  className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20 resize-none"
                  placeholder="Descrie evenimentul, programul, ce vor câștiga participanții..."
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-[#FF8383]">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                  Categorie
                </label>
                <select
                  {...register("category_id")}
                  className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                >
                  <option value="">— Fără categorie —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Dată și oră */}
          <section className="glass-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold text-[#272F54] mb-4">
              Dată și oră
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                  Început *
                </label>
                <input
                  type="datetime-local"
                  {...register("starts_at", { required: "Data de început este obligatorie" })}
                  className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                />
                {errors.starts_at && (
                  <p className="mt-1 text-xs text-[#FF8383]">{errors.starts_at.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                  Sfârșit *
                </label>
                <input
                  type="datetime-local"
                  {...register("ends_at", { required: "Data de sfârșit este obligatorie" })}
                  className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                />
                {errors.ends_at && (
                  <p className="mt-1 text-xs text-[#FF8383]">{errors.ends_at.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                  Deadline înscriere
                </label>
                <input
                  type="datetime-local"
                  {...register("registration_deadline")}
                  className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                />
              </div>
            </div>
          </section>

          {/* Locație și modalitate */}
          <section className="glass-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold text-[#272F54] mb-4">
              Locație și modalitate
            </h2>
            <div className="space-y-4">
              {/* Modalitate */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-2">
                  Modalitate participare *
                </label>
                <div className="flex gap-3">
                  {MODALITY_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        watch("modality") === opt.value
                          ? "border-[#272F54] bg-[#272F54] text-white"
                          : "border-[#272F54]/20 bg-white/60 text-[#272F54]/70 hover:border-[#272F54]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("modality")}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Location toggle */}
              <div>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLocationMode("existing")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      locationMode === "existing"
                        ? "bg-[#272F54] text-white"
                        : "bg-white/60 text-[#272F54]/60 border border-[#272F54]/15"
                    }`}
                  >
                    Locație existentă
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode("new")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      locationMode === "new"
                        ? "bg-[#272F54] text-white"
                        : "bg-white/60 text-[#272F54]/60 border border-[#272F54]/15"
                    }`}
                  >
                    Locație nouă
                  </button>
                </div>

                {locationMode === "existing" ? (
                  <select
                    {...register("location_id")}
                    className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                  >
                    <option value="">— Fără locație specificată —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}{l.address ? ` — ${l.address}` : ""}
                        {l.is_online ? " (Online)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3">
                    <input
                      {...register("new_location_name")}
                      placeholder="Numele locației (ex. Amfiteatrul A1, Corp A, USV)"
                      className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                    />
                    <input
                      {...register("new_location_address")}
                      placeholder="Adresă (opțional)"
                      className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Participare */}
          <section className="glass-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold text-[#272F54] mb-4">
              Participare
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-2">
                  Tip participare *
                </label>
                <div className="flex flex-wrap gap-3">
                  {PARTICIPATION_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        watch("participation_type") === opt.value
                          ? "border-[#272F54] bg-[#272F54] text-white"
                          : "border-[#272F54]/20 bg-white/60 text-[#272F54]/70 hover:border-[#272F54]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("participation_type")}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                    Link înscriere
                  </label>
                  <input
                    {...register("registration_link")}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                    Capacitate (locuri)
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register("capacity")}
                    placeholder="ex. 50"
                    className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Restricții fișiere */}
          <section className="glass-card rounded-3xl p-6">
            <h2 className="font-display text-base font-bold text-[#272F54] mb-1">
              Restricții fișiere
            </h2>
            <p className="text-xs text-slate-500 mb-4">Opțional — dacă nu specifici, se aplică limitele globale.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                  Dimensiune max. fișier (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  {...register("max_file_size_mb")}
                  placeholder="ex. 10"
                  className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#272F54]/60 mb-1">
                  Nr. maxim de fișiere
                </label>
                <input
                  type="number"
                  min="1"
                  {...register("max_files")}
                  placeholder="ex. 5"
                  className="w-full rounded-xl border border-[#272F54]/15 bg-white/80 px-4 py-2.5 text-sm text-[#272F54] placeholder-[#272F54]/30 outline-none focus:border-[#83BDE5] focus:ring-2 focus:ring-[#83BDE5]/20"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pb-10">
            <Link
              to="/organizator/evenimente"
              className="rounded-2xl border border-[#272F54]/20 bg-white px-6 py-2.5 text-sm font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
            >
              Anulează
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#272F54] px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#1e2544] disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? "Salvează modificările" : "Creează evenimentul"}
            </button>
          </div>
        </motion.form>
      </main>
    </div>
  );
}

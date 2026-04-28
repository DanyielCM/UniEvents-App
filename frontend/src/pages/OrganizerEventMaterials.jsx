import { useEffect, useState } from "react";

async function downloadFile(url, filename) {
  const token = localStorage.getItem("access_token");
  try {
    const resp = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
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
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  FileText,
  Image,
  Loader2,
  LogOut,
  Presentation,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import FileUploadZone from "../components/forms/FileUploadZone";
import { getEvent } from "../services/events.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mime) {
  if (!mime) return FileText;
  if (mime.startsWith("image/")) return Image;
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("presentation") || mime.includes("powerpoint")) return Presentation;
  return FileText;
}

function mimeColor(mime) {
  if (!mime) return "#8EAEE0";
  if (mime.startsWith("image/")) return "#A1D6CB";
  if (mime.includes("pdf")) return "#FF8383";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "#FFB899";
  return "#8EAEE0";
}

async function apiUpload(eventId, file) {
  const token = localStorage.getItem("access_token");
  const body = new FormData();
  body.append("file", file);
  const resp = await fetch(`${API_BASE}/events/${eventId}/materials`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

async function apiGetMaterials(eventId) {
  const token = localStorage.getItem("access_token");
  const resp = await fetch(`${API_BASE}/events/${eventId}/materials`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function apiDeleteMaterial(eventId, materialId) {
  const token = localStorage.getItem("access_token");
  const resp = await fetch(`${API_BASE}/events/${eventId}/materials/${materialId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

export default function OrganizerEventMaterials() {
  const { id: eventId } = useParams();
  const { logout } = useAuth();

  const [event, setEvent] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  async function loadAll() {
    try {
      const [ev, mats] = await Promise.all([
        getEvent(eventId),
        apiGetMaterials(eventId),
      ]);
      setEvent(ev);
      setMaterials(mats);
    } catch {
      // handled by loading state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [eventId]);

  async function handleUpload(file) {
    const newMat = await apiUpload(eventId, file);
    setMaterials((prev) => [newMat, ...prev]);
  }

  async function handleDelete(mat) {
    if (!window.confirm(`Ștergi fișierul «${mat.original_name}»?`)) return;
    setBusy(mat.id);
    try {
      await apiDeleteMaterial(eventId, mat.id);
      setMaterials((prev) => prev.filter((m) => m.id !== mat.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  }

  const atLimit = event?.max_files && materials.length >= event.max_files;

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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#272F54]/40" />
          </div>
        ) : (
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
              Înapoi la evenimentele mele
            </Link>

            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#272F54]">
                  Materiale eveniment
                </h1>
                {event && (
                  <p className="mt-1 text-sm text-slate-600">
                    {event.title}
                    {event.max_files && (
                      <span className="ml-2 rounded-full bg-[#272F54]/10 px-2 py-0.5 text-xs font-semibold text-[#272F54]">
                        {materials.length}/{event.max_files} fișiere
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Upload zone */}
            <div className="mb-8">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#272F54]/60 mb-3">
                Adaugă material nou
              </h2>
              {atLimit ? (
                <div className="rounded-2xl border border-[#FFF574]/60 bg-[#FFF574]/20 p-4 text-sm text-amber-800">
                  Ai atins limita de {event.max_files} fișiere pentru acest eveniment.
                </div>
              ) : (
                <FileUploadZone onUpload={handleUpload} disabled={!!atLimit} />
              )}
            </div>

            {/* Materials list */}
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#272F54]/60 mb-3">
                Fișiere încărcate ({materials.length})
              </h2>

              {materials.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/70 py-12 text-center">
                  <FileText className="h-10 w-10 text-[#272F54]/20" />
                  <p className="text-sm text-[#272F54]/50">Niciun material încărcat încă.</p>
                </div>
              ) : (
                <AnimatePresence>
                  <div className="space-y-3">
                    {materials.map((mat, i) => {
                      const Icon = mimeIcon(mat.mime_type);
                      const color = mimeColor(mat.mime_type);
                      return (
                        <motion.div
                          key={mat.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: i * 0.04 }}
                          className="glass-card-solid flex items-center gap-4 rounded-2xl p-4"
                        >
                          <div
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${color}30` }}
                          >
                            <Icon className="h-5 w-5" style={{ color }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-semibold text-[#272F54]">
                              {mat.original_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {fmtBytes(mat.size_bytes)} ·{" "}
                              {new Date(mat.uploaded_at).toLocaleDateString("ro-RO")}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => downloadFile(mat.download_url, mat.original_name)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#272F54]/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#272F54] transition hover:border-[#272F54]/40"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Descarcă
                            </button>
                            <button
                              disabled={busy === mat.id}
                              onClick={() => handleDelete(mat)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#FF8383]/30 bg-[#FF8383]/10 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-[#FF8383]/20 disabled:opacity-50"
                            >
                              {busy === mat.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Șterge
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

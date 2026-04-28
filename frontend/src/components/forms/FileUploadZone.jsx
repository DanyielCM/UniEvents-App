import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  FileText,
  Image,
  Presentation,
  Upload,
  XCircle,
} from "lucide-react";

const ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp";

function mimeIcon(mime) {
  if (!mime) return FileText;
  if (mime.startsWith("image/")) return Image;
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("presentation") || mime.includes("powerpoint")) return Presentation;
  return FileText;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadZone({ onUpload, uploading = false, disabled = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null); // { ok: bool, name: str }

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setPendingFile(file);
    setUploadResult(null);
    setProgress(0);
    simulateAndUpload(file);
  }

  async function simulateAndUpload(file) {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) { clearInterval(timer); return 85; }
        return p + 12;
      });
    }, 120);
    try {
      await onUpload(file);
      clearInterval(timer);
      setProgress(100);
      setUploadResult({ ok: true, name: file.name });
    } catch (e) {
      clearInterval(timer);
      setProgress(0);
      setUploadResult({ ok: false, name: e.message });
    } finally {
      setTimeout(() => {
        setPendingFile(null);
        setProgress(0);
      }, 1800);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  const FileIcon = pendingFile ? mimeIcon(pendingFile.type) : Upload;

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && !pendingFile && inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
          : dragging
          ? "border-[#83BDE5] bg-[#83BDE5]/10 scale-[1.01]"
          : "border-[#272F54]/20 bg-white/60 hover:border-[#272F54]/40 hover:bg-white/80"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {pendingFile ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full space-y-3"
          >
            <div className="flex items-center gap-3">
              <FileIcon className="h-8 w-8 flex-shrink-0 text-[#272F54]/40" />
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-[#272F54]">{pendingFile.name}</p>
                <p className="text-xs text-slate-500">{fmtBytes(pendingFile.size)}</p>
              </div>
              {uploadResult ? (
                uploadResult.ok ? (
                  <CheckCircle className="h-5 w-5 text-[#8DC9A0]" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#FF8383]" />
                )
              ) : null}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-[#272F54]/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: uploadResult?.ok
                    ? "#8DC9A0"
                    : uploadResult?.ok === false
                    ? "#FF8383"
                    : "#83BDE5",
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>

            {uploadResult && !uploadResult.ok && (
              <p className="text-xs text-[#FF8383]">{uploadResult.name}</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <motion.div
              animate={dragging ? { scale: 1.15 } : { scale: 1 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#272F54]/8"
            >
              <Upload className="h-6 w-6 text-[#272F54]/40" />
            </motion.div>
            <p className="text-sm font-semibold text-[#272F54]">
              {dragging ? "Eliberează pentru a încărca" : "Trage fișierul aici sau apasă pentru a selecta"}
            </p>
            <p className="text-xs text-slate-500">PDF, Word, PowerPoint, imagini · max. {disabled ? "—" : "10 MB"}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

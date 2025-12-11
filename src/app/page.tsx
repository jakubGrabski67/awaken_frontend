"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Segments from "@/components/segments/Segments";
import type { Segment } from "@/types/segment";
import FilesSidebar, { UploadedFile } from "@/components/sidebar/FilesSidebar";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import { toastOk, toastErr } from "@/lib/toast";

const SIDEBAR_W = "15vw";
const SIDEBAR_MIN_W = 320;

const LS_KEYS = {
  files: "idmlx.files",
  fileSegments: "idmlx.fileSegments",
  activeFileId: "idmlx.activeFileId",
  activeFileName: "idmlx.activeFileName",
  version: "idmlx.version",
} as const;

const LS_VERSION = 1;

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet<T>(key: string, value: T) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    //
  }
}

/** Throttling zapisów, żeby nie spamować storage przy wielu zmianach */
function useThrottledEffect(fn: () => void, deps: any[], ms = 150) {
  useEffect(() => {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
  }, deps);
}

export default function Page() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [segments, _setSegments] = useState<Segment[]>([]);
  const [fileSegments, setFileSegments] = useState<Record<string, Segment[]>>({});

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "translated" | "untranslated">("all");

  const [loadingSegments, setLoadingSegments] = useState(false);
  const [skeletonCount, setSkeletonCount] = useState<number>(12);

  const [showScrollTop, setShowScrollTop] = useState(false);

  const pendingUploadIdRef = useRef<string | null>(null);

  const sidebarOffset = useMemo(
    () => (sidebarCollapsed ? `${SIDEBAR_MIN_W}px` : `max(${SIDEBAR_W}, ${SIDEBAR_MIN_W}px)`),
    [sidebarCollapsed]
  );

  const stats = useMemo(() => {
    const total = segments.length;
    const translated = segments.filter((s) => !!s?.translatedText?.trim()).length;
    return { total, translated, untranslated: total - translated };
  }, [segments]);

  const can = useMemo(
    () => ({
      all: stats.total > 0,
      translated: stats.translated > 0,
      untranslated: stats.untranslated > 0,
    }),
    [stats]
  );

  const visibleSegments = useMemo(() => {
    switch (filter) {
      case "translated":
        return segments.filter((s) => !!s.translatedText?.trim());
      case "untranslated":
        return segments.filter((s) => !s.translatedText?.trim() && !!s.originalText?.trim());
      default:
        return segments;
    }
  }, [segments, filter]);

  // korekta filtra, gdy dane się zmieniają
  useEffect(() => {
    if (stats.total === 0) return;
    const hasT = stats.translated > 0;
    const hasU = stats.untranslated > 0;
    if (filter === "translated" && !hasT) setFilter(hasU ? "untranslated" : "all");
    else if (filter === "untranslated" && !hasU) setFilter(hasT ? "translated" : "all");
  }, [filter, stats.total, stats.translated, stats.untranslated]);

  // LS inicjalizacja
  useEffect(() => {
    const v = lsGet<number>(LS_KEYS.version, 0);
    if (v !== LS_VERSION) {
      lsSet(LS_KEYS.version, LS_VERSION);
    }

    const storedFiles = lsGet<UploadedFile[]>(LS_KEYS.files, []);
    const storedFileSegments = lsGet<Record<string, Segment[]>>(LS_KEYS.fileSegments, {});
    const storedActiveId = lsGet<string | null>(LS_KEYS.activeFileId, null);
    const storedActiveName = lsGet<string | null>(LS_KEYS.activeFileName, null);

    if (storedFiles.length) setFiles(storedFiles);
    if (Object.keys(storedFileSegments).length) setFileSegments(storedFileSegments);

    if (storedActiveId && storedFiles.find((f) => f.id === storedActiveId)) {
      setFileId(storedActiveId);
      setFileName(storedActiveName ?? storedFiles.find((f) => f.id === storedActiveId)?.name ?? null);
      const segs = storedFileSegments[storedActiveId] ?? [];
      _setSegments(segs);
      setSkeletonCount(segs.length || 12);
      setLoadingSegments(false);
    }
  }, []);

  useThrottledEffect(() => {
    lsSet(LS_KEYS.files, files);
  }, [files]);

  useThrottledEffect(() => {
    lsSet(LS_KEYS.fileSegments, fileSegments);
  }, [fileSegments]);

  useThrottledEffect(() => {
    lsSet(LS_KEYS.activeFileId, fileId);
    lsSet(LS_KEYS.activeFileName, fileName);
  }, [fileId, fileName]);

  // setter pełnego zbioru segmentów + cache dla pliku
  const setAllSegments = (next: Segment[]) => {
    _setSegments(next);
    if (fileId) {
      setFileSegments((prev) => {
        const updated = { ...prev, [fileId]: next };
        return updated;
      });
    }
  };

  // setter do przekazania do <Segments/> gdy podajemy "widoczne" segmenty:
  const setFromVisible = (nextVisible: Segment[]) => {
    const byKey = new Map(nextVisible.map((s) => [`${s.storyPath}|${s.index}`, s] as const));
    const merged = segments.map((s) => byKey.get(`${s.storyPath}|${s.index}`) ?? s);
    setAllSegments(merged);
  };

  function handleUploaded(id: string, name: string) {
    pendingUploadIdRef.current = id;
    const item: UploadedFile = { id, name, createdAt: Date.now() };
    setFiles((prev) => [item, ...prev.filter((f) => f.id !== id)]);
    setFileId(id);
    setFileName(name);
    setLoadingSegments(true);
    setSkeletonCount(12);
    _setSegments([]);
  }

  function handleSegments(arr: Segment[]) {
    const id = pendingUploadIdRef.current ?? fileId;
    if (id) {
      setFileSegments((prev) => ({ ...prev, [id]: arr }));
      if (fileId === id || pendingUploadIdRef.current === id) {
        _setSegments(arr);
      }
    }
    pendingUploadIdRef.current = null;
    setLoadingSegments(false);
    setSkeletonCount(arr?.length || 12);
  }

  function handleSelectFile(id: string) {
    const f = files.find((x) => x.id === id);
    setFileId(id);
    setFileName(f?.name ?? null);

    const cached = fileSegments[id];
    if (cached && cached.length) {
      _setSegments(cached);
      setLoadingSegments(false);
      setSkeletonCount(cached.length);
    } else {
      _setSegments([]);
      setSkeletonCount(12);
      setLoadingSegments(true);
    }
  }

  function handleRemoveFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setFileSegments((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });

    if (fileId === id) {
      const nextFiles = files.filter((f) => f.id !== id);
      const newActive = nextFiles[0];
      setFileId(newActive?.id ?? null);
      setFileName(newActive?.name ?? null);
      _setSegments(newActive ? fileSegments[newActive.id] ?? [] : []);
      setLoadingSegments(!!newActive && !(fileSegments[newActive.id]?.length));
      setSkeletonCount(fileSegments[newActive?.id ?? ""]?.length || 12);
    }
  }

  async function translateAll() {
    if (!segments.length) return;
    const targets = segments
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !s.translatedText && s.originalText?.trim());
    if (targets.length === 0) return;

    setBusy(true);
    setProgress(0);
    try {
      const chunkSize = 100;
      const next = segments.slice();
      let done = 0;

      for (let off = 0; off < targets.length; off += chunkSize) {
        const chunk = targets.slice(off, off + chunkSize);
        const res = await api.post("/translate/batch", {
          items: chunk.map(({ s }) => ({ text: s.originalText })),
        });
        const out: Array<{ translatedText: string }> = res.data.items ?? [];
        chunk.forEach((t, idx) => {
          next[t.i] = { ...next[t.i], translatedText: out[idx]?.translatedText ?? "" };
        });
        done += chunk.length;
        setProgress(Math.round((done / targets.length) * 100));
      }

      setAllSegments(next);
      const left = next.find((s) => !s.translatedText?.trim() && !!s.originalText?.trim());
      if (!left) setFilter("translated");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function exportIdml() {
    if (!fileId) return;
    const replacements = segments
      .filter((s) => s.translatedText?.trim())
      .map((s) => ({
        storyPath: s.storyPath,
        index: s.index,
        translatedText: s.translatedText!.trim(),
      }));
    if (!replacements.length) return;

    setBusy(true);
    try {
      const res = await api.post(`/files/${fileId}/export`, { replacements }, { responseType: "arraybuffer" });
      const cd = (res.headers["content-disposition"] as string | undefined) ?? "";
      const m = /filename="([^"]+)"/i.exec(cd);
      const filename = m?.[1] ?? "translated.idml";
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toastOk(`Plik "${filename}" został wyeksportowany.`);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Błąd podczas eksportu pliku.";
      toastErr(msg);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <FilesSidebar
        files={files}
        activeId={fileId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        onSelect={handleSelectFile}
        onRemove={handleRemoveFile}
        onUploaded={handleUploaded}
        onSegments={handleSegments}
        stats={stats}
        can={can}
        filter={filter}
        onChangeFilter={setFilter}
        busy={busy}
        fileId={fileId}
        onTranslateAll={translateAll}
        onExport={exportIdml}
        progress={progress}
      />

      {/* Main content aplikacji */}
      <div
        className="min-h-screen transition-[padding-left] duration-300 ease-in-out"
        style={{ paddingLeft: sidebarOffset }}
      >
        <div className="mx-auto max-w-[1400px] px-6">
          <section className="py-6">
            <Segments
              fileId={fileId}
              fileName={fileName}
              loading={loadingSegments}
              skeletonCount={skeletonCount}
              segments={visibleSegments}
              setSegments={setFromVisible}
              onUploaded={({ fileId: newId, name, segments: newSegments }) => {
                const item: UploadedFile = { id: newId, name, createdAt: Date.now() };
                setFiles((prev) => [item, ...prev.filter((f) => f.id !== newId)]);
                setFileId(newId);
                setFileName(name);
                setFileSegments((prev) => ({ ...prev, [newId]: newSegments }));
                _setSegments(newSegments);
              }}
            />
          </section>
        </div>
      </div>

      {/* Scroll-to-top */}
      {showScrollTop && (
        <Button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Przewiń do góry"
          className="fixed bottom-6 right-6 z-120 h-10 w-10 p-0 rounded-full shadow-lg bg-white text-black transition-colors hover:bg-black hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 cursor-pointer"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

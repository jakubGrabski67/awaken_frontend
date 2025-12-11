"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Segment } from "@/types/segment";
import SegmentCard from "./SegmentCard";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import clsx from "clsx";
import { toastOk, toastErr } from "@/lib/toast";

type Props = {
  segments: Segment[];
  setSegments?: (s: Segment[]) => void;
  fileId?: string | null;
  onUploaded?: (payload: { fileId: string; name: string; segments: Segment[] }) => void;
  loading?: boolean;
  skeletonCount?: number;
  sidebarCollapsed?: boolean;
  fileName?: string | null;
};

export default function Segments({
  segments: initial,
  setSegments: lift,
  onUploaded,
  loading = false,
  skeletonCount = 12,
  sidebarCollapsed = false,
}: Props) {

  const [segments, setLocalSegments] = useState<Segment[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  const LEFT_GAP = sidebarCollapsed ? "ml-[320px]" : "";

  useEffect(() => setLocalSegments(initial ?? []), [initial]);

  const setSegments = useCallback(
    (next: Segment[]) => {
      lift?.(next);
      setLocalSegments(next);
    },
    [lift]
  );

  /** Standardowy tryb tłumaczenia "Lorem ipsum" */
  const translateOne = useCallback(
    async (idx: number) => {
      const s = segments[idx];
      if (!s?.originalText?.trim() || s.translatedText) return;
      setBusy(true);
      try {
        const res = await api.post("/translate", { text: s.originalText });
        const out = res.data?.translatedText ?? "";
        startTransition(() => {
          const next = segments.slice();
          next[idx] = { ...next[idx], translatedText: out };
          setSegments(next);
        });
      } finally {
        setBusy(false);
      }
    },
    [segments, setSegments]
  );

  /** Tryb tłumaczenia "reverse" */
  const translateOneReverse = useCallback(
    async (idx: number) => {
      const s = segments[idx];
      if (!s?.originalText?.trim() || s.translatedText) return;
      setBusy(true);
      try {
        const res = await api.post("/translate", { text: s.originalText, mode: "reverse" as const });
        const out = res.data?.translatedText ?? "";
        startTransition(() => {
          const next = segments.slice();
          next[idx] = { ...next[idx], translatedText: out };
          setSegments(next);
        });
      } finally {
        setBusy(false);
      }
    },
    [segments, setSegments]
  );

  /* Upload: obsługa .idml lub .zip (z wieloma IDML) */
  const onFilesSelected = useCallback(
    async (files?: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];
      const isIdml = /\.idml$/i.test(file.name);
      const isZip = /\.zip$/i.test(file.name);
      if (!isIdml && !isZip) {
        toastErr("Obsługiwane są pliki .idml oraz .zip z plikami .idml.");
        return;
      }

      const form = new FormData();
      form.append("file", file);
      setBusy(true);
      try {
        const res = await api.post("/files/upload", form);

        // Wariant MULTI
        if (Array.isArray(res.data?.files)) {
          const items = res.data.files as Array<{ fileId: string; name: string; segments: Segment[] }>;
          if (items.length === 0) {
            toastErr("ZIP nie zawiera żadnych plików IDML.");
          } else {
            items.forEach((doc) => onUploaded?.({ fileId: doc.fileId, name: doc.name, segments: doc.segments }));
            toastOk(`Przesłano dokumentów: ${items.length}.`);
          }
          return;
        }

        // Wariant SINGLE
        const { fileId: fid, segments: segs, originalName } = res.data as {
          fileId: string;
          segments: Segment[];
          originalName?: string;
        };
        const displayName = originalName || file.name;
        onUploaded?.({ fileId: fid, name: displayName, segments: segs });
        toastOk(`Przesłano: ${displayName}`);
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? err?.message ?? "Unexpected error";
        toastErr(msg);
      } finally {
        setBusy(false);
      }
    },
    [onUploaded]
  );

  const SkeletonCard = () => (
    <div
      className={clsx(
        "rounded-2xl bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/75",
        "border border-white/10 shadow-[0_6px_24px_rgba(0,0,0,.25)]",
        "ring-1 ring-black/5",
        "animate-pulse"
      )}
      aria-hidden="true"
    >
      {/* Header */}
      <div className="flex flex-row items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0 w-full space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-40 rounded bg-white/10" />
            <div className="h-3 w-10 rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <div className="h-8 w-28 rounded-xl bg-white/10" />
          <div className="h-8 w-28 rounded-xl bg-white/10" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 pt-0 sm:pt-0">

        {/* ORYGINAŁ */}
        <section className="space-y-2">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
            <div className="h-11 rounded bg-white/10" />
          </div>
        </section>

        <div className="my-4 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

        {/* TŁUMACZENIE */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="h-8 w-20 rounded-lg bg-white/10" />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
            <div className="h-11 rounded bg-white/10" />
          </div>
        </section>
      </div>
    </div>
  );

  /* SKELETONY gdy loading=true */
  if (loading) {
    const count = Math.max(1, skeletonCount ?? 12);
    return (
      <div
        className={clsx(
          "grid grid-cols-1 gap-4",
          "xl:grid-cols-2 xl:gap-5",
          LEFT_GAP
        )}
        aria-label="Segments skeleton list"
      >
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={`sk-${i}`} />
        ))}
      </div>
    );
  }

  /* PUSTY STAN -> (drag&drop) */
  if (!segments?.length) {
    return <EmptyDropzone onFilesSelected={onFilesSelected} leftGapClass={LEFT_GAP} />;
  }

  /* NORMALNY RENDER */
  return (
    <div className={clsx("space-y-4", LEFT_GAP)}>
      <div
        className={clsx(
          "grid grid-cols-1 gap-4",
          "xl:grid-cols-2 xl:gap-5",
          "aria-busy:opacity-90"
        )}
        aria-label="Segments list"
        aria-busy={busy || isPending}
      >
        {segments.map((s, i) => (
          <SegmentCard
            key={`${s.storyPath}-${s.index}`}
            segment={s}
            onTranslate={() => translateOne(i)}
            onTranslateReverse={() => translateOneReverse(i)}
            disabled={busy || !!s.translatedText || !s.originalText?.trim()}
          />
        ))}
      </div>
    </div>
  );
}

/** Pusty stan z drag&drop */
function EmptyDropzone({
  onFilesSelected,
  leftGapClass = "",
}: {
  onFilesSelected?: (files?: FileList | null) => void;
  leftGapClass?: string;
}) {

  const [dragOver, setDragOver] = useState(false);
  const depth = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilesSelected?.(e.currentTarget.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDragEnter: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault(); e.stopPropagation();
    depth.current += 1; if (!dragOver) setDragOver(true);
  };

  const onDragOver: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault(); e.stopPropagation();
  };

  const onDragLeave: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault(); e.stopPropagation();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragOver(false);
  };

  const onDrop: React.DragEventHandler<HTMLLabelElement> = (e) => {
    e.preventDefault(); e.stopPropagation();
    depth.current = 0; setDragOver(false);
    const dt = e.dataTransfer;
    const files = dt?.files && dt.files.length > 0 ? dt.files : null;
    onFilesSelected?.(files);
  };

  return (
    <div className={clsx("flex min-h-[70vh] items-center justify-center", leftGapClass)}>
      <div className="w-full max-w-2xl">
        <label
          htmlFor="file-input"
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={clsx(
            "group relative block cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition",
            "bg-muted/30 hover:bg-muted/50",
            dragOver ? "border-primary/60 ring-4 ring-primary/10" : "border-border hover:border-primary/50"
          )}
        >
          <input
            ref={inputRef}
            id="file-input"
            type="file"
            accept=".idml,.zip"
            multiple={false}
            onChange={handleChange}
            className="sr-only"
          />
          <div className="mx-auto flex max-w-md flex-col items-center gap-4">
            <div
              className={clsx(
                "flex h-14 w-14 items-center justify-center rounded-full transition",
                dragOver ? "bg-primary/15" : "bg-muted"
              )}
            >
              <UploadCloud className={clsx("h-6 w-6", dragOver ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium">Wybierz plik do przesłania lub przeciągnij go tutaj</p>
              <p className="text-sm text-muted-foreground">
                Obsługiwane: <strong>.idml</strong> oraz <strong>.zip</strong> z wieloma plikami IDML (max 1 plik).
              </p>
            </div>
            <div className="pt-2">
              <Button type="button" className="rounded-xl" onClick={() => inputRef.current?.click()}>
                Wybierz plik
              </Button>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}

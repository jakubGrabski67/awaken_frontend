"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Languages, Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { Button } from "../ui/button";
import { toastOk, toastErr } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import clsx from "clsx";

export type UploadedFile = {
  id: string;
  name: string;
  createdAt: number;
};

type Filter = "all" | "translated" | "untranslated";

type Props = {
  files: UploadedFile[];
  activeId: string | null;
  collapsed: boolean;
  onToggle(): void;
  onSelect(id: string): void;
  onRemove?(id: string): void;
  onUploaded?(fileId: string, name: string): void;
  onSegments?(segments: any[]): void;
  scrollGapPx?: number;
  stats: { total: number; translated: number; untranslated: number };
  can: { all: boolean; translated: boolean; untranslated: boolean };
  filter: Filter;
  onChangeFilter: (f: Filter) => void;
  busy: boolean;
  fileId?: string | null;
  onTranslateAll: () => void;
  onExport: () => void;
  progress: number | null;
};

// Szerokości
const SIDEBAR_W = "15vw";
const SIDEBAR_MIN_W = 320;
const BTN = 50;
const HALF = BTN / 2;

// Wysokości
const HEADER_TITLE_H = 44;
const HEADER_CTRL_H = 128;
const FOOTER_H = 120;

// MS animacji
const SLIDE_MS = 220;
const COLLAPSE_MS = 260;

export default function FilesSidebar({
  files,
  activeId,
  collapsed,
  onToggle,
  onSelect,
  onRemove,
  onUploaded,
  onSegments,
  scrollGapPx,
  stats,
  can,
  filter,
  onChangeFilter,
  busy,
  fileId,
  onTranslateAll,
  onExport,
  progress,
}: Props) {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const gap = scrollGapPx ?? 6;

  const [localFiles, setLocalFiles] = useState<UploadedFile[]>(files);
  useEffect(() => setLocalFiles(files), [files]);

  const sortedFiles = useMemo(
    () => [...localFiles].sort((a, b) => b.createdAt - a.createdAt),
    [localFiles]
  );

  const hasFiles = sortedFiles.length > 0;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busyUpload, setBusyUpload] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const askConfirm = (id: string, name: string) => {
    if (deleting) return;
    setConfirmTarget({ id, name });
    setConfirmOpen(true);
  };
  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTarget(null);
  };
  const confirmDelete = () => {
    if (confirmTarget) startDelete(confirmTarget.id);
    closeConfirm();
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isIdml = /\.idml$/i.test(file.name);
    const isZip = /\.zip$/i.test(file.name);
    if (!isIdml && !isZip) {
      const msg = "Wgraj plik .idml lub .zip z plikami .idml.";
      setErr(msg);
      toastErr(msg);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusyUpload(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const up = await api.post("/files/upload", form);

      if (Array.isArray(up.data?.files)) {
        const items = up.data.files as Array<{ fileId: string; name: string; segments: any[] }>;
        if (items.length === 0) {
          toastErr("ZIP nie zawiera żadnych plików IDML.");
        } else {
          items.forEach((doc, idx) => {
            onUploaded?.(doc.fileId, doc.name);
            if (idx === 0) onSelect(doc.fileId);
            onSegments?.(doc.segments);
          });
          toastOk(`Przesłano: ${items.length} dokumentów IDML.`);
        }
      } else {
        const { fileId, segments, originalName } = up.data as {
          fileId: string;
          segments: any[];
          originalName?: string;
        };
        const displayName = originalName || file.name;

        onUploaded?.(fileId, displayName);
        onSelect(fileId);
        onSegments?.(segments);

        toastOk(`Przesłano: ${displayName}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Unexpected error.";
      setErr(msg);
      toastErr(msg);
    } finally {
      setBusyUpload(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  type DeletingState =
    | { id: string; phase: "slide" }
    | { id: string; phase: "collapse" }
    | null;

  const [deleting, setDeleting] = useState<DeletingState>(null);

  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [heights, setHeights] = useState<Record<string, number | "auto">>({});

  const slideHandledRef = useRef<Record<string, boolean>>({});

  const setItemRef = (id: string) => (el: HTMLLIElement | null) => {
    itemRefs.current[id] = el;
    if (el && !(id in heights)) {
      setHeights((h) => ({ ...h, [id]: "auto" }));
    }
  };

  const startDelete = (id: string) => {
    if (deleting) return;
    const el = itemRefs.current[id];
    if (el) {
      const full = el.scrollHeight;
      setHeights((h) => ({ ...h, [id]: full }));
      slideHandledRef.current[id] = false;
      requestAnimationFrame(() => setDeleting({ id, phase: "slide" }));
    } else {
      if (onRemove) onRemove(id);
      else setLocalFiles((prev) => prev.filter((x) => x.id !== id));
    }
  };

  const handleSlideEnd = (id: string) => {
    if (slideHandledRef.current[id]) return;
    slideHandledRef.current[id] = true;

    const el = itemRefs.current[id];
    const full = el?.scrollHeight ?? 0;

    setHeights((h) => ({ ...h, [id]: full }));
    requestAnimationFrame(() => {
      setDeleting({ id, phase: "collapse" });
      requestAnimationFrame(() => {
        setHeights((h) => ({ ...h, [id]: 0 }));
      });
    });
  };

  const handleCollapseEnd = (id: string) => {
    setDeleting(null);
    delete slideHandledRef.current[id];

    if (onRemove) onRemove(id);
    else setLocalFiles((prev) => prev.filter((x) => x.id !== id));

    setTimeout(() => {
      setHeights((h) => {
        const { [id]: _, ...rest } = h;
        return rest;
      });
      delete itemRefs.current[id];
    }, 0);
  };

  const TabBtn = ({
    value,
    label,
    enabled,
    active,
    onClick,
  }: {
    value: Filter;
    label: string;
    enabled: boolean;
    active: boolean;
    onClick: () => void;
  }) => (
    <Button
      role="tab"
      size="sm"
      variant="ghost"
      disabled={!enabled}
      className={clsx(
        "px-1.5 py-0 text-[12px] leading-none rounded-full transition",
        enabled ? "cursor-pointer" : "cursor-not-allowed",
        active ? "bg-white text-black shadow-sm hover:bg-white" : "text-foreground/80 hover:bg-white/5",
        !enabled && "opacity-50 hover:bg-transparent"
      )}
      aria-selected={active}
      aria-disabled={!enabled}
      onClick={() => enabled && onClick()}
      title={
        !enabled
          ? value === "all"
            ? "Brak segmentów"
            : value === "translated"
              ? "Brak przetłumaczonych"
              : "Brak nieprzetłumaczonych"
          : undefined
      }
    >
      {label}
    </Button>
  );

  return (
    <>
      {/* Tytuł aplikacji na górze sidebar */}
      <div className="fixed inset-x-0 top-0 z-60 pointer-events-none">
        <div
          className={[
            "relative pointer-events-auto px-3 py-3 overflow-visible",
            "transition-colors duration-300",
            collapsed ? "bg-background" : "bg-card",
          ].join(" ")}
          style={{
            width: SIDEBAR_W,
            minWidth: SIDEBAR_MIN_W,
            left: 0,
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
            willChange: "transform",
          }}
        >
          <span
            aria-hidden
            className="absolute left-0 bottom-0 h-px w-full bg-white/80 origin-left transition-transform duration-300 ease-in-out"
            style={{ transform: collapsed ? "scaleX(0)" : "scaleX(1)" }}
          />
          <span
            aria-hidden
            className="absolute right-0 top-0 w-px h-full bg-white/80 origin-top transition-transform duration-300 ease-in-out"
            style={{ transform: collapsed ? "scaleY(0)" : "scaleY(1)" }}
          />
          <div className="font-semibold text-white select-none">Tłumacz IDML - segmenty</div>
        </div>
      </div>

      {/* Header overlay*/}
      {hasFiles && !collapsed && (

        <div className="fixed inset-x-0 z-59 pointer-events-none" style={{ top: HEADER_TITLE_H }}>
          <div
            className={[
              "relative pointer-events-auto px-3 py-3 overflow-visible",
              "transition-colors duration-300",
              collapsed ? "bg-background" : "bg-card",
            ].join(" ")}
            style={{ width: SIDEBAR_W, minWidth: SIDEBAR_MIN_W, left: 0 }}
          >
            <span
              aria-hidden
              className="absolute left-0 bottom-0 h-px w-full bg-white/80 origin-left transition-transform duration-300 ease-in-out"
              style={{ transform: collapsed ? "scaleX(0)" : "scaleX(1)" }}
            />
            <span
              aria-hidden
              className="absolute right-0 top-0 w-px h-full bg-white/80 origin-top transition-transform duration-300 ease-in-out"
              style={{ transform: collapsed ? "scaleY(0)" : "scaleY(1)" }}
            />

            <div className="flex flex-wrap items-center gap-1.5 mb-1 mt-2">
              <Badge variant="secondary" className="rounded-full px-0.5 py-0.5 text-[11px]">
                {stats.total} Wykrytych
              </Badge>
              <Badge className="rounded-full px-0.5 py-0.5 text-[11px]">{stats.translated} Przetłumaczonych</Badge>
              <Badge className="rounded-full px-0.5 py-0.5 text-[11px]">
                {stats.untranslated} pozostałych
              </Badge>
            </div>

            <div
              role="tablist"
              aria-label="Filtruj segmenty"
              className={clsx(
                "mt-2 inline-flex w-fit max-w-full items-center",
                "rounded-full border border-white/10 bg-card/40",
                "gap-1 px-1 py-[3px] leading-none"
              )}
            >
              <TabBtn
                value="all"
                label="Wszystkie"
                enabled={can.all}
                active={filter === "all"}
                onClick={() => onChangeFilter("all")}
              />
              <TabBtn
                value="translated"
                label="Przetłumaczone"
                enabled={can.translated}
                active={filter === "translated"}
                onClick={() => onChangeFilter("translated")}
              />
              <TabBtn
                value="untranslated"
                label="Nieprzetłumaczone"
                enabled={can.untranslated}
                active={filter === "untranslated"}
                onClick={() => onChangeFilter("untranslated")}
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2 rounded-xl cursor-pointer"
                disabled={busy || stats.untranslated === 0}
                onClick={onTranslateAll}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                Przetłumacz wszystkie
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-2 rounded-xl cursor-pointer"
                disabled={busy || !fileId || stats.translated === 0}
                onClick={onExport}
                title={!fileId ? "Brak aktywnego pliku" : stats.translated === 0 ? "Brak treści do eksportu" : ""}
              >
                <Download className="h-4 w-4" /> Pobierz
              </Button>
            </div>

            {/* Progress bar*/}
            {progress !== null && (
              <div className="mt-2">
                <Progress value={progress} className="h-1.5 overflow-hidden rounded-full bg-white/10" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer overlay*/}
      <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div
          className={[
            "relative pointer-events-auto p-3 overflow-visible",
            "transition-colors duration-300",
            collapsed ? "bg-background" : "bg-card",
          ].join(" ")}
          style={{
            width: SIDEBAR_W,
            minWidth: SIDEBAR_MIN_W,
            left: 0,
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <span aria-hidden className="absolute left-0 top-0 h-px w-full bg-white/30" />
          <span
            aria-hidden
            className="absolute left-0 top-0 h-px w-full bg-white/80 origin-left transition-transform duration-300 ease-in-out"
            style={{ transform: collapsed ? "scaleX(0)" : "scaleX(1)" }}
          />
          <span aria-hidden className="absolute right-0 top-0 w-px h-full bg-white/30" />
          <span
            aria-hidden
            className="absolute right-0 top-0 w-px h-full bg-white/80 origin-top transition-transform duration-300 ease-in-out"
            style={{ transform: collapsed ? "scaleY(0)" : "scaleY(1)" }}
          />

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">Upload pliku IDML / ZIP</div>
              <div className="text-xs text-(--color-muted)">Wybierz plik .idml albo .zip z wieloma IDML.</div>
            </div>

            <div className="flex items-center gap-2">
              <input ref={inputRef} type="file" accept=".idml,.zip" onChange={onChange} className="hidden" />
              <Button variant="sweep" size="sm" onClick={onPick} disabled={busyUpload}>
                <span className="relative z-10">{busyUpload ? "Wgrywam…" : "Prześlij plik"}</span>
              </Button>
            </div>
          </div>

          {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
        </div>
      </div>

      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 bg-card border-r shadow-sm overflow-visible",
          "transition-transform duration-300 ease-in-out mt-4",
          collapsed ? "-translate-x-full" : "translate-x-0",
        ].join(" ")}
        style={{ width: SIDEBAR_W, minWidth: SIDEBAR_MIN_W }}
        aria-label="Files sidebar"
        aria-hidden={collapsed}
      >
        <div className="h-full flex flex-col mt-2">

          {/* Odstęp na Header*/}
          <div style={{ height: HEADER_TITLE_H + (hasFiles ? HEADER_CTRL_H : 0) }} />

          {/* Lista przesłanych plików */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0" style={{ right: gap }}>
              <div className="h-full overflow-y-auto overscroll-contain p-2" data-ios-scroll>
                {hasFiles && (
                  <li className="text-sm text-(--color-muted) px-1 mt-2">Przesłane pliki:</li>
                )}
                <ul className="mt-2 space-y-1">
                  {sortedFiles.length === 0 && (
                    <li className="text-sm text-(--color-muted) px-1">Brak przesłanych plików</li>
                  )}

                  {sortedFiles.map((f) => {
                    const active = f.id === activeId;
                    const isDeleting = deleting?.id === f.id;
                    const isSlide = isDeleting && deleting?.phase === "slide";
                    const isCollapse = isDeleting && deleting?.phase === "collapse";
                    const liHeight = heights[f.id];
                    const heightPx = typeof liHeight === "number" ? liHeight : undefined;

                    return (
                      <li
                        key={f.id}
                        ref={setItemRef(f.id)}
                        style={{
                          height: heightPx,
                          overflow: isSlide || isCollapse ? "hidden" : undefined,
                          transition: isCollapse ? `height ${COLLAPSE_MS}ms ease` : undefined,
                        }}
                        onTransitionEnd={(ev) => {
                          if (isCollapse && ev.propertyName === "height" && deleting?.id === f.id) {
                            handleCollapseEnd(f.id);
                          }
                        }}
                      >
                        <div className="relative">
                          <button
                            onClick={() => !isDeleting && onSelect(f.id)}
                            className={[
                              "w-full text-left rounded-md px-2 py-2 pr-10 transition focus:outline-none",
                              "cursor-pointer",
                              active ? "bg-[#ffffff0d] hover:bg-[#ffffff14]" : "hover:bg-black/5",
                              "will-change-transform will-change-opacity",
                            ].join(" ")}

                            title={f.name}
                            style={{
                              transform: isSlide ? "translateX(-110%)" : "translateX(0)",
                              opacity: isSlide ? 0 : 1,
                              transition: `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease`,
                              pointerEvents: isDeleting ? "none" : undefined,
                              visibility: isCollapse ? "hidden" : "visible",
                            }}
                            onTransitionEnd={(ev) => {
                              if (isSlide && ev.propertyName === "transform" && deleting?.id === f.id) {
                                handleSlideEnd(f.id);
                              }
                            }}
                          >
                            <div className="truncate font-medium">{f.name}</div>
                            <div className="text-xs text-(--color-muted)">{fmt(f.createdAt)}</div>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isDeleting) askConfirm(f.id, f.name);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-red-600 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:opacity-50 cursor-pointer"
                            aria-label={`Remove ${f.name}`}
                            title="Remove"
                            disabled={!!isDeleting}
                            style={{ visibility: isCollapse ? "hidden" : "visible" }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* odstęp na footer */}
          <div style={{ height: FOOTER_H }} />
        </div>

        {!collapsed && (
          <div
            className="absolute top-1/2 z-50 overflow-hidden"
            style={{ right: -HALF - 1, width: HALF, height: BTN, transform: "translateY(-50%)" }}
          >
            <button
              aria-label="Close sidebar"
              onClick={onToggle}
              className="group relative block w-full h-full focus:outline-none cursor-pointer"
            >
              <span
                className="absolute top-0 rounded-full shadow-md bg-white transition-colors duration-200 group-hover:bg-black"
                style={{ left: -HALF, width: BTN, height: BTN }}
              />
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 text-black transition-colors duration-200 group-hover:text-white"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        )}
      </aside>

      {collapsed && (
        <div
          className="fixed top-1/2 left-0 z-50 overflow-hidden "
          style={{ width: HALF, height: BTN, transform: "translateY(-50%)" }}
        >
          <button
            aria-label="Open sidebar"
            onClick={onToggle}
            className="group relative block w-full h-full focus:outline-none cursor-pointer"
          >
            <span
              className="absolute top-0 rounded-full shadow-md bg-white transition-colors duration-200 group-hover:bg-black"
              style={{ left: -HALF, width: BTN, height: BTN }}
            />
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rotate-180 text-black transition-colors duration-200 group-hover:text-white"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      )}

      <ConfirmDeleteDialog
        open={confirmOpen}
        fileName={confirmTarget?.name}
        onCancel={closeConfirm}
        onConfirm={confirmDelete}
      />
    </>
  );
}

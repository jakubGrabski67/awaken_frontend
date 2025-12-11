"use client";

import type { Segment } from "@/types/segment";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, Languages, CheckCircle2, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import clsx from "clsx";

type Props = {
  segment: Segment;
  onTranslate: () => void | Promise<void>;
  onTranslateReverse?: () => void | Promise<void>;
  disabled?: boolean;
};

function SegmentCardBase({ segment: s, onTranslate, onTranslateReverse, disabled }: Props) {
  
  const [loadingMode, setLoadingMode] = useState<null | "normal" | "reverse">(null);
  const translated = !!s.translatedText?.trim();
  const hasOriginal = !!s.originalText?.trim();

  const onCopy = useCallback(async () => {
    if (!s.translatedText) return;
    try {
      await navigator.clipboard.writeText(s.translatedText);
    } catch { }
  }, [s.translatedText]);

  const handleTranslate = useCallback(async () => {
    if (disabled || loadingMode || translated || !hasOriginal) return;
    try {
      setLoadingMode("normal");
      await onTranslate?.();
    } finally {
      setLoadingMode(null);
    }
  }, [disabled, loadingMode, translated, hasOriginal, onTranslate]);

  const handleTranslateReverse = useCallback(async () => {
    if (!onTranslateReverse || disabled || loadingMode || translated || !hasOriginal) return;
    try {
      setLoadingMode("reverse");
      await onTranslateReverse();
    } finally {
      setLoadingMode(null);
    }
  }, [onTranslateReverse, disabled, loadingMode, translated, hasOriginal]);

  const isBtnDisabled = (btn: "normal" | "reverse") =>
    disabled || !!loadingMode || translated || !hasOriginal || (btn === "reverse" && !onTranslateReverse);

  return (
    <Card
      className={clsx(
        "group rounded-2xl bg-card/80 hover:bg-black/40 focus-within:bg-black transition-colors",
        "backdrop-blur supports-backdrop-filter:bg-card/75",
        "border border-white/10 shadow-[0_6px_24px_rgba(0,0,0,.25)]",
        "ring-1 ring-black/5"
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
            <span className="truncate" title={s.storyPath}>
              {s.storyPath}
            </span>
            <span className="opacity-40">•</span>
            <p className="text-[14px] text-foreground/90">#{(s.index ?? 0) + 1}</p>
          </div>

          <div className="mt-1.5 flex items-center gap-2 pt-2">
            <Badge
              className={clsx(
                "px-2.5 py-0.5 text-[11px] font-medium",
                translated
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/25"
                  : "bg-zinc-500/10 text-muted-foreground ring-1 ring-white/10"
              )}
            >
              {translated ? "Przetłumaczono" : "Oryginał"}
            </Badge>
          </div>
        </div>

        {!translated && hasOriginal && (
          <div className="shrink-0 flex items-center gap-2">
            <Button
              size="sm"
              className={clsx(
                "gap-2 rounded-xl cursor-pointer transition-colors",
                "hover:bg-white hover:text-black",
                "disabled:opacity-60 disabled:pointer-events-none"
              )}
              disabled={isBtnDisabled("normal")}
              onClick={handleTranslate}
              aria-disabled={isBtnDisabled("normal")}
              title="Przetłumacz segment"
            >
              {loadingMode === "normal" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tłumaczę…
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4 transition-colors" />
                  Tłumacz
                </>
              )}
            </Button>

            {onTranslateReverse && (
              <Button
                size="sm"
                className={clsx(
                  "gap-2 rounded-xl cursor-pointer transition-colors",
                  "hover:bg-white hover:text-black",
                  "disabled:opacity-60 disabled:pointer-events-none"
                )}
                disabled={isBtnDisabled("reverse")}
                onClick={handleTranslateReverse}
                aria-disabled={isBtnDisabled("reverse")}
                title="Przetłumacz 'od tyłu' (reverse)"
              >
                {loadingMode === "reverse" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Tłumaczę…
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4 transition-transform rotate-180" />
                    Od&nbsp;tyłu
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0">

        {/* ORYGINAŁ */}
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold tracking-tight text-foreground/90">Oryginał</h3>

          <div
            className={clsx(
              "rounded-xl border px-3.5 py-2.5 text-sm leading-6",
              "bg-muted/60 border-white/10",
              "max-h-56 overflow-auto [scrollbar-width:thin]",
              "**:selection:bg-white/20"
            )}
            data-ios-scroll
            dir="auto"
          >
            {hasOriginal ? (
              <span className="whitespace-pre-wrap wrap-break-word">{s.originalText}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </section>

        <div className="my-4 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

        {/* TŁUMACZENIE */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold tracking-tight text-foreground/90">Tłumaczenie</h3>

            <Button
              variant="ghost"
              size="sm"
              className={clsx(
                "h-8 gap-2 rounded-lg transition-colors cursor-pointer",
                "hover:bg-white hover:text-black",
                !translated && "invisible"
              )}
              onClick={onCopy}
              aria-hidden={!translated}
              tabIndex={translated ? 0 : -1}
              disabled={!translated}
              title={translated ? "Kopiuj tłumaczenie do schowka" : ""}
            >
              <ClipboardCopy className="h-4 w-4 transition-colors" />
              Kopiuj
            </Button>
          </div>

          <div
            className={clsx(
              "rounded-xl border px-3.5 py-2.5 text-sm leading-6 min-h-9",
              "max-h-56 overflow-auto [scrollbar-width:thin] whitespace-pre-wrap wrap-break-word",
              translated
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
                : "bg-muted/60 border-white/10 text-muted-foreground"
            )}
            data-ios-scroll
            dir="auto"
            aria-live="polite"
          >
            {translated ? (
              <div className="relative pl-6">
                <CheckCircle2 className="absolute left-0 top-1 h-4 w-4 text-emerald-400" />
                {s.translatedText}
              </div>
            ) : (
              <span>—</span>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

export default memo(SegmentCardBase);

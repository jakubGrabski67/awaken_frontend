"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

type Props = {
  open: boolean;
  fileName?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteDialog({
  open,
  fileName,
  onCancel,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstBtnRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      <div
        ref={dialogRef}
        className={clsx(
          "relative w-full max-w-md rounded-2xl shadow-2xl",
          "bg-card text-foreground",
          "ring-1 ring-white/10"
        )}
      >
        <div className="p-5">
          <h2 id="confirm-title" className="text-lg font-semibold">
            Czy usunąć plik?
          </h2>
          <p id="confirm-desc" className="mt-2 text-sm text-(--color-muted)">
            Spowoduje to usunięcie pliku
            {fileName ? (
              <>
                {" "}
                <span className="font-semibold">{fileName}</span>.
              </>
            ) : (
              "."
            )}
          </p>

          <div className="mt-5 flex items-center justify-end gap-2 ">
            <button
              ref={firstBtnRef}
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-white/15 hover:bg-white/5 cursor-pointer"
            >
              Anuluj
            </button>

            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 cursor-pointer"
            >
              Usuń
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

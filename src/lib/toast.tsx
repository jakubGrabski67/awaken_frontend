"use client";

import { toast, type ToastOptions } from "react-toastify";

const base: ToastOptions = {
  icon: false,
  closeButton: false,
};

function Row({
  color,
  title,
  desc,
  icon,
}: {
  color: "emerald" | "red";
  title: string;
  desc?: string;
  icon: "check" | "x";
}) {
  return (
    <div className="toast-row">
      <span
        className={[
          "toast-icon",
          color === "emerald" ? "bg-emerald-500/90" : "bg-red-500/90",
        ].join(" ")}
      >
        {icon === "check" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" className="text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" className="text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </span>

      <div className="min-w-0">
        <div className="toast-title">{title}</div>
        {desc ? <div className="toast-text">{desc}</div> : null}
      </div>
    </div>
  );
}

export function toastUploadOk(filename: string, opts?: ToastOptions) {
  return toast(
    <Row color="emerald" title="Przesłano" desc={filename} icon="check" />,
    { ...base, className: "toast--ok", ...opts }
  );
}


export function toastOk(title: string, desc?: string, opts?: ToastOptions) {
  return toast(<Row color="emerald" title={title} desc={desc} icon="check" />, {
    ...base,
    className: "toast--ok",
    ...opts,
  });
}

export function toastErr(title: string, desc?: string, opts?: ToastOptions) {
  return toast(<Row color="red" title={title} desc={desc} icon="x" />, {
    ...base,
    className: "toast--err",
    ...opts,
  });
}


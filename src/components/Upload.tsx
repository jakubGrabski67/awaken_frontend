"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  onUploaded: (fileId: string, name: string) => void;
  onSegments: (segments: any[]) => void;
};

export default function Upload({ onUploaded, onSegments }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isIdml = /\.idml$/i.test(file.name);
    const isZip = /\.zip$/i.test(file.name);
    if (!isIdml && !isZip) {
      setErr("Wgraj plik .idml lub .zip z plikami .idml");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const up = await api.post("/files/upload", form);

      if (Array.isArray(up.data?.files)) {
        const filesResp = up.data.files as Array<{
          fileId: string;
          name: string;
          segments: any[];
        }>;

        for (const f of filesResp) {
          onUploaded(f.fileId, f.name);
          onSegments(f.segments);
        }
      } else {
        const { fileId, segments, originalName } = up.data as {
          fileId: string;
          segments: any[];
          originalName?: string;
        };

        const displayName = originalName || file.name;

        onUploaded(fileId, displayName);
        onSegments(segments);
      }
    } catch (e: any) {
      setErr(e?.message || "Unexpected error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="border rounded-xl p-4 flex items-center justify-between gap-3">
      <div>
        <div className="font-semibold">Upload pliku IDML / ZIP</div>
        <div className="text-sm text-muted-foreground">
          Wybierz plik <code>.idml</code> lub <code>.zip</code> zawierający pliki IDML.
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".idml,.zip"
          onChange={onChange}
          className="hidden"
        />
        <button
          onClick={onPick}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
        >
          {busy ? "Wgrywam…" : "Wybierz plik"}
        </button>
      </div>
      {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
    </div>
  );
}

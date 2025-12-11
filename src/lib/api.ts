import axios, { AxiosError } from "axios";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: false,

  timeout: 60_000,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<any>) => {
    const status = error.response?.status;
    const serverMsg = (error.response?.data as any)?.error;
    const message = serverMsg || error.message || "Unexpected error";

    if (error.message !== message) {
      (error as any).message = message;
    }
    (error as any).status = status;
    return Promise.reject(error);
  }
);

/** Helper do pobierania plików (export IDML) – ustawia responseType i zwraca Blob */
export async function apiDownload(path: string, body?: any): Promise<Blob> {
  const res = await api.post(path, body, { responseType: "arraybuffer" });
  const ct = res.headers["content-type"] || "application/octet-stream";
  return new Blob([res.data], { type: ct });
}

/* Health-check na starcie UI */
export async function apiHealth(): Promise<boolean> {
  try {
    await api.get("/healthz", { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

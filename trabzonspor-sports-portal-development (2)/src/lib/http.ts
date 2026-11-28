const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

interface Opts {
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Toplam deneme sayısı (varsayılan 3). Zaman aşımı, ağ hatası, 429 ve 5xx yeniden denenir. */
  retries?: number;
}

export class HttpError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryable: boolean) {
    super(message);
    this.name = "HttpError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isRetryable = (e: unknown) =>
  e instanceof HttpError ? e.retryable : true; // ağ/timeout/abort → yeniden dene

/**
 * Dayanıklı istek: en az 3 deneme, üstel bekleme (400ms → 1.2s → 3.6s, ±%25 jitter).
 * 4xx (429 hariç) kalıcı hatadır ve tekrar denenmez; 429/5xx/timeout/ağ hatası denenir.
 */
export async function fetchText(url: string, opts: Opts = {}): Promise<string> {
  const attempts = Math.max(1, opts.retries ?? 3);
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        headers: {
          "User-Agent": UA,
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.7",
          ...opts.headers,
        },
      });
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        throw new HttpError(`HTTP ${res.status} — ${new URL(url).hostname}`, res.status, retryable);
      }
      return await res.text();
    } catch (e) {
      lastError = e;
      if (!isRetryable(e) || i === attempts - 1) break;
      const base = 400 * 3 ** i;
      await sleep(base * (0.75 + Math.random() * 0.5));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`İstek başarısız — ${new URL(url).hostname}`);
}

export async function fetchJson<T>(url: string, opts: Opts = {}): Promise<T> {
  const text = await fetchText(url, {
    ...opts,
    headers: { Accept: "application/json", ...opts.headers },
  });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Geçersiz JSON yanıtı — ${new URL(url).hostname}`);
  }
}

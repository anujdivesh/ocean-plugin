import { FetchSource, PMTiles, Protocol } from "pmtiles";
import type { RangeResponse, Source } from "pmtiles";
import type { SourceSpecification } from "maplibre-gl";

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 250;

// FetchSource throws `Bad response code: <status>` for HTTP errors and a TypeError for network failures
function isRetryable(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const status = Number(/Bad response code: (\d+)/.exec(String(error))?.[1]);
  return status === 429 || status >= 500;
}

/**
 * FetchSource that retries transient failures (S3 503 SlowDown, 5xx, 429, dropped connections)
 * with exponential backoff. Without this a single 503 loses the tile, and if it hits the archive
 * header or a directory, pmtiles caches the rejected promise and the layer stays broken until reload.
 */
class RetryingFetchSource implements Source {
  private inner: FetchSource;

  constructor(url: string) {
    this.inner = new FetchSource(url);
  }

  getKey() {
    return this.inner.getKey();
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
    etag?: string,
  ): Promise<RangeResponse> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.inner.getBytes(offset, length, signal, etag);
      } catch (error) {
        if (attempt >= MAX_RETRIES || signal?.aborted || !isRetryable(error)) throw error;
        // 250ms, 500ms, 1s, 2s, plus jitter so parallel tiles don't retry in lockstep
        const delay = BASE_DELAY_MS * 2 ** attempt * (1 + Math.random() * 0.5);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}

/** Register every pmtiles:// source in a style with the protocol, using retrying fetches. */
export function registerPmtilesSources(
  protocol: Protocol,
  sources: Record<string, SourceSpecification>,
) {
  for (const source of Object.values(sources)) {
    if (!("url" in source) || !source.url?.startsWith("pmtiles://")) continue;
    const archiveUrl = source.url.slice("pmtiles://".length);
    if (!protocol.get(archiveUrl)) {
      protocol.add(new PMTiles(new RetryingFetchSource(archiveUrl)));
    }
  }
}

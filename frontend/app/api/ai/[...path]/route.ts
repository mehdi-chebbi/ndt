/**
 * Route Handler: /app/api/ai/[...path]/route.ts
 *
 * Proxies AI SSE endpoints to the backend with real-time streaming.
 * Excluded from next.config.js rewrites to avoid buffering.
 */

export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";

const BACKEND_BASE_URL = "http://backend:3001";
const PROXY_TIMEOUT_MS = 120_000;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

async function proxyRequest(
  request: NextRequest,
  segments: string[]
): Promise<Response> {
  const backendPath = `/api/ai/${segments.join("/")}`;
  const backendUrl = new URL(backendPath, BACKEND_BASE_URL);

  request.nextUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const forwardedHeaders = new Headers();
    request.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        forwardedHeaders.set(key, value);
      }
    });

    forwardedHeaders.set("x-forwarded-for", request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown");
    forwardedHeaders.set("x-forwarded-host", request.headers.get("host") ?? "");
    forwardedHeaders.set("x-forwarded-proto", "http");

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const backendResponse = await fetch(backendUrl.toString(), {
      method: request.method,
      headers: forwardedHeaders,
      body: hasBody ? request.body : undefined,
      // @ts-expect-error — duplex is needed in Node 18+ for streaming bodies
      duplex: "half",
      signal: controller.signal,
    });

    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });
    // Prevent any proxy layer from buffering SSE
    responseHeaders.set("X-Accel-Buffering", "no");
    responseHeaders.set("Cache-Control", "no-cache, no-transform");

    // Fire-and-forget: return Response immediately, stream data in background
    const stream = new ReadableStream({
      start(controller) {
        (async () => {
          const reader = backendResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }
          try {
            let chunkCount = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log(`[ai-proxy] Stream done — ${chunkCount} chunks total`);
                break;
              }
              chunkCount++;
              console.log(`[ai-proxy] Chunk #${chunkCount}: ${value.length} bytes`);
              controller.enqueue(value);
            }
            controller.close();
          } catch (err) {
            console.error(`[ai-proxy] Stream error:`, err);
            controller.error(err);
          }
        })();
      },
    });

    return new Response(stream, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`[ai-proxy] Timeout after ${PROXY_TIMEOUT_MS / 1000}s — ${request.method} ${backendUrl}`);
      return Response.json(
        { error: "Gateway Timeout", message: "AI service did not respond in time." },
        { status: 504 }
      );
    }

    console.error(`[ai-proxy] Upstream error — ${request.method} ${backendUrl}:`, error);
    return Response.json(
      { error: "Bad Gateway", message: "Failed to reach the backend." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

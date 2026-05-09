/**
 * Route Handler: /app/api/clip/[...path]/route.ts
 *
 * WHY THIS EXISTS:
 * Next.js rewrites (next.config.js) use an internal proxy with a hardcoded
 * 30-second timeout. Requests to /api/clip/country can take 30–180 seconds,
 * so they get dropped. This Route Handler manually proxies the request using
 * fetch() + AbortController, giving us full control over the timeout.
 *
 * HOW IT WORKS:
 * 1. Next.js catches any request to /api/clip/* (via the [...path] catch-all).
 * 2. We reconstruct the full backend URL using the captured path segments.
 * 3. We forward the method, headers, and body to the backend untouched.
 * 4. fetch() is wired to an AbortController with a 5-minute timeout.
 * 5. The backend's response (status, headers, body) is streamed back to the client.
 * 6. If the timeout fires, or any network error occurs, we return a clean JSON error.
 *
 * IMPORTANT — remove the /api/clip/* rewrite from next.config.js once this
 * file is in place, otherwise Next.js will match the rewrite first and this
 * handler will never be reached.
 */

import { NextRequest, NextResponse } from "next/server";

/** Where your Express backend lives inside Docker. */
const BACKEND_BASE_URL = "http://backend:3001";

/** 5 minutes — covers the worst-case clip/country response time. */
const PROXY_TIMEOUT_MS = 300_000;

/**
 * Headers that must NOT be forwarded to the backend.
 * These are managed by the fetch/HTTP layer automatically.
 */
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  // Next.js sets its own host header when forwarding
  "host",
]);

/**
 * Core proxy logic shared by all HTTP method handlers.
 *
 * @param request  - The incoming Next.js request
 * @param segments - The [...path] catch-all segments, e.g. ["clip", "country"]
 */
async function proxyRequest(
  request: NextRequest,
  segments: string[]
): Promise<NextResponse> {
  // ── 1. Build the backend URL ──────────────────────────────────────────────
  // segments comes from the dynamic route, e.g. /api/clip/country → ["country"]
  // We always prepend /api/clip/ to match the backend's own route structure.
  const backendPath = `/api/clip/${segments.join("/")}`;
  const backendUrl = new URL(backendPath, BACKEND_BASE_URL);

  // Preserve any query parameters from the original request
  request.nextUrl.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  // ── 2. Set up the 5-minute timeout ────────────────────────────────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    // ── 3. Forward headers (strip hop-by-hop) ────────────────────────────────
    const forwardedHeaders = new Headers();
    request.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        forwardedHeaders.set(key, value);
      }
    });

    // Tell the backend where the request actually came from
const clientIp =
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
forwardedHeaders.set("x-forwarded-for", clientIp);
    forwardedHeaders.set("x-forwarded-host", request.headers.get("host") ?? "");
    forwardedHeaders.set("x-forwarded-proto", "http");

    // ── 4. Forward the request to the backend ─────────────────────────────────
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const backendResponse = await fetch(backendUrl.toString(), {
      method: request.method,
      headers: forwardedHeaders,
      // Body is streamed directly — no buffering in memory
      body: hasBody ? request.body : undefined,
      // Required for streaming the request body
      // @ts-expect-error — duplex is needed in Node 18+ for streaming bodies
      duplex: "half",
      signal: controller.signal,
    });

    // ── 5. Stream the response back to the client ─────────────────────────────
    const responseHeaders = new Headers();
    backendResponse.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    // ── 6. Error handling ─────────────────────────────────────────────────────
    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        `[proxy] Timeout after ${PROXY_TIMEOUT_MS / 1000}s — ${request.method} ${backendUrl}`
      );
      return NextResponse.json(
        {
          error: "Gateway Timeout",
          message: `Backend did not respond within ${PROXY_TIMEOUT_MS / 1000} seconds.`,
        },
        { status: 504 }
      );
    }

    console.error(`[proxy] Upstream error — ${request.method} ${backendUrl}:`, error);
    return NextResponse.json(
      {
        error: "Bad Gateway",
        message: "Failed to reach the backend. Check that the service is running.",
      },
      { status: 502 }
    );
  } finally {
    // Always clear the timeout — even if fetch already resolved
    clearTimeout(timeoutId);
  }
}

// ── Route exports — Next.js requires a named export per HTTP method ──────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return proxyRequest(request, params.path);
}

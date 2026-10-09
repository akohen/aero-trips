/**
 * Umami custom events, server-side.
 *
 * Cloud Run throttles CPU once a response is sent, so a fire-and-forget POST
 * would frequently be killed mid-flight. Every send is therefore awaited —
 * which puts Umami on the critical path of each MCP call. Two safeguards
 * follow from that: a short timeout, and a circuit breaker so an Umami outage
 * degrades analytics rather than the server.
 *
 * Analytics must never break a tool call: every failure path here is swallowed.
 */
import { warn as logWarn } from 'firebase-functions/logger'

// The website ID is public (it is in index.html) and the endpoint takes no
// credential, so it lives in functions/mcp/.env.
const ENDPOINT = 'https://gateway.umami.is/api/send'
// Umami silently drops events whose User-Agent `isbot` flags, which includes
// anything without a browser-like platform token ("compatible;", "server"...).
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AeroTrips-MCP/1.0'
const TIMEOUT_MS = 1000
/** Consecutive failures before the breaker opens. */
const FAILURE_THRESHOLD = 3
/** How long the breaker stays open before a single retry is allowed. */
const COOLDOWN_MS = 60_000

let consecutiveFailures = 0
let breakerOpenedAt = 0
let warnedMissingConfig = false

const breakerIsOpen = () => {
  if (consecutiveFailures < FAILURE_THRESHOLD) return false
  if (Date.now() - breakerOpenedAt < COOLDOWN_MS) return true
  // Cooldown elapsed: allow one probe through. A failure re-opens the breaker.
  consecutiveFailures = FAILURE_THRESHOLD - 1
  return false
}

export type AnalyticsEvent = {
  name: string
  params: Record<string, unknown>
}

/**
 * Sends one event. Resolves regardless of outcome.
 *
 * Umami derives its session from IP + User-Agent, so every MCP call shares the
 * function's egress session: event counts and properties are accurate, while
 * visitor counts and locations say nothing about MCP clients.
 */
export async function sendEvent(event: AnalyticsEvent): Promise<void> {
  const website = process.env.UMAMI_WEBSITE_ID ?? ''

  if (!website) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true
      logWarn('umami_not_configured', {
        detail: 'UMAMI_WEBSITE_ID unset; analytics disabled.',
      })
    }
    return
  }

  if (breakerIsOpen()) return

  const body = {
    type: 'event',
    payload: {
      website,
      hostname: 'aerotrips.fr',
      url: '/mcp',
      name: event.name,
      data: Object.fromEntries(
        Object.entries(event.params).filter(([, v]) => v !== undefined),
      ),
    },
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`Umami responded ${response.status}`)
    consecutiveFailures = 0
  } catch (err) {
    consecutiveFailures++
    if (consecutiveFailures === FAILURE_THRESHOLD) {
      breakerOpenedAt = Date.now()
      logWarn('umami_circuit_open', {
        detail: `${FAILURE_THRESHOLD} consecutive failures; pausing Umami for ${COOLDOWN_MS}ms.`,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

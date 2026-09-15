/**
 * GA4 Measurement Protocol, server-side.
 *
 * Cloud Run throttles CPU once a response is sent, so a fire-and-forget POST
 * would frequently be killed mid-flight. Every send is therefore awaited —
 * which puts Google Analytics on the critical path of each MCP call. Two
 * safeguards follow from that: a short timeout, and a circuit breaker so a GA
 * outage degrades analytics rather than the server.
 *
 * Analytics must never break a tool call: every failure path here is swallowed.
 */
import { defineSecret } from 'firebase-functions/params'
import { warn as logWarn } from 'firebase-functions/logger'

// Read from the environment rather than defineString(): a declared string
// param is PROMPTED FOR interactively at emulator start and at deploy, which
// hangs a non-interactive CI deploy. The measurement ID is not a secret — it
// is already public in index.html — so it lives in functions/mcp/.env.
// The API secret is a real credential and stays in Secret Manager.
const GA4_API_SECRET = defineSecret('GA4_API_SECRET')

export const ga4Secrets = [GA4_API_SECRET]

const ENDPOINT = 'https://www.google-analytics.com/mp/collect'
const TIMEOUT_MS = 1000
/** Consecutive failures before the breaker opens. */
const FAILURE_THRESHOLD = 3
/** How long the breaker stays open before a single retry is allowed. */
const COOLDOWN_MS = 60_000

let consecutiveFailures = 0
let breakerOpenedAt = 0
let warnedMissingConfig = false

/** GA4 rejects values over 100 chars; strings are clipped rather than dropped. */
const clip = (value: unknown) =>
  typeof value === 'string' ? value.slice(0, 100) : value

const breakerIsOpen = () => {
  if (consecutiveFailures < FAILURE_THRESHOLD) return false
  if (Date.now() - breakerOpenedAt < COOLDOWN_MS) return true
  // Cooldown elapsed: allow one probe through. A failure re-opens the breaker.
  consecutiveFailures = FAILURE_THRESHOLD - 1
  return false
}

export type Ga4Event = {
  name: string
  params: Record<string, unknown>
}

/**
 * Sends one event. Resolves regardless of outcome.
 *
 * The transport is stateless, so there is no session to attach events to: a
 * fresh client_id and session_id are generated per call. GA4 event counts and
 * parameters are therefore accurate, while its user and session counts are
 * not — they track requests. See CLAUDE.md.
 */
export async function sendEvent(event: Ga4Event): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID ?? ''
  const apiSecret = GA4_API_SECRET.value()

  if (!measurementId || !apiSecret) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true
      logWarn('ga4_not_configured', {
        detail: 'GA4_MEASUREMENT_ID or GA4_API_SECRET unset; analytics disabled.',
      })
    }
    return
  }

  if (breakerIsOpen()) return

  const clientId = crypto.randomUUID()
  const body = {
    client_id: clientId,
    events: [{
      name: event.name,
      params: {
        ...Object.fromEntries(
          Object.entries(event.params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, clip(v)]),
        ),
        session_id: clientId,
        // Without this GA4 accepts the event but leaves engagement reports empty.
        engagement_time_msec: 1,
      },
    }],
  }

  try {
    const response = await fetch(
      `${ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    )
    // The collect endpoint returns 204 on success and does not validate the
    // payload; malformed events are silently dropped by GA4.
    if (!response.ok) throw new Error(`GA4 responded ${response.status}`)
    consecutiveFailures = 0
  } catch (err) {
    consecutiveFailures++
    if (consecutiveFailures === FAILURE_THRESHOLD) {
      breakerOpenedAt = Date.now()
      logWarn('ga4_circuit_open', {
        detail: `${FAILURE_THRESHOLD} consecutive failures; pausing GA4 for ${COOLDOWN_MS}ms.`,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

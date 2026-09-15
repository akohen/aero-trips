/**
 * One structured log entry per tool call.
 *
 * Cloud Run already logs the HTTP request, but every MCP call is an identical
 * POST /mcp — the tool name lives in the JSON-RPC body. Without this you can
 * see traffic volume but not which tools anyone actually uses.
 *
 * firebase-functions' logger writes structured JSON to stdout, which arrives in
 * Cloud Logging as jsonPayload: queryable, and usable as a log-based metric.
 */
import { error as logError, info as logInfo } from 'firebase-functions/logger'
import { sendEvent } from './analytics.ts'

/** What a tool handler returns; the wrapper turns it into the MCP shape. */
export type ToolOutcome = {
  text: string
  /** Number of items found, for tools that search. Logged, not displayed. */
  count?: number
  isError?: boolean
}

/**
 * Parameters safe to record. Free-text `query` is reduced to a boolean: it is
 * typed by a person and says more about them than about usage of the server.
 * Coordinates are rounded to ~11 km for the same reason; ICAO codes and
 * activity types are public identifiers and kept as-is, since "which airfields
 * get looked up" is the interesting question.
 */
const LOGGED_KEYS = [
  'icao', 'near_icao', 'activity_id', 'id', 'types', 'services', 'status',
  'fuel', 'radius_km', 'limit', 'what', 'night_vfr', 'hard_runway', 'toilets',
  'min_runway_length', 'include_nearby',
] as const

const COARSE_COORDS = ['lat', 'lon', 'near_lat', 'near_lon'] as const

function summarize(args: Record<string, unknown>): Record<string, unknown> {
  const summary: Record<string, unknown> = {}
  for (const key of LOGGED_KEYS) {
    if (args[key] !== undefined) summary[key] = args[key]
  }
  for (const key of COARSE_COORDS) {
    const value = args[key]
    if (typeof value === 'number') summary[key] = Math.round(value * 10) / 10
  }
  if (typeof args.query === 'string' && args.query.length > 0) summary.has_query = true
  return summary
}

type Handler<A> = (args: A) => Promise<ToolOutcome> | ToolOutcome

/** Wraps a tool handler: times it, logs it, and returns the MCP content shape. */
export function withLogging<A extends Record<string, unknown>>(tool: string, handler: Handler<A>) {
  return async (args: A) => {
    const started = Date.now()
    try {
      const outcome = await handler(args)
      const duration_ms = Date.now() - started
      logInfo('mcp_tool_call', {
        tool,
        ok: !outcome.isError,
        duration_ms,
        ...(outcome.count !== undefined ? { results: outcome.count } : {}),
        ...summarize(args),
      })
      // Awaited deliberately: Cloud Run throttles CPU after the response, so a
      // detached send would often be killed. sendEvent never throws.
      await sendEvent({
        name: 'mcp_tool_call',
        params: {
          tool,
          ok: !outcome.isError,
          duration_ms,
          ...(outcome.count !== undefined ? { results: outcome.count } : {}),
        },
      })
      return {
        content: [{ type: 'text' as const, text: outcome.text }],
        ...(outcome.isError ? { isError: true } : {}),
      }
    } catch (err) {
      logError('mcp_tool_error', {
        tool,
        ok: false,
        duration_ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
        ...summarize(args),
      })
      await sendEvent({ name: 'mcp_tool_error', params: { tool } })
      throw err
    }
  }
}

/**
 * Public, read-only MCP server for AeroTrips, exposed at https://aerotrips.fr/mcp
 * (Firebase Hosting rewrites /mcp to this function).
 *
 * Transport is Streamable HTTP in STATELESS mode: every POST builds its own
 * server + transport and answers with a single JSON response. That is the only
 * shape that works on a serverless runtime — an SSE stream would hold the
 * request open, billing until the timeout, for no benefit here.
 */
import { onRequest } from 'firebase-functions/v2/https'
import type { Request } from 'firebase-functions/v2/https'
import type { Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerTools, SERVER_INSTRUCTIONS } from './tools.ts'

const ALLOW_HEADERS = 'content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id'
const EXPOSE_HEADERS = 'mcp-session-id, mcp-protocol-version'

const setCors = (res: Response) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', ALLOW_HEADERS)
  res.set('Access-Control-Expose-Headers', EXPOSE_HEADERS)
  res.set('Access-Control-Max-Age', '86400')
  res.set('Cache-Control', 'no-store')
}

const rpcError = (res: Response, status: number, code: number, message: string) => {
  res.status(status).json({ jsonrpc: '2.0', error: { code, message }, id: null })
}

export const mcp = onRequest(
  {
    region: 'europe-west1',
    // Dedicated runtime identity with NO project roles. This server reads only
    // data baked into its own bundle, so it needs no GCP permissions at all —
    // whereas the default runtime account carries Editor on the whole project.
    serviceAccount: 'mcp-runtime@aero-trips.iam.gserviceaccount.com',
    memory: '256MiB',
    // cpu: 1 is required for concurrency > 1 — at 256MiB the default is 0.583
    // and Cloud Run rejects the combination.
    cpu: 1,
    concurrency: 20,
    // One instance x 20 concurrent requests is ample here, and makes the cost
    // of a public unauthenticated endpoint structurally bounded.
    maxInstances: 1,
    timeoutSeconds: 30,
    invoker: 'public',
  },
  async (req: Request, res: Response) => {
    setCors(res)

    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    if (req.method !== 'POST') {
      // Stateless: there is no SSE stream to resume (GET) and no session to
      // terminate (DELETE). Answering cleanly makes clients fall back to POST.
      res.set('Allow', 'POST, OPTIONS')
      rpcError(res, 405, -32000, 'Method not allowed. This MCP server is stateless; use POST.')
      return
    }

    // A fresh server and transport per request. With concurrency > 1 a warm
    // instance handles overlapping requests, so a shared transport would leak
    // one caller's response state into another's.
    const server = new McpServer(
      { name: 'aerotrips', version: '1.0.0' },
      { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
    )
    registerTools(server)

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })

    res.on('close', () => {
      void transport.close()
      void server.close()
    })

    try {
      await server.connect(transport)
      // firebase-functions has already run body-parser, so the request stream is
      // consumed: the parsed body must be handed over explicitly or the
      // transport waits on an exhausted stream until the timeout.
      // firebase-functions ships Express 4 types; the transport is typed against
      // node:http. Same objects at runtime, so cast to the transport's own
      // parameter types rather than widening to any.
      type HandleArgs = Parameters<StreamableHTTPServerTransport['handleRequest']>
      await transport.handleRequest(
        req as unknown as HandleArgs[0],
        res as unknown as HandleArgs[1],
        req.body,
      )
    } catch (error) {
      console.error('MCP request failed', error)
      if (!res.headersSent) rpcError(res, 500, -32603, 'Internal server error')
    }
  },
)

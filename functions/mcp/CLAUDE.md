# MCP function

- Transport is **Streamable HTTP, stateless**: a fresh `McpServer` + transport per request,
  `sessionIdGenerator: undefined`, `enableJsonResponse: true`. firebase-functions already parses the
  body, so `transport.handleRequest(req, res, req.body)` **must** receive it explicitly.
- **esbuild** bundles `functions/mcp/src/index.ts` → `functions/mcp/lib/index.js`, inlining the JSON
  snapshots and the `src/` utils it reuses. No Firestore at runtime. Data is therefore only as fresh
  as the last `npm run export` + deploy — the snapshot date is surfaced in every tool response.
- Build: `npm --prefix functions/mcp run build`. Test with
  `npx firebase emulators:start --only functions,hosting --project demo-aerotrips`, through the **Hosting**
  emulator on `:5000`, not the functions emulator on `:5001` — only that exercises the rewrite. POSTs require
  `Accept: application/json, text/event-stream` (406 without).
- Publishing to `registry.modelcontextprotocol.io`: claim the `fr.aerotrips/*` namespace with a DNS TXT record on
  `aerotrips.fr` (`v=MCPv1; k=ed25519; p=<public key>`), then
  `mcp-publisher login dns --domain=aerotrips.fr --private-key=<hex>` and `mcp-publisher publish`.

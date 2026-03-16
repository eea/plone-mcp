# XMCP Migration – Decision Points

Derived from `specs/xmcp-migration-plan.md` (Open Questions & Phase notes). Each item needs stakeholder guidance before execution proceeds.

1. **XMCP framework version pin**
   - *Question:* Which exact `xmcp` release should we lock to for the migration (plan currently suggests `0.4.0` as an example)?
   - *Decision:* Use the latest published XMCP release.
   - *Impact:* Determines compatibility matrix, dependency updates, and whether we need to consume patches from the vendored `xmcp/` snapshot.

2. **Transport scope**
   - *Question:* Do we need to support an HTTP transport (for hosted environments like Vercel/Replit) in addition to the stdio transport?
   - *Decision:* Yes—HTTP transport preferred alongside stdio.
   - *Impact:* Shapes `xmcp.config.ts`, middleware wiring, and CI coverage for multiple transports.

3. **Configuration persistence**
   - *Question:* Should `plone_configure` persist credentials/config between sessions (e.g., file-backed cache) or stay in-memory per process?
   - *Decision:* Keep configuration in-memory per process; no on-disk persistence.
   - *Impact:* Determines middleware storage strategy and any security reviews around on-disk secrets.

4. **Authentication middleware**
   - *Question:* Are we expected to introduce XMCP auth middlewares (API key/JWT) ahead of tool execution?
   - *Decision:* TBD (no requirement yet; keep option open).
   - *Impact:* Influences middleware stack, documentation, and potential breaking changes for existing clients.

5. **Release strategy**
   - *Question:* How should we version and release the XMCP-backed build (beta channel such as `1.1.0-xmcp.beta` vs. direct stable/major release)?
   - *Decision:* Ship directly as the next major release (no beta channel).
   - *Impact:* Affects rollout messaging, CI gating, and how long we maintain the legacy server entry point.

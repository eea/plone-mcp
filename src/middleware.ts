/**
 * MCP Middleware to filter tools based on ENABLED_TOOLS environment variable.
 * This makes tools "completely disappear" from the MCP client's perspective
 * by filtering the results of the tools/list JSON-RPC call.
 *
 * Using 'any' types for Express parameters to avoid dependency on @types/express.
 */
export default function toolsFilterMiddleware(
  req: any,
  res: any,
  next: any,
) {
  const enabledToolsEnv = process.env.ENABLED_TOOLS;

  // If no filter is set, just continue
  if (!enabledToolsEnv) {
    return next();
  }

  const enabledTools = new Set(
    enabledToolsEnv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  );

  // Always allow plone_configure as it's essential for operation
  enabledTools.add("plone_configure");

  // Capture the original send method
  const originalSend = res.send;

  // Override send to intercept the response
  res.send = function (body: any): any {
    try {
      // We only care about JSON responses that might contain tools/list result
      const contentType = res.get("Content-Type");
      if (contentType && contentType.includes("application/json")) {
        let data;
        if (typeof body === "string") {
          data = JSON.parse(body);
        } else if (Buffer.isBuffer(body)) {
          data = JSON.parse(body.toString());
        } else {
          data = body;
        }

        // Check if this is a response to tools/list
        // MCP SDK responses for tools/list have result.tools
        if (data && data.result && Array.isArray(data.result.tools)) {
          data.result.tools = data.result.tools.filter((tool: any) =>
            enabledTools.has(tool.name),
          );

          // Update the body with filtered tools
          const newBody = JSON.stringify(data);
          // Update Content-Length if it was set
          if (res.get("Content-Length")) {
            res.set("Content-Length", String(Buffer.byteLength(newBody)));
          }
          return originalSend.call(this, newBody);
        }
      }
    } catch (e) {
      console.error("[Middleware] Error filtering tools:", e);
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * MCP Middleware to filter tools based on ENABLED_TOOLS environment variable.
 * This middleware intercepts JSON-RPC responses for 'tools/list' and removes
 * any tools not explicitly listed in the ENABLED_TOOLS comma-separated string.
 */
export default function toolsFilterMiddleware(req: any, res: any, next: any) {
  const enabledToolsEnv = process.env.ENABLED_TOOLS;

  // If no filtering is requested, proceed normally
  if (!enabledToolsEnv) {
    return next();
  }

  const enabledTools = new Set(
    enabledToolsEnv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  );

  // plone_configure is essential for authentication and cannot be disabled
  enabledTools.add("plone_configure");

  const originalWriteHead = res.writeHead;
  const originalWrite = res.write;
  const originalEnd = res.end;
  const chunks: any[] = [];

  /**
   * Parses the response body and filters the tools list if present.
   */
  const filterTools = (body: string): string => {
    // Quick check to avoid parsing non-tool-list responses
    if (!body.includes('"tools"') || !body.includes('"result"')) {
      return body;
    }

    try {
      const data = JSON.parse(body);
      let filtered = false;

      const processItem = (item: any) => {
        if (item && item.result && Array.isArray(item.result.tools)) {
          const originalCount = item.result.tools.length;
          item.result.tools = item.result.tools.filter((tool: any) =>
            enabledTools.has(tool.name),
          );
          if (item.result.tools.length !== originalCount) {
            filtered = true;
          }
        }
      };

      if (Array.isArray(data)) {
        data.forEach(processItem);
      } else {
        processItem(data);
      }

      if (filtered) {
        return JSON.stringify(data);
      }
      return body;
    } catch (e) {
      // In case of parse error, return original body safely
      return body;
    }
  };

  // Intercept writeHead to remove Content-Length, as we might change the body size
  res.writeHead = function (statusCode: number, ...args: any[]) {
    if (statusCode === 200) {
      const headers = args[args.length - 1];
      if (typeof headers === "object" && headers !== null) {
        delete headers["Content-Length"];
        delete headers["content-length"];
      }
      if (typeof res.removeHeader === "function") {
        res.removeHeader("Content-Length");
        res.removeHeader("content-length");
      }
    }
    return originalWriteHead.call(this, statusCode, ...args);
  };

  // Buffer all chunks
  res.write = function (chunk: any, encoding?: any, callback?: any) {
    if (chunk) chunks.push(chunk);
    return true;
  };

  // Process the complete response on end
  res.end = function (chunk: any, encoding?: any, callback?: any) {
    if (chunk) chunks.push(chunk);

    let body = "";
    for (const c of chunks) {
      if (typeof c === "string") {
        body += c;
      } else if (typeof c?.toString === "function") {
        body += c.toString(typeof encoding === "string" ? encoding : "utf8");
      }
    }

    const filteredBody = filterTools(body);

    // Call the original end with the (potentially) modified body
    return originalEnd.call(this, filteredBody, "utf8", callback);
  };

  next();
}

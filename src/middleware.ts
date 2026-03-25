import { Request, Response, NextFunction } from "express";

/**
 * MCP Middleware to filter tools based on ENABLED_TOOLS environment variable.
 * This middleware intercepts JSON-RPC responses for 'tools/list' and removes
 * any tools not explicitly listed in the ENABLED_TOOLS comma-separated string.
 */
export default function toolsFilterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
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
  const originalEnd = res.end;
  const chunks: Buffer[] = [];

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processItem = (item: any) => {
        if (item && item.result && Array.isArray(item.result.tools)) {
          const originalCount = item.result.tools.length;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch {
      // In case of parse error, return original body safely
      return body;
    }
  };

  // Intercept writeHead to remove Content-Length, as we might change the body size
  res.writeHead = function (statusCode: number, ...args: unknown[]) {
    if (statusCode === 200) {
      const headers = args[args.length - 1] as
        | Record<string, string | string[] | undefined>
        | undefined;
      if (typeof headers === "object" && headers !== null) {
        delete headers["Content-Length"];
        delete headers["content-length"];
      }
      if (typeof res.removeHeader === "function") {
        res.removeHeader("Content-Length");
        res.removeHeader("content-length");
      }
    }
    // Calling original writeHead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalWriteHead as any).apply(this, [statusCode, ...args]);
  };

  // Buffer all chunks
  res.write = function (
    chunk: string | Buffer,
    encodingOrCb?: BufferEncoding | ((error: Error | null | undefined) => void),
    cb?: (error: Error | null | undefined) => void,
  ) {
    if (chunk) {
      if (typeof chunk === "string") {
        const encoding =
          typeof encodingOrCb === "string" ? encodingOrCb : "utf8";
        chunks.push(Buffer.from(chunk, encoding));
      } else {
        chunks.push(chunk);
      }
    }
    if (typeof encodingOrCb === "function") {
      encodingOrCb(null);
    } else if (typeof cb === "function") {
      cb(null);
    }
    return true;
  };

  // Process the complete response on end
  res.end = function (
    chunk?: string | Buffer | (() => void),
    encodingOrCb?: BufferEncoding | (() => void),
    cb?: () => void,
  ) {
    let finalChunk: string | Buffer | undefined;
    let finalEncoding: BufferEncoding = "utf8";
    let finalCb: (() => void) | undefined;

    if (typeof chunk === "function") {
      finalCb = chunk;
    } else {
      finalChunk = chunk;
      if (typeof encodingOrCb === "function") {
        finalCb = encodingOrCb;
      } else {
        finalEncoding = encodingOrCb || "utf8";
        finalCb = cb;
      }
    }

    if (finalChunk) {
      if (typeof finalChunk === "string") {
        chunks.push(Buffer.from(finalChunk, finalEncoding));
      } else {
        chunks.push(finalChunk);
      }
    }

    const body = Buffer.concat(chunks).toString("utf8");
    const filteredBody = filterTools(body);

    // Call the original end with the (potentially) modified body
    return originalEnd.call(this, filteredBody, "utf8", finalCb);
  };

  next();
}

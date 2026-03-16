# xmcp Application

This project was created with [create-xmcp-app](https://github.com/basementstudio/xmcp).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

This will start the MCP server with the selected transport method.

## Project Structure

This project uses the structured approach where tools, prompts, and resources are automatically discovered from their respective directories:

```
my-project/
├── src/
│   ├── middleware.ts   # Middleware for http request/response processing
│   └── tools/          # Tool files are auto-discovered here
│       ├── greet.ts
│       ├── search.ts
│   └── prompts/        # Prompt files are auto-discovered here
│       ├── review-code.ts
│       ├── team-greeting.ts
│   └── resources/      # Resource files are auto-discovered here
│       ├── (config)/app.ts
│       ├── (users)/[userId]/profile.ts
├── dist/               # Built output (generated)
├── package.json
├── tsconfig.json
└── xmcp.config.ts      # Configuration file for xmcp
```

- `src/tools` - Tool definitions
- `src/prompts` - Prompt templates
- `src/resources` - Resource handlers

## Scripts

The following scripts are available:

- `xmcp dev` - Starts the development server. This listens for changes and automatically reloads the server.
- `xmcp build` - Builds the application for production. This will create a `dist` directory with the compiled code.
- `node dist/[transport].js` - Starts the production server. This is the server that will be used in production.

Based on the transport you've chosen when bootstrapping your project, the `[transport]` placeholder will be replaced with the appropriate one (`http` or `stdio`).

### Tools

Each tool is defined in its own file with the following structure:

```typescript
import { z } from "zod";
import { type InferSchema } from "xmcp";

// Define the schema for tool parameters
export const schema = {
  name: z.string().describe("The name of the user to greet"),
};

// Define tool metadata
export const metadata = {
  name: "greet",
  description: "Greet the user",
  annotations: {
    title: "Greet the user",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function greet({ name }: InferSchema<typeof schema>) {
  const result = `Hello, ${name}!`;

  return {
    content: [{ type: "text", text: result }],
  };
}
```

If you're returning a string or number only, you can shortcut the return value:

```typescript
export default async function greet({ name }: InferSchema<typeof schema>) {
  return `Hello, ${name}!`;
}
```

### Prompts

Prompts are template definitions for AI interactions:

```typescript
import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  code: z.string().describe("The code to review"),
};

export const metadata: PromptMetadata = {
  name: "review-code",
  title: "Review Code",
  description: "Review code for best practices and potential issues",
  role: "user",
};

export default function reviewCode({ code }: InferSchema<typeof schema>) {
  return `Please review this code: ${code}`;
}
```

### Resources

Resources provide data or content with URI-based access:

```typescript
import { z } from "zod";
import { type ResourceMetadata, type InferSchema } from "xmcp";

export const schema = {
  userId: z.string().describe("The ID of the user"),
};

export const metadata: ResourceMetadata = {
  name: "user-profile",
  title: "User Profile",
  description: "User profile information",
};

export default function handler({ userId }: InferSchema<typeof schema>) {
  return `Profile data for user ${userId}`;
}
```

## Adding New Components

### Adding New Tools

To add a new tool:

1. Create a new `.ts` file in the `src/tools` directory
2. Export a `schema` object defining the tool parameters using Zod
3. Export a `metadata` object with tool information
4. Export a default function that implements the tool logic

### Adding New Prompts

To add a new prompt:

1. Create a new `.ts` file in the `src/prompts` directory
2. Export a `schema` object defining the prompt parameters using Zod
3. Export a `metadata` object with prompt information and role
4. Export a default function that returns the prompt text

### Adding New Resources

To add a new resource:

1. Create a new `.ts` file in the `src/resources` directory
2. Use folder structure to define the URI (e.g., `(users)/[userId]/profile.ts` → `users://{userId}/profile`)
3. Export a `schema` object for dynamic parameters (optional for static resources)
4. Export a `metadata` object with resource information
5. Export a default function that returns the resource content

## Building for Production

To build your project for production:

```bash
pnpm build
```

This will compile your TypeScript code and output it to the `dist` directory.

## Running the Server

You can run the server for the transport built with:

- HTTP: `node dist/http.js`
- STDIO: `node dist/stdio.js`

Given the selected transport method, you will have a custom start script added to the `package.json` file.

For HTTP:

```bash
pnpm dev
```

For STDIO:

```bash
pnpm start
```

Or directly:

```bash
node dist/stdio.js
```

## Connecting to Your Server

### HTTP Transport

By default, xmcp will use port `3001`. If you're using a different port, you can change it in your `xmcp.config.ts` file.

**Cursor:**

```json
{
  "mcpServers": {
    "my-project": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

**Claude Desktop:**

```json
{
  "mcpServers": {
    "my-project": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3001/mcp"]
    }
  }
}
```

### STDIO Transport

For STDIO transport with local development:

```json
{
  "mcpServers": {
    "my-project": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/my-project/dist/stdio.js"]
    }
  }
}
```

## Troubleshooting

If you encounter issues when running the built server, make sure the transport is matching the configured one in `xmcp.config.ts`.

If you're working with HTTP, your configuration should look like this:

```typescript title="xmcp.config.ts"
const config: XmcpConfig = {
  http: true,
};
```

If you're working with STDIO, your configuration should look like this:

```typescript title="xmcp.config.ts"
const config: XmcpConfig = {
  stdio: true,
};
```

You can have both transports configured, but you'll need to update the scripts to match them. For example:

```json title="package.json"
{
  "scripts": {
    "start:http": "node dist/http.js",
    "start:stdio": "node dist/stdio.js"
  }
}
```

## Learn More

- [xmcp Documentation](https://xmcp.dev/docs)

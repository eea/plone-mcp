import { z } from "zod";
import { headers } from "xmcp/headers";
import { sessionManager } from "plone-mcp/session-manager";
import { wrapError } from "plone-mcp/utils/block-utils";
import { getSessionId } from "plone-mcp/utils/session";
import type { InferSchema, ToolMetadata } from "xmcp";

export const schema = {
  userid: z.string().describe("The ID of the user to update"),
  email: z.string().optional().describe("New email address"),
  fullname: z.string().optional().describe("New full name"),
  description: z.string().optional().describe("New biography or description"),
  home_page: z.string().optional().describe("New home page URL"),
  location: z.string().optional().describe("New location"),
  roles: z
    .record(z.boolean())
    .optional()
    .describe(
      "Roles to add or remove, as an object mapping role names to booleans (e.g., {Contributor: true, Editor: false})",
    ),
};

export const metadata: ToolMetadata = {
  name: "plone_update_user",
  description:
    "Updates an existing user's properties in Plone. Requires Manager role or the user updating their own account. Roles are specified as an object mapping role names to booleans to add or remove them. Example: plone_update_user({userid: 'jdoe', fullname: 'Jane Doe', roles: {Editor: true, Contributor: false}})",
  annotations: {
    title: "Update Plone User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function ploneUpdateUser(
  args: InferSchema<typeof schema>,
): Promise<{ content: { type: "text"; text: string }[] }> {
  const requestHeaders = headers();
  const sessionId = getSessionId(requestHeaders);
  const service = sessionManager.getSession(sessionId);

  try {
    const client = service.getClient();
    const { userid, ...fields } = args;

    const data: Record<string, unknown> = {};

    if (fields.email !== undefined) data.email = fields.email;
    if (fields.fullname !== undefined) data.fullname = fields.fullname;
    if (fields.description !== undefined) data.description = fields.description;
    if (fields.home_page !== undefined) data.home_page = fields.home_page;
    if (fields.location !== undefined) data.location = fields.location;
    if (fields.roles !== undefined) data.roles = fields.roles;

    if (Object.keys(data).length === 0) {
      throw new Error("No changes specified for update");
    }

    await client.patch(`/@users/${userid}`, data);

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully updated user: ${userid}`,
        },
      ],
    };
  } catch (error) {
    throw wrapError("UpdateUser", error);
  }
}

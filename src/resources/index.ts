import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ploneContentResource } from "./(plone)/content.js";
import { ploneSiteResource } from "./(plone)/site.js";
import { ploneTypesResource } from "./(plone)/types.js";

/**
 * Registers all resources with the provided McpServer instance.
 */
export function registerResources(server: McpServer) {
  // Register template resources
  server.registerResource(
    ploneContentResource.config.name,
    ploneContentResource.config.uriTemplate,
    {
      description: ploneContentResource.config.description,
      mimeType: ploneContentResource.config.mimeType,
    },
    ploneContentResource.handler
  );

  // Register static resources
  server.registerResource(
    ploneSiteResource.config.name,
    ploneSiteResource.config.uri,
    {
      description: ploneSiteResource.config.description,
      mimeType: ploneSiteResource.config.mimeType,
    },
    ploneSiteResource.handler
  );

  server.registerResource(
    ploneTypesResource.config.name,
    ploneTypesResource.config.uri,
    {
      description: ploneTypesResource.config.description,
      mimeType: ploneTypesResource.config.mimeType,
    },
    ploneTypesResource.handler
  );
}

#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises"; // Use fs/promises
import * as path from "path"; // Use path for joining
import { randomUUID } from "crypto"; // For generating UUIDs

// Define the expected structure of the mind map JSON
// This interface includes properties from ALL possible node types defined in the spec.
// The 'type' field determines which properties are relevant for a specific entity.
interface MindMapEntity {
  uuid: string;
  type: string; // e.g., "core:text_node", "core:image_node"
  location: [number, number];
  details?: string; // Optional base property

  // TextNode specific (optional at base level)
  text?: string; // Also used by Section, UrlNode (as title sometimes), Edge (as label)
  size?: [number, number]; // Also used by Section, ImageNode, UrlNode, PortalNode
  color?: [number, number, number, number]; // Also used by Section, UrlNode, PortalNode, PenStroke, Edges
  sizeAdjust?: "auto" | "manual"; // TextNode specific

  // Section specific
  children?: string[];
  isHidden?: boolean;
  isCollapsed?: boolean;

  // ImageNode specific
  path?: string; // File path for the image
  scale?: number;

  // UrlNode specific
  url?: string;
  title?: string; // Also used by PortalNode

  // PortalNode specific
  portalFilePath?: string;
  targetLocation?: [number, number];
  cameraScale?: number;

  // PenStroke specific
  content?: string; // Pen stroke data

  // ConnectPoint has no extra properties beyond Entity base
}

interface MindMapAssociation {
  source: string;
  target: string;
  uuid: string;
  type: string;
  text?: string;
  color?: [number, number, number, number];
}

interface MindMapData {
  version: number;
  entities: MindMapEntity[];
  associations: MindMapAssociation[];
  tags: any[]; // Assuming tags can be anything for now
}

/**
 * Helper function to resolve relative path to absolute path based on the server's CWD.
 * Assumes the server's CWD is the project workspace root (d:/ssh/learn/project-graph).
 */
function resolvePath(relativePath: string): string {
  // Prevent path traversal attacks
  const safeRelativePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  // Use process.cwd() as the base directory
  return path.join(process.cwd(), safeRelativePath);
}

/**
 * Create an MCP server with capabilities for tools.
 */
const server = new Server(
  {
    // Rename server to reflect its new purpose
    name: "project-graph-json-editor",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

/**
 * Handler that lists available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "pg_read_mindmap_json",
        description: "Reads the content of a Project Graph JSON file as a string. Useful for viewing the raw data.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to the mind map JSON file (e.g., 'docs-pg/ProjectGraph项目架构.json')",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "pg_add_mindmap_node_json",
        description: "Adds a new node (Text, Image, Section, etc.) to a Project Graph JSON file.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to the mind map JSON file.",
            },
            type: {
              type: "string",
              description: "The type of node to create (e.g., 'core:text_node', 'core:image_node').",
              enum: [
                // List known types from spec
                "core:text_node",
                "core:section",
                "core:connect_point",
                "core:image_node",
                "core:url_node",
                "core:portal_node",
                "core:pen_stroke",
              ],
            },
            location: {
              // Keep location optional, default [0,0]
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
              description: "Optional location [x, y] (default: [0, 0]).",
            },
            details: { type: "string", description: "Optional details/notes for the node." },
            // --- Type-specific properties (all optional in schema, validated/defaulted in handler) ---
            text: { type: "string", description: "Text content (for TextNode, Section)." },
            size: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
              description:
                "Size [width, height] (for TextNode, Section, ImageNode, UrlNode, PortalNode). Default varies by type.",
            },
            color: {
              type: "array",
              items: { type: "number" },
              minItems: 4,
              maxItems: 4,
              description:
                "Color [r, g, b, a] (for TextNode, Section, UrlNode, PortalNode, PenStroke). Default varies by type.",
            },
            sizeAdjust: {
              enum: ["auto", "manual"],
              description: "Size adjustment mode (for TextNode, default: 'auto').",
            },
            children: {
              type: "array",
              items: { type: "string" },
              description: "Child node UUIDs (for Section, default: []).",
            }, // Fixed key, added comma
            isHidden: { type: "boolean", description: "Is the section hidden? (for Section, default: false)." }, // Fixed key, added comma
            isCollapsed: { type: "boolean", description: "Is the section collapsed? (for Section, default: false)." }, // Fixed key, added comma
            imagePath: { type: "string", description: "Path to the image file (required for ImageNode)." }, // Fixed key, added comma
            scale: { type: "number", description: "Image scale factor (for ImageNode, default: 1)." }, // Fixed key, added comma
            url: { type: "string", description: "URL for the link (required for UrlNode)." }, // Fixed key, added comma
            title: { type: "string", description: "Display title (for UrlNode, PortalNode)." }, // Fixed key, added comma
            portalFilePath: {
              type: "string",
              description: "Path to the target mind map file (required for PortalNode).",
            }, // Fixed key, added comma
            targetLocation: {
              type: "array",
              items: { type: "number" },
              minItems: 2,
              maxItems: 2,
              description: "Target location in the portal file (for PortalNode, default: [0, 0]).",
            }, // Added comma
            cameraScale: {
              type: "number",
              description: "Target camera scale in the portal file (for PortalNode, default: 1).",
            }, // Fixed key, added comma
            content: { type: "string", description: "Pen stroke data (required for PenStroke)." }, // Fixed key, no comma needed
            parentNodeUuid: {
              type: "string",
              description: "Optional UUID of the parent node (e.g., a Section) to add this node to.",
            }, // Added parentNodeUuid
          },
          required: ["path", "type"], // Only path and type are strictly required by the schema itself
        },
      },
      {
        name: "pg_edit_mindmap_node_json",
        description: "Edits properties of an existing node in a Project Graph JSON file, identified by its UUID.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to the mind map JSON file.",
            },
            uuid: {
              type: "string",
              description: "The UUID of the node to edit.",
            },
            updates: {
              type: "object",
              description:
                'An object containing the properties to update (e.g., {"text": "new text", "location": [10, 20]}). Only provided properties will be updated.',
              properties: {
                // Define possible updatable properties - make them optional here
                // Existing editable properties
                text: { type: "string" },
                location: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                size: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                details: { type: "string" },
                color: { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4 },
                // New editable properties from spec
                sizeAdjust: { enum: ["auto", "manual"] }, // Added comma
                children: { type: "array", items: { type: "string" } }, // Added comma
                isHidden: { type: "boolean" }, // Added comma
                isCollapsed: { type: "boolean" }, // Added comma
                path: { type: "string" }, // ImageNode path, Added comma
                scale: { type: "number" }, // Added comma
                url: { type: "string" }, // UrlNode url, Added comma
                title: { type: "string" }, // UrlNode, PortalNode title, Fixed quotes, Added comma
                portalFilePath: { type: "string" }, // PortalNode path, Fixed quotes, Added comma
                targetLocation: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }, // Fixed quotes, Added comma
                cameraScale: { type: "number" }, // Fixed key quote, Added comma
                content: { type: "string" }, // PenStroke content, Fixed key quote, Added comma based on ESLint suggestion
              },
              additionalProperties: false, // Disallow properties not explicitly listed
            },
          },
          required: ["path", "uuid", "updates"],
        },
      },
    ],
  };
});

/**
 * Handler for tool calls.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments;

  if (typeof args?.path !== "string") {
    throw new McpError(ErrorCode.InvalidParams, "'path' argument is required and must be a string.");
  }
  const filePath = resolvePath(args.path);

  try {
    // --- pg_read_mindmap_json ---
    if (toolName === "pg_read_mindmap_json") {
      const fileContent = await fs.readFile(filePath, "utf-8");
      // Optional: Validate JSON structure before returning
      // const mindMapData: MindMapData = JSON.parse(fileContent);
      return {
        content: [
          {
            type: "text", // Return as text
            text: fileContent, // Return the raw file content as a string
          },
        ],
      };
    }
    // --- pg_add_mindmap_node_json ---
    else if (toolName === "pg_add_mindmap_node_json") {
      // Validate required 'type' argument
      if (typeof args?.type !== "string") {
        throw new McpError(ErrorCode.InvalidParams, "'type' argument is required and must be a string.");
      }
      const nodeType = args.type;

      // Read existing data
      const fileContent = await fs.readFile(filePath, "utf-8");
      const mindMapData: MindMapData = JSON.parse(fileContent);

      // Generate UUID and base structure
      const newNodeUUID = randomUUID();
      const newNode: Partial<MindMapEntity> = {
        // Use Partial initially
        uuid: newNodeUUID,
        type: nodeType,
        location:
          Array.isArray(args.location) && args.location.length === 2 ? (args.location as [number, number]) : [0, 0],
        details: typeof args.details === "string" ? args.details : "", // Default empty string
      };

      // --- Apply type-specific properties and defaults ---
      switch (nodeType) {
        case "core:text_node":
          if (typeof args.text !== "string")
            throw new McpError(ErrorCode.InvalidParams, "'text' is required for core:text_node.");
          newNode.text = args.text;
          newNode.size =
            Array.isArray(args.size) && args.size.length === 2 ? (args.size as [number, number]) : [150, 76]; // Default size for text
          newNode.color =
            Array.isArray(args.color) && args.color.length === 4
              ? (args.color as [number, number, number, number])
              : [0, 0, 0, 255]; // Default black opaque
          newNode.sizeAdjust = args.sizeAdjust === "manual" ? "manual" : "auto"; // Default auto
          break;
        case "core:section":
          newNode.text = typeof args.text === "string" ? args.text : "Section"; // Default title
          newNode.size =
            Array.isArray(args.size) && args.size.length === 2 ? (args.size as [number, number]) : [300, 200]; // Default size for section
          newNode.color =
            Array.isArray(args.color) && args.color.length === 4
              ? (args.color as [number, number, number, number])
              : [200, 200, 200, 128]; // Default gray semi-transparent
          newNode.children = Array.isArray(args.children) ? args.children : [];
          newNode.isHidden = typeof args.isHidden === "boolean" ? args.isHidden : false;
          newNode.isCollapsed = typeof args.isCollapsed === "boolean" ? args.isCollapsed : false;
          break;
        case "core:connect_point":
          // No specific properties beyond base Entity
          break;
        case "core:image_node":
          if (typeof args.imagePath !== "string")
            throw new McpError(ErrorCode.InvalidParams, "'imagePath' is required for core:image_node.");
          newNode.path = args.imagePath; // Assign to 'path' property internally
          newNode.size =
            Array.isArray(args.size) && args.size.length === 2 ? (args.size as [number, number]) : [100, 100]; // Default size for image
          newNode.scale = typeof args.scale === "number" ? args.scale : 1;
          break;
        case "core:url_node":
          if (typeof args.url !== "string")
            throw new McpError(ErrorCode.InvalidParams, "'url' is required for core:url_node.");
          newNode.url = args.url;
          newNode.title = typeof args.title === "string" ? args.title : args.url; // Default title to URL
          newNode.size =
            Array.isArray(args.size) && args.size.length === 2 ? (args.size as [number, number]) : [150, 50]; // Default size for URL
          newNode.color =
            Array.isArray(args.color) && args.color.length === 4
              ? (args.color as [number, number, number, number])
              : [100, 150, 255, 255]; // Default blue opaque
          break;
        case "core:portal_node":
          if (typeof args.portalFilePath !== "string")
            throw new McpError(ErrorCode.InvalidParams, "'portalFilePath' is required for core:portal_node.");
          newNode.portalFilePath = args.portalFilePath;
          newNode.title = typeof args.title === "string" ? args.title : args.portalFilePath; // Default title to path
          newNode.size =
            Array.isArray(args.size) && args.size.length === 2 ? (args.size as [number, number]) : [150, 50]; // Default size for portal
          newNode.color =
            Array.isArray(args.color) && args.color.length === 4
              ? (args.color as [number, number, number, number])
              : [150, 100, 255, 255]; // Default purple opaque
          newNode.targetLocation =
            Array.isArray(args.targetLocation) && args.targetLocation.length === 2
              ? (args.targetLocation as [number, number])
              : [0, 0];
          newNode.cameraScale = typeof args.cameraScale === "number" ? args.cameraScale : 1;
          break;
        case "core:pen_stroke":
          if (typeof args.content !== "string")
            throw new McpError(ErrorCode.InvalidParams, "'content' is required for core:pen_stroke.");
          newNode.content = args.content;
          newNode.color =
            Array.isArray(args.color) && args.color.length === 4
              ? (args.color as [number, number, number, number])
              : [0, 0, 0, 255]; // Default black opaque
          // Size/Location might be less relevant or calculated differently for strokes
          break;
        default:
          throw new McpError(ErrorCode.InvalidParams, `Unsupported node type: ${nodeType}`);
      }

      // Add the fully constructed node
      mindMapData.entities.push(newNode as MindMapEntity); // Cast to full type

      // --- Handle parent node association if parentNodeUuid is provided ---
      if (typeof args.parentNodeUuid === "string" && args.parentNodeUuid) {
        const parentNode = mindMapData.entities.find((entity) => entity.uuid === args.parentNodeUuid);

        if (!parentNode) {
          // If parent node not found, still add the new node but report a warning/error
          console.warn(`Parent node with UUID '${args.parentNodeUuid}' not found.`);
          // Optionally throw an error instead:
          // throw new McpError(ErrorCode.InvalidParams, `Parent node with UUID '${args.parentNodeUuid}' not found.`);
        } else if (parentNode.type !== "core:section") {
          // If parent node is not a section, still add the new node but report a warning/error
          console.warn(`Parent node with UUID '${args.parentNodeUuid}' is not a Section type. Cannot add child.`);
          // Optionally throw an error instead:
          // throw new McpError(ErrorCode.InvalidParams, `Parent node with UUID '${args.parentNodeUuid}' is not a Section type.`);
        } else {
          // Add the new node's UUID to the parent's children array
          if (!parentNode.children) {
            parentNode.children = [];
          }
          parentNode.children.push(newNodeUUID);
        }
      }
      // --- End parent node handling ---

      // Write back to the file
      await fs.writeFile(filePath, JSON.stringify(mindMapData, null, 2)); // Pretty print JSON

      return {
        content: [
          {
            type: "text",
            text: `Successfully added node with UUID: ${newNodeUUID} to ${args.path}`,
          },
        ],
      };
    }
    // --- pg_edit_mindmap_node_json ---
    else if (toolName === "pg_edit_mindmap_node_json") {
      if (typeof args?.uuid !== "string") {
        throw new McpError(ErrorCode.InvalidParams, "'uuid' argument is required for editing a node.");
      }
      if (typeof args?.updates !== "object" || args.updates === null) {
        throw new McpError(ErrorCode.InvalidParams, "'updates' argument must be a non-null object.");
      }
      if (Object.keys(args.updates).length === 0) {
        throw new McpError(ErrorCode.InvalidParams, "'updates' object cannot be empty.");
      }

      const fileContent = await fs.readFile(filePath, "utf-8");
      const mindMapData: MindMapData = JSON.parse(fileContent);

      const nodeIndex = mindMapData.entities.findIndex((entity) => entity.uuid === args.uuid);

      if (nodeIndex === -1) {
        throw new McpError(ErrorCode.InvalidRequest, `Node with UUID '${args.uuid}' not found in ${args.path}.`);
      }

      // Apply updates
      const nodeToUpdate = mindMapData.entities[nodeIndex];
      let updated = false;
      for (const key in args.updates) {
        if (Object.prototype.hasOwnProperty.call(args.updates, key)) {
          // Basic check if the key exists on the node type (can be improved with stricter type checking)
          if (key in nodeToUpdate) {
            // @ts-expect-error - Allow dynamic assignment after check
            nodeToUpdate[key] = args.updates[key];
            updated = true;
          } else {
            console.warn(`Property '${key}' does not exist on MindMapEntity and was ignored.`);
          }
        }
      }

      if (!updated) {
        return {
          content: [{ type: "text", text: `No valid properties provided to update for node UUID: ${args.uuid}` }],
        };
      }

      // Write back to the file
      await fs.writeFile(filePath, JSON.stringify(mindMapData, null, 2)); // Pretty print JSON

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated node with UUID: ${args.uuid} in ${args.path}`,
          },
        ],
      };
    }
    // --- Unknown tool ---
    else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }
  } catch (error: any) {
    // Handle file system errors (e.g., file not found) and JSON parsing errors
    if (error.code === "ENOENT") {
      throw new McpError(ErrorCode.InvalidRequest, `File not found at path: ${args.path} (resolved to ${filePath})`); // Use InvalidRequest
    } else if (error instanceof SyntaxError) {
      throw new McpError(ErrorCode.ParseError, `Invalid JSON format in file: ${args.path}`); // Use ParseError
    }
    // Rethrow other errors
    throw new McpError(ErrorCode.InternalError, `Error processing tool ${toolName}: ${error.message}`);
  }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Project Graph JSON Editor MCP server running on stdio"); // Updated server name in log
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

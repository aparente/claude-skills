#!/usr/bin/env node
/**
 * MCP server for Resident Advisor (ra.co).
 *
 * Transports:
 *  - stdio (default): for local MCP clients (Claude Code, Claude Desktop,
 *    OpenAI Agents SDK MCPServerStdio).
 *  - streamable HTTP (--http or TRANSPORT=http): stateless JSON endpoint at
 *    POST /mcp, for remote clients (ChatGPT connectors, OpenAI Responses API
 *    remote MCP tool, Agents SDK MCPServerStreamableHttp).
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { buildServer } from "./server.js";

async function runStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("resident-advisor-mcp-server running on stdio");
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
  );
}

async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Stateless mode: a fresh server + transport per request, so concurrent
  // requests never share protocol state or request IDs.
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  const body = await readBody(req);
  await transport.handleRequest(req, res, body);
}

async function runHttp(): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);

  const httpServer = createServer((req, res) => {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (req.url !== "/mcp" && req.url !== "/mcp/") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found. MCP endpoint is POST /mcp" }));
      return;
    }
    if (req.method !== "POST") {
      // Stateless server: no SSE stream to resume, no session to delete.
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed. Use POST." },
          id: null,
        }),
      );
      return;
    }

    handleMcpRequest(req, res).catch((error) => {
      console.error("Request handling error:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          }),
        );
      }
    });
  });

  httpServer.listen(port, () => {
    console.error(
      `resident-advisor-mcp-server listening on http://localhost:${port}/mcp`,
    );
  });
}

const useHttp =
  process.argv.includes("--http") || process.env.TRANSPORT === "http";

(useHttp ? runHttp() : runStdio()).catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});

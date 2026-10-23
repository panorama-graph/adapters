#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { parseArgs } from "node:util";
import { PanoramaGraphClient } from "@panorama-graph/sdk";
import { createReceiver } from "./receiver";

const USAGE = `graph-receiver — recebe os artefatos de arquitetura de um build e publica no panorama-graph-api

Uso: graph-receiver [opções]

  --api <url>          URL do panorama-graph-api (ou GRAPH_API_URL)
  --port <n>           porta (ou RECEIVER_PORT; padrão 3210)
  --max-body-mb <n>    tamanho máximo de um pacote (ou RECEIVER_MAX_BODY_MB; padrão 32)

Rotas: POST /v1/builds (o pacote, no formato panorama-graph-build/1) e GET /health.`;

const { values } = parseArgs({
  options: {
    api: { type: "string" },
    port: { type: "string" },
    "max-body-mb": { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const api = values.api ?? process.env.GRAPH_API_URL;
if (!api) {
  console.error("Informe --api ou GRAPH_API_URL.");
  process.exit(1);
}
const port = Number(values.port ?? process.env.RECEIVER_PORT ?? 3210);
const maxBodyMb = Number(values["max-body-mb"] ?? process.env.RECEIVER_MAX_BODY_MB ?? 32);

const handler = createReceiver({
  client: new PanoramaGraphClient({ baseUrl: api }),
  log: (line) => console.log(`${new Date().toISOString()} ${line}`),
});
const maxBody = maxBodyMb * 1024 * 1024;

/** Lê o pedido do Node como `Request`, ou null se o corpo passar de `maxBody`. */
async function toRequest(req: IncomingMessage): Promise<Request | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > maxBody) return null;
    chunks.push(chunk);
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(name, v);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(`http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });
}

async function serve(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (Number(req.headers["content-length"] ?? 0) > maxBody) {
    res.writeHead(413, { connection: "close" }).end();
    req.destroy();
    return;
  }
  const request = await toRequest(req);
  if (!request) {
    res.writeHead(413, { connection: "close" }).end();
    req.destroy();
    return;
  }
  const response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

const server = createServer((req, res) => {
  serve(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});
server.listen(port, () => {
  console.log(`graph-receiver em http://localhost:${(server.address() as AddressInfo).port}, publicando em ${api}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close();
    process.exit(0);
  });
}

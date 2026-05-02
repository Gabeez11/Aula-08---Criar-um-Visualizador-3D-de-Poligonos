import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT ?? 5173);

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mtl", "text/plain; charset=utf-8"],
  [".obj", "text/plain; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  try {
    const requestedUrl = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const requestedPath = decodeURIComponent(requestedUrl.pathname);
    const safePath = requestedPath === "/" ? "/index.html" : requestedPath;
    const filePath = path.resolve(rootDirectory, `.${safePath}`);

    if (!filePath.startsWith(rootDirectory)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const fileStats = await stat(filePath);
    const finalPath = fileStats.isDirectory()
      ? path.join(filePath, "index.html")
      : filePath;
    const content = await readFile(finalPath);
    const extension = path.extname(finalPath);

    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extension) ?? "application/octet-stream",
    });
    response.end(content);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Servidor local em http://localhost:${port}`);
});

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL is required");
    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Target responded with ${response.status}`);
      }
      const data = await response.text();
      res.send(data);
    } catch (error: any) {
      console.error("Proxy error (GET):", error);
      res.status(500).send("Proxy error: " + error.message);
    }
  });

  app.post("/api/proxy", express.text({ type: '*/*' }), async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL is required");
    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        body: req.body,
        headers: { "Content-Type": "text/plain;charset=utf-8" }
      });
      const data = await response.text();
      res.send(data);
    } catch (error: any) {
      console.error("Proxy error (POST):", error);
      res.status(500).send("Proxy error: " + error.message);
    }
  });

  // Vite middleware for development
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: false
    },
    appType: "spa",
  });
  
  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

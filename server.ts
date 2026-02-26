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
  app.use(express.text({ type: '*/*', limit: '10mb' }));
  app.use(express.json({ limit: '10mb' }));

  app.all("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }

    if (!targetUrl) {
      return res.status(400).send("URL is required");
    }

    try {
      const method = req.method;
      const contentType = req.headers["content-type"] || "text/plain;charset=utf-8";
      
      const fetchOptions: any = {
        method: method,
        headers: {
          "Content-Type": contentType,
        },
        redirect: 'follow'
      };

      if (method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const responseData = await response.text();
      
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(response.status).send(responseData);
    } catch (error: any) {
      console.error("Proxy error:", error);
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

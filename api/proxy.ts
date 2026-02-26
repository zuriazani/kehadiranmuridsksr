import express from "express";

const app = express();

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

export default app;

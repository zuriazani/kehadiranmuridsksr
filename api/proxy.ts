import express from "express";

const app = express();

// Middleware to parse text body (Google Script expects text/plain or JSON as string)
app.use(express.text({ type: '*/*', limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

app.all("*", async (req, res) => {
  const targetUrl = req.query.url as string;
  
  // Handle CORS preflight
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
    console.log(`Proxying ${req.method} to: ${targetUrl}`);
    
    const method = req.method;
    const contentType = req.headers["content-type"] || "text/plain;charset=utf-8";
    
    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        "Content-Type": contentType,
      },
      redirect: 'follow' // Crucial for Google Apps Script redirects
    };

    if (method !== 'GET' && method !== 'HEAD') {
      // Ensure body is a string
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      console.log(`Sending body (length: ${fetchOptions.body.length})`);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseData = await response.text();
    
    console.log(`Target responded with status: ${response.status}`);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(responseData);
  } catch (error: any) {
    console.error("Proxy error details:", error);
    res.status(500).send("Proxy error: " + error.message);
  }
});

export default app;

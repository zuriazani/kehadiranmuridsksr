
export default async function handler(req: any, res: any) {
  const targetUrl = req.query.url as string;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
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
      // Vercel handles body parsing. If it's already an object, stringify it.
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseData = await response.text();
    
    res.status(response.status).send(responseData);
  } catch (error: any) {
    console.error("Proxy error:", error);
    res.status(500).send("Proxy error: " + error.message);
  }
}

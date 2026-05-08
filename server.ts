import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  console.log(`[Server] Running in ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
  
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Wrindha OS Backend matches your energy!",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      supabaseEnabled: !!process.env.VITE_SUPABASE_URL,
      version: "1.0.0"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Wrindha OS running at http://localhost:${PORT}`);
  });
}

startServer();

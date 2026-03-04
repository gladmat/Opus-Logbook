import express from "express";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env";
import { registerRoutes } from "./routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    const allowedOrigins = new Set<string>();
    allowedOrigins.add("https://logbook-api.drgladysz.com");
    allowedOrigins.add("https://drgladysz.com");
    if (env.RAILWAY_PUBLIC_DOMAIN) {
      allowedOrigins.add(`https://${env.RAILWAY_PUBLIC_DOMAIN}`);
    }

    const origin = req.header("origin");
    const isDev = env.NODE_ENV !== "production";
    const isLocalhost = isDev && (
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:")
    );

    if (origin && (allowedOrigins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parsing with route-specific limits
  app.use("/api/auth", express.json({ limit: "1kb" }), express.urlencoded({ extended: false, limit: "1kb" }));
  app.use("/api", express.json({ limit: "256kb" }), express.urlencoded({ extended: false, limit: "256kb" }));
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false, limit: "256kb" }));

  // Error handler (attached after routes in setupApp)
  const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as { status?: number; statusCode?: number; message?: string };
    const status = error.status || error.statusCode || 500;
    const message = status < 500 ? (error.message || "Request error") : "Internal Server Error";
    if (status >= 500) {
      console.error("Server error:", err);
    }
    res.status(status).json({ message });
  };

  return { app, errorHandler };
}

/**
 * Sets up the full app with routes. Returns the Express app for testing.
 */
export async function setupApp() {
  const { app, errorHandler } = createApp();
  await registerRoutes(app);
  app.use(errorHandler);
  return app;
}

import express from "express";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const allowedOrigins = new Set<string>();

    // Production domains
    allowedOrigins.add("https://logbook-api.drgladysz.com");
    allowedOrigins.add("https://drgladysz.com");

    // Railway auto-generated domain
    if (env.RAILWAY_PUBLIC_DOMAIN) {
      allowedOrigins.add(`https://${env.RAILWAY_PUBLIC_DOMAIN}`);
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo dev client (any port) — development only
    const isDev = env.NODE_ENV !== "production";
    const isLocalhost =
      isDev &&
      (origin?.startsWith("http://localhost:") ||
        origin?.startsWith("http://127.0.0.1:"));

    if (origin && (allowedOrigins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    // Mobile app requests (no origin header) are allowed through — CORS is
    // a browser-only enforcement mechanism, so omitting the header is correct.
    // Do NOT set Access-Control-Allow-Origin: * as it weakens security for
    // any browser-based consumers.

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }

    next();
  });
}

// --- IMPROVEMENT #2: Route-level body size limits ---
// Different route groups get appropriate payload limits instead of a blanket 50MB.
// Auth/profile routes need minimal payloads; only specific endpoints (if any) should allow large bodies.
function setupBodyParsing(app: express.Application) {
  // Strict limit for auth routes (login, signup, password reset) — no reason for large payloads
  const authJsonParser = express.json({ limit: "1kb" });
  const authUrlencodedParser = express.urlencoded({
    extended: false,
    limit: "1kb",
  });

  // Moderate limit for profile/facility/general API routes
  const apiJsonParser = express.json({ limit: "256kb" });
  const apiUrlencodedParser = express.urlencoded({
    extended: false,
    limit: "256kb",
  });

  // Larger limit for seed data and any future bulk import endpoints
  const bulkJsonParser = express.json({
    limit: "5mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  });
  const bulkUrlencodedParser = express.urlencoded({
    extended: false,
    limit: "5mb",
  });

  // Apply route-specific limits (most restrictive first, fallback last)
  app.use("/api/auth", authJsonParser, authUrlencodedParser);
  app.use("/api/profile/picture", bulkJsonParser, bulkUrlencodedParser); // Profile picture uploads use multipart, but needs higher limit
  app.use("/api/seed-snomed-ref", bulkJsonParser, bulkUrlencodedParser);

  // Default API limit for everything else under /api
  app.use("/api", apiJsonParser, apiUrlencodedParser);

  // Fallback for non-API routes (landing page, Expo manifest, etc.)
  app.use(
    express.json({
      limit: "256kb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "256kb" }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;

    res.on("finish", () => {
      if (!reqPath.startsWith("/api")) return;

      const duration = Date.now() - start;
      // Only log method, path, status, and duration - never log response bodies (PHI risk)
      log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
    return;
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function serveLegalPage(templateName: string, res: Response) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    templateName,
  );

  if (!fs.existsSync(templatePath)) {
    res.status(404).send("Page not found");
    return;
  }

  const html = fs.readFileSync(templatePath, "utf-8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.get("/privacy", (_req: Request, res: Response) => {
    serveLegalPage("privacy-policy.html", res);
  });

  app.get("/terms", (_req: Request, res: Response) => {
    serveLegalPage("terms-of-service.html", res);
  });

  app.get("/licenses", (_req: Request, res: Response) => {
    serveLegalPage("open-source-licenses.html", res);
  });

  app.get("/reset-password", (_req: Request, res: Response) => {
    serveLegalPage("reset-password.html", res);
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupSecurityHeaders(app: express.Application) {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0"); // Disabled in favour of CSP; legacy header can cause issues
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    );
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;

    // Only expose error messages for client errors (4xx), never for server errors (5xx)
    const message =
      status < 500 ? error.message || "Request error" : "Internal Server Error";

    if (status >= 500) {
      console.error("Server error:", err);
    }

    res.status(status).json({ message });
  });
}

(async () => {
  setupSecurityHeaders(app);
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  server.listen(env.PORT, "0.0.0.0", () => {
    log(`express server serving on port ${env.PORT}`);
  });
})();

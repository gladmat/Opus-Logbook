import express from "express";
import type { Request, Response, NextFunction } from "express";
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
    const origins = new Set<string>();

    // Production domains
    origins.add("https://logbook-api.drgladysz.com");
    origins.add("https://drgladysz.com");

    // Railway auto-generated domain
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      origins.add(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo dev client (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    // Allow Expo Go dev client requests (no origin header, or exp:// scheme)
    const isExpoClient = !origin || origin?.startsWith("exp://");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    } else if (isExpoClient) {
      // Mobile app requests typically have no origin — allow all methods
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
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
  const authUrlencodedParser = express.urlencoded({ extended: false, limit: "1kb" });

  // Moderate limit for profile/facility/general API routes
  const apiJsonParser = express.json({ limit: "256kb" });
  const apiUrlencodedParser = express.urlencoded({ extended: false, limit: "256kb" });

  // Larger limit for seed data and any future bulk import endpoints
  const bulkJsonParser = express.json({
    limit: "5mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  });
  const bulkUrlencodedParser = express.urlencoded({ extended: false, limit: "5mb" });

  // Apply route-specific limits (most restrictive first, fallback last)
  app.use("/api/auth", authJsonParser, authUrlencodedParser);
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
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
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
    return res.status(404).send("Page not found");
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

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupSecurityHeaders(app: express.Application) {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
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
    const message = status < 500
      ? (error.message || "Request error")
      : "Internal Server Error";

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

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`express server serving on port ${port}`);
  });
})();

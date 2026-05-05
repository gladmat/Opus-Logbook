import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import { env } from "./env";
import { registerRoutes, authenticateToken } from "./routes";
import { Sentry } from "./sentry";

const log = console.log;

export interface SetupAppOptions {
  serveFrontend?: boolean;
}

function setupCors(app: Express) {
  app.use((req, res, next) => {
    const allowedOrigins = new Set<string>();
    allowedOrigins.add("https://logbook-api.drgladysz.com");
    allowedOrigins.add("https://drgladysz.com");
    if (env.RAILWAY_PUBLIC_DOMAIN) {
      allowedOrigins.add(`https://${env.RAILWAY_PUBLIC_DOMAIN}`);
    }

    const origin = req.header("origin");
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

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }

    next();
  });
}

function setupBodyParsing(app: Express) {
  const authJsonParser = express.json({ limit: "1kb" });
  const authUrlencodedParser = express.urlencoded({
    extended: false,
    limit: "1kb",
  });

  const apiJsonParser = express.json({ limit: "256kb" });
  const apiUrlencodedParser = express.urlencoded({
    extended: false,
    limit: "256kb",
  });

  const bulkJsonParser = express.json({ limit: "5mb" });
  const bulkUrlencodedParser = express.urlencoded({
    extended: false,
    limit: "5mb",
  });

  app.use("/api/auth", authJsonParser, authUrlencodedParser);
  app.use("/api/profile/picture", bulkJsonParser, bulkUrlencodedParser);
  app.use("/api/seed-snomed-ref", bulkJsonParser, bulkUrlencodedParser);
  app.use("/api", apiJsonParser, apiUrlencodedParser);
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false, limit: "256kb" }));
}

function setupRequestLogging(app: Express) {
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;

    res.on("finish", () => {
      if (!reqPath.startsWith("/api")) return;

      const duration = Date.now() - start;
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

function getLanIp(): string | null {
  const interfaces = os.networkInterfaces();

  for (const network of Object.values(interfaces)) {
    for (const address of network || []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

function getPreviewHostname(host: string | undefined): string {
  if (!host) {
    return getLanIp() || "127.0.0.1";
  }

  try {
    const parsed = new URL(`http://${host}`);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    ) {
      return getLanIp() || parsed.hostname;
    }

    return parsed.hostname;
  } catch {
    return host.replace(/:\d+$/, "");
  }
}

function getExpoDeepLink({
  protocol,
  host,
}: {
  protocol: string;
  host: string | undefined;
}): string {
  if (env.NODE_ENV === "development") {
    const previewHostname = getPreviewHostname(host);
    const expoPort = Number(process.env.DEV_EXPO_PORT || 8083);
    return `exp://${previewHostname}:${expoPort}`;
  }

  const scheme = protocol === "https" ? "exps" : "exp";
  return `${scheme}://${host}`;
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
  const expoDeepLink = getExpoDeepLink({ protocol, host });

  log(`baseUrl`, baseUrl);
  log(`expoDeepLink`, expoDeepLink);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPO_DEEP_LINK_PLACEHOLDER/g, expoDeepLink)
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

function configureExpoAndLanding(app: Express) {
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

  // Avatars are personal data (surgeon headshots) — require a valid JWT on
  // every GET. Prior version served `/uploads/avatars/*` publicly; even
  // with random filenames, any leaked URL (screenshot, log, mis-sent
  // support email) becomes a permanent public handle. The upload path
  // (`POST /api/profile/picture`) already runs under `authenticateToken`,
  // so this gate only changes the retrieval side. `authenticateToken` is
  // async and the signature doesn't match Express's synchronous middleware
  // callback, so we wrap it in an adapter.
  app.use(
    "/uploads",
    (req: Request, res: Response, next: NextFunction) => {
      void authenticateToken(req, res, next);
    },
    express.static(path.resolve(process.cwd(), "uploads")),
  );
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupSecurityHeaders(app: Express) {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    );
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });
}

function setupErrorHandler(app: Express) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };
    const status = error.status || error.statusCode || 500;
    const message =
      status < 500 ? error.message || "Request error" : "Internal Server Error";
    if (status >= 500) {
      console.error("Server error:", err);
    }
    res.status(status).json({ message });
  });
}

export async function setupApp(
  options: SetupAppOptions = {},
): Promise<Express> {
  const app = express();
  app.set("trust proxy", 1);
  setupSecurityHeaders(app);
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  if (options.serveFrontend) {
    configureExpoAndLanding(app);
  }
  await registerRoutes(app);
  // Sentry's Express error handler must run BEFORE our final
  // setupErrorHandler so it can capture exceptions before they're
  // converted into the generic JSON response. When SENTRY_DSN is unset,
  // this is a passthrough.
  Sentry.setupExpressErrorHandler(app);
  setupErrorHandler(app);
  return app;
}

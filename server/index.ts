// IMPORTANT: Sentry must initialize before `node:http` is imported anywhere
// else so v10 httpIntegration can wrap incoming requests. Keep this as the
// first import.
import "./sentry";
import { createServer } from "node:http";
import { setupApp } from "./app";
import { env } from "./env";

(async () => {
  const app = await setupApp({ serveFrontend: true });
  const server = createServer(app);

  server.listen(env.PORT, "0.0.0.0", () => {
    console.log(`express server serving on port ${env.PORT}`);
  });
})();

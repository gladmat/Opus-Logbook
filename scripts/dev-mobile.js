const http = require("http");
const os = require("os");
const { spawn } = require("child_process");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const apiPort = Number(process.env.DEV_API_PORT || process.env.PORT || 5001);
const expoPort = Number(process.env.DEV_EXPO_PORT || 8083);

function getLanIp() {
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

function checkApiHealth(port) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: "127.0.0.1",
        port,
        path: "/api/health",
        timeout: 1500,
      },
      (response) => {
        resolve(response.statusCode === 200);
      },
    );

    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

function prefixStream(stream, label) {
  if (!stream) {
    return;
  }

  stream.on("data", (chunk) => {
    const text = chunk.toString();
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.trim()) {
        console.log(`[${label}] ${line}`);
      }
    }
  });
}

function spawnCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ["inherit", "pipe", "pipe"],
    ...options,
  });

  prefixStream(child.stdout, options.label || command);
  prefixStream(child.stderr, `${options.label || command}:err`);
  return child;
}

async function main() {
  const lanIp = process.env.DEV_LAN_IP || getLanIp() || "127.0.0.1";
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL || `http://${lanIp}:${apiPort}`;

  console.log(`Using API URL: ${apiUrl}`);
  console.log(`Expo port: ${expoPort}`);

  let serverProcess = null;
  if (await checkApiHealth(apiPort)) {
    console.log(`Reusing existing API server on http://127.0.0.1:${apiPort}`);
  } else {
    console.log("Starting local API server...");
    serverProcess = spawnCommand(
      npmCommand,
      ["run", "server:dev"],
      {
        env: process.env,
        label: "server",
      },
    );
  }

  const expoProcess = spawnCommand(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["expo", "start", "--host", "lan", "--port", String(expoPort), "--clear"],
    {
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: apiUrl,
      },
      label: "expo",
    },
  );

  const cleanup = () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGINT");
    }
    if (!expoProcess.killed) {
      expoProcess.kill("SIGINT");
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  expoProcess.on("exit", (code) => {
    cleanup();
    process.exit(code || 0);
  });

  if (serverProcess) {
    serverProcess.on("exit", (code) => {
      if (code && code !== 0) {
        console.error(`Server exited with code ${code}`);
      }
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

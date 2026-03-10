import type {
  HarnessConfig,
  TestResult,
  AuditReport,
  CategoryBreakdown,
} from "./types";
import { generateAllCases, toApiPayload } from "./generators";

// ── Configuration ─────────────────────────────────────────────────────────────

const config: HarnessConfig = {
  baseUrl: process.env.BASE_URL ?? "http://localhost:5001/api",
  email: process.env.TEST_EMAIL ?? "m.gladysz@outlook.com",
  password: process.env.TEST_PASSWORD ?? "testtest",
  batchSize: 10,
  delayMs: 20,
};

const doCleanup = process.argv.includes("--cleanup");

// ── Auth ──────────────────────────────────────────────────────────────────────

async function login(): Promise<string> {
  const res = await fetch(`${config.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: config.email, password: config.password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

// ── Case creation ─────────────────────────────────────────────────────────────

async function createCase(
  token: string,
  payload: ReturnType<typeof toApiPayload>,
  scenarioName: string,
  caseNumber: number,
  category: string,
): Promise<TestResult> {
  const start = Date.now();
  try {
    const res = await fetch(`${config.baseUrl}/procedures`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const elapsed = Date.now() - start;
    const body = (await res.json()) as Record<string, unknown>;

    if (res.ok) {
      const proc = body.procedure as Record<string, unknown> | undefined;
      const flaps = (body.flaps ?? []) as Array<{
        id: string;
        anastomoses?: Array<{ id: string }>;
      }>;
      return {
        caseNumber,
        category,
        scenarioName,
        status: "PASS",
        httpStatus: res.status,
        procedureId: (proc?.id ?? body.id) as string | undefined,
        flapCount: flaps.length,
        anastomosisCount: flaps.reduce(
          (sum, f) => sum + (f.anastomoses?.length ?? 0),
          0,
        ),
        responseTimeMs: elapsed,
      };
    } else {
      return {
        caseNumber,
        category,
        scenarioName,
        status: "FAIL",
        httpStatus: res.status,
        errorMessage: JSON.stringify(body).slice(0, 500),
        responseTimeMs: elapsed,
      };
    }
  } catch (err: unknown) {
    return {
      caseNumber,
      category,
      scenarioName,
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : String(err),
      responseTimeMs: Date.now() - start,
    };
  }
}

// ── Batch runner ──────────────────────────────────────────────────────────────

async function runBatch(
  token: string,
  payloads: Array<{
    payload: ReturnType<typeof toApiPayload>;
    scenario: string;
    index: number;
    category: string;
  }>,
): Promise<TestResult[]> {
  return Promise.all(
    payloads.map((p) =>
      createCase(token, p.payload, p.scenario, p.index + 1, p.category),
    ),
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Audit report ──────────────────────────────────────────────────────────────

function buildReport(
  results: TestResult[],
  durationSeconds: number,
): AuditReport {
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const errors = results.filter((r) => r.status === "ERROR").length;
  const times = results.map((r) => r.responseTimeMs).sort((a, b) => a - b);
  const meanMs =
    times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const p95Ms = times[Math.floor(times.length * 0.95)] ?? 0;

  // Per-category breakdown
  const categories = [
    ...new Set(results.map((r) => r.category)),
  ].sort();
  const perCategory: CategoryBreakdown[] = categories.map((cat) => {
    const catResults = results.filter((r) => r.category === cat);
    const catPass = catResults.filter((r) => r.status === "PASS").length;
    const catFail = catResults.filter((r) => r.status === "FAIL").length;
    const catErr = catResults.filter((r) => r.status === "ERROR").length;
    const catTimes = catResults.map((r) => r.responseTimeMs);
    return {
      category: cat,
      total: catResults.length,
      pass: catPass,
      fail: catFail,
      error: catErr,
      successRate:
        catResults.length > 0
          ? Math.round((catPass / catResults.length) * 100)
          : 0,
      avgMs:
        catTimes.length > 0
          ? Math.round(catTimes.reduce((a, b) => a + b, 0) / catTimes.length)
          : 0,
    };
  });

  return {
    totalAttempted: results.length,
    passed,
    failed,
    errors,
    successRate:
      results.length > 0
        ? Math.round((passed / results.length) * 1000) / 10
        : 0,
    meanResponseMs: Math.round(meanMs),
    p95ResponseMs: Math.round(p95Ms),
    casesWithFlaps: results.filter((r) => (r.flapCount ?? 0) > 0).length,
    casesWithAnastomoses: results.filter(
      (r) => (r.anastomosisCount ?? 0) > 0,
    ).length,
    perCategory,
    failures: results.filter((r) => r.status !== "PASS"),
    durationSeconds: Math.round(durationSeconds * 10) / 10,
  };
}

function printReport(report: AuditReport): void {
  console.log("\n");
  console.log(
    "╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║                 OPUS 500-CASE TEST RESULTS                 ║",
  );
  console.log(
    "╠══════════════════════════════════════════════════════════════╣",
  );
  console.log(
    `║ Total cases attempted:     ${String(report.totalAttempted).padEnd(32)}║`,
  );
  console.log(
    `║ PASS:                      ${String(report.passed).padEnd(32)}║`,
  );
  console.log(
    `║ FAIL:                      ${String(report.failed).padEnd(32)}║`,
  );
  console.log(
    `║ ERROR:                     ${String(report.errors).padEnd(32)}║`,
  );
  console.log(
    `║ Success rate:              ${String(report.successRate + "%").padEnd(32)}║`,
  );
  console.log(
    `║ Mean response time:        ${String(report.meanResponseMs + " ms").padEnd(32)}║`,
  );
  console.log(
    `║ P95 response time:         ${String(report.p95ResponseMs + " ms").padEnd(32)}║`,
  );
  console.log(
    `║ Cases with flaps:          ${String(report.casesWithFlaps).padEnd(32)}║`,
  );
  console.log(
    `║ Cases with anastomoses:    ${String(report.casesWithAnastomoses).padEnd(32)}║`,
  );
  console.log(
    `║ Duration:                  ${String(report.durationSeconds + "s").padEnd(32)}║`,
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝",
  );

  console.log("\nPer-Category Breakdown:");
  console.log(
    "Category          | Total | Pass | Fail | Error | Success% | Avg ms |",
  );
  console.log(
    "──────────────────┼───────┼──────┼──────┼───────┼──────────┼────────┤",
  );
  for (const c of report.perCategory) {
    console.log(
      `${c.category.padEnd(18)}| ${String(c.total).padStart(5)} | ${String(c.pass).padStart(4)} | ${String(c.fail).padStart(4)} | ${String(c.error).padStart(5)} | ${String(c.successRate + "%").padStart(8)} | ${String(c.avgMs).padStart(6)} |`,
    );
  }

  if (report.failures.length > 0) {
    console.log(`\nFirst ${Math.min(10, report.failures.length)} failures:`);
    for (const f of report.failures.slice(0, 10)) {
      console.log(
        `  [${f.status}] #${f.caseNumber} ${f.category}/${f.scenarioName} — HTTP ${f.httpStatus ?? "N/A"}: ${(f.errorMessage ?? "").slice(0, 200)}`,
      );
    }
    if (report.failures.length > 10) {
      console.log(`  ... and ${report.failures.length - 10} more failures`);
    }
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(token: string): Promise<void> {
  console.log("\nCleaning up test data...");
  let deleted = 0;
  let offset = 0;

  // Paginate through all procedures and delete them
  while (true) {
    const res = await fetch(
      `${config.baseUrl}/procedures?limit=200&offset=${offset}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) break;
    const procedures = (await res.json()) as Array<{ id: string }>;
    if (procedures.length === 0) break;

    for (const p of procedures) {
      await fetch(`${config.baseUrl}/procedures/${p.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      deleted++;
    }

    if (procedures.length < 200) break;
  }

  console.log(`Deleted ${deleted} procedures`);
}

// ── Verification ─────────────────────────────────────────────────────────────

async function verifyIntegrity(token: string, expectedCount: number): Promise<void> {
  console.log("\nRunning data integrity checks...");

  // Count verification — paginate through all
  let total = 0;
  let offset = 0;
  const specialtyCounts: Record<string, number> = {};

  while (true) {
    const res = await fetch(
      `${config.baseUrl}/procedures?limit=200&offset=${offset}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) {
      console.log(`  ✗ Failed to fetch procedures at offset ${offset}`);
      break;
    }
    const procedures = (await res.json()) as Array<{
      id: string;
      specialty: string;
      patientIdentifierHash: string;
      procedureDate: string;
      facility: string;
    }>;
    if (procedures.length === 0) break;

    total += procedures.length;
    for (const p of procedures) {
      specialtyCounts[p.specialty] = (specialtyCounts[p.specialty] ?? 0) + 1;

      // Basic field checks
      if (!p.patientIdentifierHash || !p.procedureDate || !p.facility) {
        console.log(`  ✗ Missing required field on procedure ${p.id}`);
      }
    }
    offset += 200;
    if (procedures.length < 200) break;
  }

  console.log(
    `  ${total >= expectedCount ? "✓" : "✗"} Count: ${total} procedures (expected >= ${expectedCount})`,
  );

  console.log("  Specialty distribution:");
  for (const [spec, count] of Object.entries(specialtyCounts).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${spec}: ${count}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Opus 500-Case Test Harness ===\n");
  console.log(`Target: ${config.baseUrl}`);

  // 1. Authenticate
  console.log("Authenticating...");
  const token = await login();
  console.log("Authenticated ✓\n");

  // 2. Generate
  const definitions = generateAllCases();
  const payloads = definitions.map((def, i) => ({
    payload: toApiPayload(def, i),
    scenario: `${def.caseId}: ${def.scenario}`,
    index: i,
    category: def.specialty,
  }));

  // 3. Post in batches
  const startTime = Date.now();
  const allResults: TestResult[] = [];
  const totalBatches = Math.ceil(payloads.length / config.batchSize);

  for (let i = 0; i < payloads.length; i += config.batchSize) {
    const batch = payloads.slice(i, i + config.batchSize);
    const batchNum = Math.floor(i / config.batchSize) + 1;
    const results = await runBatch(token, batch);
    allResults.push(...results);

    const batchPass = results.filter((r) => r.status === "PASS").length;
    process.stdout.write(
      `\r  Batch ${batchNum}/${totalBatches} — ${allResults.length}/${payloads.length} (${batchPass}/${results.length} pass)`,
    );

    if (i + config.batchSize < payloads.length) {
      await delay(config.delayMs);
    }
  }
  console.log(""); // newline after progress

  const durationSeconds = (Date.now() - startTime) / 1000;

  // 4. Report
  const report = buildReport(allResults, durationSeconds);
  printReport(report);

  // 5. Verify data integrity
  await verifyIntegrity(token, report.passed);

  // 6. Cleanup if requested
  if (doCleanup) {
    await cleanup(token);
  }

  // Exit with error code if any failures
  if (report.failed > 0 || report.errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Harness failed:", err);
  process.exit(1);
});

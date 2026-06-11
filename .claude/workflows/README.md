# Opus quality workflows

Two reusable multi-agent [Workflow](https://docs.claude.com/claude-code) scripts that encode
the manual session-based audit practice (`.claude/audit-2026-05-14/`,
`.claude/plans/case-form-followup-notes.md`) into repeatable orchestration.

| File | What it does | Mutates code? |
| ---- | ------------ | ------------- |
| `quality-audit.js` | Exhaustive code + app quality audit → `.claude/audit-<date>/REPORT.md` + `findings.json` (+ `screenshots/`) | No (read-only) |
| `quality-remediate.js` | Applies the audit's fixes in gated waves on a dedicated branch | Yes, branch-isolated |

They are invoked through the **Workflow** tool (they run in the background; watch with
`/workflows`). They are *not* shell scripts — don't `node` them.

```
Workflow({ scriptPath: ".claude/workflows/quality-audit.js",     args: { date: "2026-06-04" } })
Workflow({ scriptPath: ".claude/workflows/quality-remediate.js", args: { date: "2026-06-04" } })
```

> **These workflows are orchestrator-driven, not fire-and-forget.** In this environment
> workflow subagents are **sandbox-blocked from writing report/output files** (`REPORT.md`,
> etc.) — they may edit source, run git, and Write non-report files, but not author the report
> deliverable. So each workflow **returns** its report content as data and the caller (Claude,
> in the main loop) writes it to disk:
> - `quality-audit` returns `{ reportMarkdown, findings, ... }` → caller writes
>   `.claude/audit-<date>/REPORT.md` + `findings.json`.
> - `quality-remediate` edits/commits on its own branch, then returns `{ closeoutMarkdown, ... }`
>   → caller appends the remediation log to `REPORT.md`.
>
> After each run, read the task's output file (`…/tasks/<id>.output`), take `result.reportMarkdown`
> / `result.findings` / `result.closeoutMarkdown`, and persist them. (The verified validation run
> in `.claude/audit-2026-06-04-smoke/` shows the exact output shape.)

## The intended loop (human-in-the-loop)

```
quality-audit  →  read REPORT.md TL;DR + severity table  →  (you decide)
               →  quality-remediate  →  review the branch  →  open a PR when happy
```

A review gate between audit and remediation is deliberate — this is a PHI medical app. For an
unattended run, pass `autoRemediate: true` to `quality-audit` and it nests `quality-remediate`
(mechanical + logic tiers only) at the end.

## `quality-audit` args

| arg | default | meaning |
| --- | ------- | ------- |
| `date` | `"undated"` | output dir is `.claude/audit-<date>/`. **Always pass today's date** (scripts can't read the clock). |
| `depth` | `"exhaustive"` | `quick` (1 round, 1 skeptic, no modules/critic) · `standard` (2 rounds, modules) · `exhaustive` (4 rounds, loop-until-dry, 3 skeptics, module breadth + completeness critic). |
| `includeSim` | `true` | attempt the non-interactive `simctl` deep-link screenshot + vision pass. Degrades to "skipped" if no booted sim / installed dev build — never stalls. |
| `scope` | none | restrict the whole audit to a path or list of paths, e.g. `"client/lib/export"` or `["server", "shared"]`. Great for fast, cheap re-checks of one area. |
| `autoRemediate` | `false` | nest `quality-remediate` after synthesis (mechanical + logic). |

**Phases:** `Recon → Discover → Verify → Sim → Critic → Synthesize`.

- **Recon** records the gate baseline (`tsc`/`lint`/`vitest`), loads the *already-tracked* open
  items (so the queued a11y / opacity / OperativeSection work isn't re-reported as new), and
  extracts CLAUDE.md locked decisions every finder must respect.
- **Discover** fans out ~15 cross-cutting finders (each loops until 2 dry rounds) **and** ~13
  per-module breadth sweeps, deduping against a shared `seen` set.
- **Verify** runs 3 adversarial skeptics per candidate (refute-by-default); a finding survives
  only on a ≥2 majority. This is the main defence against false positives on an already-clean
  codebase.
- **Sim** discovers a booted simulator, deep-link logs in + seeds, screenshots key surfaces in
  light **and** dark, and vision-analyses them against the CLAUDE.md Visual Standards.
- **Critic** asks "what went unaudited?" and fires a targeted extra round.
- **Synthesize** writes `REPORT.md` (house format: TL;DR, triaged table with 🔴🟠🟡🔵✨, themed
  clusters, NEW-vs-tracked, clinical-review queue, coverage & gaps, handoff) and `findings.json`.

## `quality-remediate` args

| arg | default | meaning |
| --- | ------- | ------- |
| `date` | `"undated"` | reads `.claude/audit-<date>/findings.json`. |
| `tiers` | `["mechanical","logic"]` | which `fixTier`s to apply. `clinical` is **always excluded** (review-only). Add `"architectural"` for big refactors. |
| `maxWaves` | `99` | cap the number of clusters processed. |
| `findingsPath` | `.claude/audit-<date>/findings.json` | override the input. |
| `branch` | `quality/remediation-<date>` | the working branch. Never `main`; never pushed. |

**Phases:** `Setup → Waves → Closeout`.

- **Setup** branches off (carrying the untracked audit dir), commits the audit artifacts so they
  survive resets, records the gate baseline, and clusters eligible findings by `fixTier` + theme.
- **Waves** run **sequentially** (one editor on the shared tree at a time). Each wave:
  `edit → gate (tsc + vitest + lint) → commit on green / one repair attempt / revert on red`. A
  reverted cluster is re-filed as a ticket, not silently dropped.
- **Closeout** appends a per-wave table + deferred (clinical) list to `REPORT.md` and takes a
  final gate snapshot.

## Safety model

- Audit is **read-only**. Remediation is **branch-isolated** and **never pushes**, never triggers
  EAS.
- Every wave is **gated**: tests must stay ≥ baseline, `tsc` clean, lint warnings ≤ baseline
  (floor 2, the known upstream warnings). Red ⇒ revert.
- **Clinical-correctness changes are never auto-applied** — they're emitted as `CLINICAL-REVIEW`
  tickets (mirrors how the melanoma N3c fix was flagged for review before TestFlight).
- Finders respect every CLAUDE.md **locked decision / anti-pattern** (fed in via Recon); a
  "finding" that contradicts one is itself treated as wrong.

## Cost & rate limits

Each depth hard-caps the verify fan-out (`maxVerify`: quick 25 · standard 60 · exhaustive 120)
so a whole-repo run can't explode into hundreds of agents. Candidates beyond the cap are listed
**unverified** in the report's *Coverage & gaps* (re-run scoped to verify them) — never silently
dropped.

**Rate-limit reality (learned the hard way):** an unbounded `exhaustive` + `includeSim`
whole-repo pass once spawned ~800 agents and ~47% got API-rate-limited mid-run, which fails the
run. The caps above plus scoping keep it survivable. For a genuinely exhaustive sweep of the
whole app, **run it scoped per subsystem** rather than one giant pass:

```
Workflow({ scriptPath: ".../quality-audit.js", args: { date: "2026-06-04", scope: "client/lib/export" } })
Workflow({ scriptPath: ".../quality-audit.js", args: { date: "2026-06-04", scope: "server" } })
…
```

Cheaper modes generally:

- `depth: "standard"` (default-grade) or `"quick"` for routine checks.
- `scope: "<path>"` to audit one subsystem and stay well under rate limits.
- `includeSim: false` when no simulator is up.
- A `+<n>k` budget directive on the turn hard-caps spend: the runtime stops spawning new
  agents once the target is reached.

> **Implementation note:** the Workflow harness in this environment delivers `args` as a JSON
> **string**, not an object. Both scripts `JSON.parse` it defensively. If you fork these, keep
> that guard or every arg silently falls back to its default.

## Resuming / iterating

Every Workflow invocation persists its script and returns a `runId`. To resume after a pause or a
script edit: `Workflow({ scriptPath: "<path>", resumeFromRunId: "<id>" })` — unchanged `agent()`
calls return cached results; only edited/new calls re-run.

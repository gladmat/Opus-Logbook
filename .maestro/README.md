# Maestro E2E flows

End-to-end tests that drive a real iOS Simulator (or device) running the
Opus dev client. Maestro replays YAML scripts of taps, scrolls, and
assertions against the actual UI — they're the safety net for the
case-form happy path that vitest can't reach.

## Install

```bash
brew install maestro
```

Or via the official installer:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Verify:

```bash
maestro --version
```

## Run

Boot the iOS Simulator with the Opus dev client installed (`npm run dev:mobile`
+ press `i` in the Expo terminal), log in if needed, then:

```bash
maestro test .maestro/dashboard-smoke.yaml
maestro test .maestro/case-form-happy.yaml
maestro test .maestro/applock-pin.yaml -e TEST_PIN=123456
```

Run the whole directory:

```bash
maestro test .maestro/
```

## Conventions

Every selector uses `id:` (testID) — **never** `text:`. Visible text
changes; testIDs are stable. The testID convention is documented in
[CLAUDE.md](../CLAUDE.md#testid-convention) — use the existing
prefixes (`screen-*`, `main.*`, `caseForm.*`, `dashboard.*`).

## What's here

| Flow | What it covers |
| ---- | -------------- |
| `dashboard-smoke.yaml` | App launches, three bottom tabs visible, FAB opens |
| `case-form-happy.yaml` | Open new case, all six section pills visible, accept input, discard |
| `applock-pin.yaml` | App lock screen mounts, PIN unlock succeeds |

## What's NOT here yet

These are tracked as follow-ups in the audit plan:

- `case-form-save-end-to-end.yaml` — log a case fully and verify it
  appears on the dashboard. Needs richer fixture data and a teardown
  that deletes the test case.
- `skin-cancer-biopsy-flow.yaml` — biopsy with histology pending,
  episode auto-creation, return-to-update flow.
- `case-share-and-receive.yaml` — share a case, switch to the
  recipient account, accept share.

## Troubleshooting

- **"App not found"**: make sure the dev client is installed on the
  booted simulator. `npx expo start --dev-client` then press `i`.
- **"Element not found"**: take a screenshot via Maestro Studio
  (`maestro studio`) to inspect the live element tree.
- **CI**: Maestro Cloud (`maestro cloud`) is the path for running in
  CI without a local simulator. Not yet wired up — that's a follow-up.

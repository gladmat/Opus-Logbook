# docs/ — canonical documentation home

This directory is the single source of truth for Opus project documentation.

| Path | Purpose |
| --- | --- |
| `STATE.md` | Machine-generated project state snapshot. Regenerate with `/state-snapshot`. Do not hand-edit generated sections. |
| `INSTRUCTIONS-CLAUDE-AI-v3.md` | Instructions pasted into the Claude.ai project knowledge. |
| `EPA-ARCHITECTURE.md` | EPA architecture blueprint (planned). |
| `REGULATORY-POSITION.md` | Regulatory position statement (planned). |
| `blueprints/` | Active, **not-yet-implemented** blueprints. |
| `archive/` | Implemented or superseded blueprints, kept for history. |

## Blueprint lifecycle

A blueprint lives in `blueprints/` while unimplemented. Once its components/types
ship in the codebase, move it to `archive/` (verify with a grep for its key
symbols first). `/state-snapshot` does not touch this directory — classification
is manual.

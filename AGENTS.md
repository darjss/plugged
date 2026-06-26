<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes. Typechecking uses tsgo (TypeScript native preview Go compiler) via `pnpm typecheck:tsgo` — this is the default, not `tsc`.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Project Commerce Conventions

- Prefer Drizzle schema and Elysia/Eden inference as the source of truth for app types. Avoid hand-written domain DTO/type aliases unless inference cannot express the boundary clearly.
- Use Valibot for request validation and keep picklist values shared from the server schema/constants instead of duplicating string unions.
- Keep backend routes thin. Put commerce behavior in small server modules, validate inputs at the API boundary, and return inferred response shapes through Eden Treaty.
- Use expected-result returns for domain failures where useful, but do not introduce a large Result library unless the codebase starts needing composition across multiple failing boundaries.
- Delivery should follow the vit-store behavior conceptually: provider, address, optional address zone, delivery fee, notes, and status. Do not copy vit-store's vitamin-specific schema or admin flows wholesale.

## Agent skills

### Issue tracker

GitHub issues in `darjss/plugged` (uses `gh` CLI). External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Essential skills

- **`/karpathy-guidelines`** — always apply. Surgical changes, no overcomplication, surface assumptions, define verifiable success criteria.
- **`/impeccable`** — for all UI/frontend work. Use its sub-commands for design, polish, critique, and live browser iteration. The grunge/zine aesthetic (see DESIGN.md) is non-negotiable.
- **`/btca-local`** — use this to look up open source library internals instead of digging through `node_modules`. Faster and more reliable than reading bundled source.
- **`/tdd`** — only when explicitly requested. Default verification is `vp build` passes + manual Playwright testing.
- **`/diagnosing-bugs`** — when something is broken/throwing/failing. Diagnose before fixing.
- **`/code-review`** — run before merging or when quality is uncertain.

### Reference repos

- **vit-store** at `/home/darjs/dev/vit-store` — production ecommerce monorepo (Astro + SolidJS storefront, React admin, tRPC, Drizzle, QPay, PostHog, Cloudflare Workers). Refer to it for ecommerce patterns: cart store, checkout flow, QPay integration, SMS OTP auth, PostHog analytics, R2 image handling. Do not copy vitamin-specific schema or admin flows.

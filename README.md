# Service Scheduler

Layer the weekly Schedules that constrain a Provider's Caseload (school hours, recess, lunch, class blocks) and book Sessions into the time Students have free in common. Vocabulary lives in [CONTEXT.md](./CONTEXT.md); decisions in [docs/adr](./docs/adr).

All data stays in the browser's local storage (ADR-0001). To share, Providers export a file (Caseload, chosen Schedules, or both; never Sessions) from the Caseload or Schedules page, and teammates import it with the header's Import button or by dropping it onto the app. Properties are matched by name, so imported Audiences keep working.

To try the app with sample data, drop [`demo/demo-caseload-and-schedules.json`](./demo/demo-caseload-and-schedules.json) onto it.

```sh
pnpm install
pnpm dev      # dev server
pnpm test     # unit tests for the Free Time math and Window operations
pnpm check    # type-check
pnpm build    # static SPA in build/
```

## Layout

- `src/lib/domain/`: framework-free model: Audiences, interval math, Free Time, Window/Session splitting, import/export (`transfer.ts`)
- `src/lib/state/store.svelte.ts`: the single persisted store with undo/redo
- `src/lib/components/TimeGrid.svelte`: the horizontal Mon–Fri grid shared by the Schedule editor and the Planner
- `src/routes/`: `/caseload`, `/schedules`, `/schedules/[id]`, `/planner`

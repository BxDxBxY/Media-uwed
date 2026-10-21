# Admin & News Panel Fixes Validation

> ℹ️ Historical changelog of admin/news panel fixes. For current project status and open issues see [docs/06-AUDIT-2026-07-31.md](docs/06-AUDIT-2026-07-31.md); index at [docs/README.md](docs/README.md).

## Implemented areas

- Visits analytics page map behavior was rebuilt to be an interactive map-like vector view with country markers.
- Country hover now shows readable country names and country code.
- Country click now updates the right-side chart to the selected country's visits over the same 30-day period.
- Added backend support for per-country daily series (`countryDaily`) in visits detail API.

- Connections Hub now supports explicit status management for messages:
  - `new`
  - `contacted`
  - `closed`
  - `spam`
- Added status tabs with counts and status-changing actions that call a dedicated API endpoint.
- Message list API now returns all non-assistant messages so status filtering works consistently.

- AI categorization now ranks categories by weighted relevance and returns only top 1-3 categories.
- Added a more specific category rule for `War in Iran` and removed over-aggressive fallback to unrelated categories.

- Admin article create/edit panel now supports:
  - selecting up to 3 categories,
  - creating a new category inline,
  - editing multiple image URLs,
  - previewing multiple images,
  - storing gallery image URLs in content metadata marker (`<!--gallery:...-->`).

- News archive category chips were restyled to a cleaner badge style and now can display up to 3 categories.
- When category/filter changes, only the news panel area shows a loading overlay instead of replacing/reloading the entire page block.

## Functional checks performed

1. TypeScript validation passes (`npm run typecheck`).
2. Lint passes with pre-existing warnings only (`npm run lint`).
3. Visual check screenshot was captured for the news archive panel.

## Notes

- `react-simple-maps` installation was blocked by npm registry policy (403), so the map was implemented as an in-app SVG vector world layer with interactive country markers.
- This approach avoids introducing a hard external dependency while still delivering hover/click map interactions.

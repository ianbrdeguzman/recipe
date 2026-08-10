# shadcn/ui Foundation Design

**Date:** 2026-08-10
**Status:** Approved in chat, pending file review

## Goal

Add a proper shadcn/ui foundation to `apps/web` so the dashboard and recipe routes can use a consistent, token-driven component system based on the global CSS variables already defined in `apps/web/src/app/globals.css`.

## Scope

This design covers only the initial shadcn/ui setup and essential primitives.

Included:
- shadcn project configuration in `apps/web/components.json`
- required utility/dependency setup for shadcn components
- `cn()` utility in `apps/web/src/lib/utils.ts`
- essential primitives in `apps/web/src/components/ui/`
  - `button`
  - `card`
  - `input`
  - `label`
  - `textarea`
  - `dialog`
- validation via lint and typecheck

Excluded:
- refactoring existing feature components to use shadcn
- adding broader dashboard primitives like table, sheet, sidebar, dropdown menu
- adding marketing-page-specific components
- visual redesign beyond token alignment

## Constraints

- The app uses Next App Router under `apps/web/src/app`
- The setup must work with the existing global CSS token layer in `apps/web/src/app/globals.css`
- The theme should stay global, neutral, and compatible with both dashboard and recipe routes
- The setup should follow standard shadcn conventions so future `shadcn add` commands remain straightforward
- Existing app behavior should not be changed as part of this setup

## Architecture

The foundation will use the normal shadcn structure inside `apps/web`:
- `components.json` as the local shadcn config
- `src/lib/utils.ts` for the shared `cn()` helper
- `src/components/ui/*` for copied and owned component source

Styling will be driven by semantic CSS variables already present in `globals.css`. Component classes should reference semantic Tailwind tokens like `bg-background`, `text-foreground`, `border-border`, `bg-primary`, and `text-primary-foreground` rather than hard-coded colors.

## File Plan

### Create
- `apps/web/components.json`
- `apps/web/src/lib/utils.ts`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/card.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/label.tsx`
- `apps/web/src/components/ui/textarea.tsx`
- `apps/web/src/components/ui/dialog.tsx`

### Modify
- `apps/web/package.json` to add shadcn-related dependencies if missing
- `apps/web/tsconfig.json` only if alias support needs adjustment
- `apps/web/src/app/globals.css` only if the current token mapping is insufficient for installed components

## Component Boundaries

### `components.json`
Defines how shadcn resolves paths and theme files within `apps/web`. It should point at the local App Router CSS entrypoint and `@/*` aliases under `src/*`.

### `src/lib/utils.ts`
Exports a single `cn(...inputs)` helper built from `clsx` and `tailwind-merge`. This becomes the shared class-composition entrypoint for all shadcn primitives.

### `src/components/ui/*`
Each file should own one primitive or one small family of related exports. Components should stay close to upstream shadcn structure to reduce future drift.

## Dependency Plan

Expected additions:
- `clsx`
- `tailwind-merge`
- `class-variance-authority`
- `lucide-react`
- dialog dependencies required by the selected shadcn implementation, likely Radix packages

Dependency additions should stay minimal and only support the requested primitives.

## Theming Rules

- Use existing semantic CSS variables from `apps/web/src/app/globals.css`
- Do not introduce hard-coded component palette values unless required by upstream structure and mapped back to semantic tokens
- Keep radius usage aligned with `--radius-*`
- Preserve existing Geist font integration from `apps/web/src/app/layout.tsx`

## Error Handling and Risk

Primary risks:
1. alias mismatch between `components.json`, `tsconfig.json`, and imports
2. token mismatch between shadcn classes and the current Tailwind v4 `@theme inline` setup
3. dependency mismatch for dialog primitives

Mitigation:
- keep file paths local to `apps/web`
- verify imports after generation/addition
- run lint and typecheck after setup

## Testing and Verification

This setup is mainly configuration and primitive scaffolding. Success is verified by:
- ESLint passes in `apps/web`
- TypeScript check passes in `apps/web`
- component files resolve imports correctly
- no existing app files require behavioral changes

## Success Criteria

The setup is successful when:
- `apps/web` has a valid shadcn configuration
- the requested primitives exist in `src/components/ui/`
- the primitives compile against the existing token system
- future route work can import these primitives directly without more foundation setup

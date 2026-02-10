# UI — shadcn/ui + Tailwind v4

## shadcn/ui Setup

- Style: **new-york**, base color: **zinc**, icons: **lucide**
- Config: `apps/web/components.json`

## Adding Components

```
pnpm --filter @skvault/web dlx shadcn@latest add <component>
```

Components land in `src/components/ui/`.

## Utilities

`cn()` helper at `src/lib/utils.ts` — use for conditional class merging:

```tsx
import { cn } from "~/lib/utils";
<div className={cn("base-class", condition && "conditional-class")} />
```

## Tailwind v4

CSS entry (`src/styles/app.css`):
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

- CSS variables use oklch color space
- Dark mode: `.dark` class on `<html>` — use `@custom-variant dark (&:is(.dark *))`

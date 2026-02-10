# UI — shadcn/ui + Tailwind v4

## shadcn/ui Setup

- Style: **new-york**, base color: **zinc**, icons: **lucide**
- Config: `apps/web/components.json`

## Adding Components

```
cd apps/web && npx shadcn@latest add <component>
```

Components land in `src/components/ui/`. Ensure Node 22 (`nvm use`) before running.

**Installed components:** avatar, badge, button, card, dialog, alert-dialog, dropdown-menu, input, label, progress, separator, sonner, switch, table, textarea

**Toast = Sonner** (not toast — deprecated by shadcn). Hardcode `theme="dark"` in `src/components/ui/sonner.tsx` — do NOT import `useTheme` from `next-themes` (not installed).

## Utilities

`cn()` helper at `src/lib/utils.ts` — use for conditional class merging:

```tsx
import { cn } from "~/lib/utils";
<div className={cn("base-class", condition && "conditional-class")} />
```

Formatters at `src/lib/format.ts`: `formatRelativeTime`, `formatDownloads`, `formatBytes`

## Tailwind v4

CSS entry (`src/styles/app.css`):
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@plugin "@tailwindcss/typography";
```

- Plugins use `@plugin` NOT `@import` — `@import` is for CSS, `@plugin` loads JS plugins
- CSS variables use oklch color space
- Dark mode: `.dark` class on `<html>` (always on) — `@custom-variant dark (&:is(.dark *))`
- Fonts: `--font-sans: "Geist"`, `--font-mono: "JetBrains Mono", "Geist Mono"`

## Design System — "Terminal Noir"

Dark-first aesthetic: deep black background, green primary accent (`oklch(0.72 0.19 142.5)`), monospace details, dot-grid textures, subtle glow effects.

### Color Palette (Dark Mode)

| Token | oklch | Use |
|-------|-------|-----|
| `--primary` | `oklch(0.72 0.19 142.5)` | Green accent — links, active states, icons |
| `--background` | `oklch(0.098 ...)` | Near-black page background |
| `--card` | `oklch(0.137 ...)` | Card surfaces (use `bg-card/50`) |
| `--border` | `oklch(1 0 0 / 8%)` | White at 8% opacity (use `border-border/50`) |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Red for danger zones, yank actions |

### Page Header Pattern

Every page starts with a monospace uppercase label + heading:

```tsx
<p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
  SECTION LABEL
</p>
<h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
<p className="mt-1 text-[13px] text-muted-foreground">
  Short description.
</p>
```

### Card Pattern

Cards use semi-transparent background with hover glow overlay:

```tsx
<div className="group relative rounded-xl border border-border/50 bg-card/50 transition-all duration-200 hover:border-primary/20 hover:bg-card">
  {/* Invisible glow overlay — fades in on hover */}
  <div className="absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
  <div className="relative p-5">
    {/* Card content */}
  </div>
</div>
```

Key rules:
- Always `bg-card/50` (not `bg-card/30` or solid)
- Always `border-border/50` (half-opacity borders)
- Always `rounded-xl`
- Hover: `hover:border-primary/20 hover:bg-card`
- Content inside needs `relative` to sit above the glow overlay

### Empty State Pattern

Centered circular icon + muted text + optional CTA:

```tsx
<div className="flex flex-col items-center py-6">
  <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-border/50 bg-muted/30">
    <Package className="size-4 text-muted-foreground/50" />
  </div>
  <p className="text-[13px] text-muted-foreground/50">No items yet.</p>
  <Link to="/create" className="mt-2 text-[13px] text-primary hover:underline">
    Create your first item
  </Link>
</div>
```

### Table Pattern

Tables use uppercase tracking headers and `bg-card/50` container:

```tsx
<div className="rounded-xl border border-border/50 bg-card/50">
  <Table>
    <TableHeader>
      <TableRow className="border-border/50 hover:bg-transparent">
        <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Column
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="border-border/50 transition-colors hover:bg-accent/50">
        <TableCell className="text-[13px]">Content</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### Section Header with Icon

Used inside cards/panels:

```tsx
<div className="mb-4 flex items-center gap-2">
  <Layers className="size-4 text-primary" />
  <h2 className="text-[13px] font-medium">Section Title</h2>
</div>
```

### Danger Zone Pattern

```tsx
<div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-5">
  <div className="mb-3 flex items-center gap-2">
    <AlertTriangle className="size-4 text-destructive" />
    <h2 className="text-[13px] font-medium text-destructive">Danger Zone</h2>
  </div>
  <p className="mb-4 text-[13px] text-muted-foreground">Warning text.</p>
  <Button variant="destructive" size="sm">Delete</Button>
</div>
```

### Typography Scale

| Class | Use |
|-------|-----|
| `text-2xl font-bold tracking-tight` | Page headings |
| `text-[13px]` | Body text, labels, descriptions |
| `text-[11px] uppercase tracking-wider` | Table headers, meta labels |
| `text-xs` | Timestamps, helper text |
| `text-[10px]` | Badge text |
| `font-mono text-xs` | Identifiers, versions, skill names |
| `font-mono text-xs uppercase tracking-widest text-primary` | Section labels above headings |

### Badge Variants

```tsx
{/* Public/active — green outline */}
<Badge variant="outline" className="h-5 text-[10px] border-primary/30 text-primary">
  public
</Badge>

{/* Private/muted */}
<Badge variant="secondary" className="h-5 text-[10px]">private</Badge>

{/* Status badges */}
<Badge variant="outline">active</Badge>
<Badge variant="secondary">deprecated</Badge>
<Badge variant="destructive">yanked</Badge>
```

### Button Sizing

Dashboard uses `size="sm"` for most actions to keep things compact. Primary CTAs in headers use `className="gap-1.5"` with small icons (`size-3.5`).

## Custom CSS Classes

Defined in `src/styles/app.css`:

| Class | Effect |
|-------|--------|
| `.dot-grid` | 24px dot grid background (white 4% opacity) |
| `.glow-green` | Box shadow with green glow (20px + 60px) |
| `.glow-green-sm` | Smaller green box shadow (12px) |
| `.text-glow` | Green text shadow |
| `.noise` | Fractal noise texture via `::before` pseudo |
| `.terminal-line` | Typing animation (1.2s, 20 steps) |
| `.terminal-line-2` | Slower typing animation (1.6s, 30 steps, delayed) |
| `.animate-slide-up` | Slide up + fade in (0.6s) |
| `.delay-100` – `.delay-500` | Animation delay classes (100ms increments) |

## Reusable Components

| Component | Path | Use |
|-----------|------|-----|
| `<ScanStatusDot>` | `src/components/scan-status-dot.tsx` | pass/warn/fail colored dot |
| `<ScanReport>` | `src/components/scan-report.tsx` | Full scan results display |
| `<CopyButton>` | `src/components/copy-button.tsx` | Copy-to-clipboard with feedback |
| `<SiteHeader>` | `src/components/site-header.tsx` | Global nav (public pages) |
| `<SiteFooter>` | `src/components/site-footer.tsx` | Global footer |
| `<SkillCard>` | `src/components/skill-card.tsx` | Skill grid card (explore page) |

## SK Logo Icon

Used in site header and dashboard sidebar:

```tsx
<div className="flex size-7 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary transition-colors group-hover:bg-primary/20">
  SK
</div>
```

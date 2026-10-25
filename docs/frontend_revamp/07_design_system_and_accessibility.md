# 07 — Design System and Accessibility (WCAG 2.2 AA)

> Visual tokens, component standards, responsive behavior, and accessibility guarantees.

---

## 1. Design Tokens and Visual Language

The design system is tuned specifically for high-throughput, high-data-density hospital and clinical environments. It avoids frivolous decorative animations in favor of immediate legibility, high contrast, clear state communication, and minimal visual fatigue.

### Color Tokens & Semantic Roles
- **Surface & Background:**
  - `bg-surface`: `#ffffff` (light), `#18181b` (dark zinc-900)
  - `bg-subtle`: Neutral tinted hovering & active rows (`#f4f4f5` / `#27272a`)
  - `border-border`: Crisp boundary definition (`#e4e4e7` / `#3f3f46`)
- **Primary / Brand:**
  - `bg-primary`: High-contrast teal/emerald or deep slate tailored for clinical clarity
  - `text-primary-foreground`: `#ffffff`
- **Clinical Status Badges:**
  - *Waiting / Pending:* `bg-warning-soft` / `text-warning` (`#fef3c7` / `#b45309`)
  - *Active / With Doctor:* `bg-brand-soft` / `text-brand`
  - *Completed / Settled:* `bg-emerald-50` / `text-emerald-700`
  - *Critical / Cancelled / Due:* `bg-critical-soft` / `text-critical` (`#fee2e2` / `#b91c1c`)
- **Typography:**
  - Font: Inter Variable (`@fontsource-variable/inter`)
  - Tabular numbers (`tabular-nums`) enforced on all financial amounts (paise/rupees), UHID tokens, phone numbers, and timestamps to ensure vertical alignment.

---

## 2. Accessibility Commitments (WCAG 2.2 AA)

1. **Color Contrast:**
   - All body text meets at least 4.5:1 contrast against its background.
   - Large text (headings >= 18pt/24px) meets at least 3:1 contrast.
   - Status indicators pair color with text labels or distinct icons (never color alone).
2. **Keyboard Navigation & Focus Management:**
   - Universal focus ring: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`.
   - Modals and Drawers trap focus using Radix UI/ARIA compliant primitives in `@platform/ui`.
   - On modal close, focus restores predictably to the trigger button.
   - Global shortcuts: `F2` (Billing), `F3` (Pharmacy), `Ctrl+K` (Quick Action), `Alt+1..9` (Nav items).
3. **Screen Readers & ARIA:**
   - All interactive icons provide `aria-label` or visually hidden fallback text.
   - Dynamic error summaries use `role="alert"` and `aria-live="polite"`.
   - Skeletons use `aria-busy="true"` and `aria-hidden="true"`.
4. **Reduced Motion:**
   - `@media (prefers-reduced-motion: reduce)` disables or zeroes transitions.


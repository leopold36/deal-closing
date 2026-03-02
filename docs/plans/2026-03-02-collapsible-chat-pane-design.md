# Collapsible Chat Pane Design

**Goal:** Make the deal form stretch full width by default, with a toggle button to slide the Deal Assistant chat pane in from the right.

## Current State

The deal detail page (`src/app/deals/[id]/page.tsx`) uses a fixed 2:1 flex layout where the form always takes 2/3 and the chat panel always takes 1/3.

## Design

- **Default (closed):** Form stretches full width. A "Deal Assistant" button (Bot icon) sits in the top-right of the page header next to the status badge.
- **Open:** Chat pane slides in from the right with a ~300ms CSS transition. The form shrinks to its current 2/3 width. The chat pane gets the remaining 1/3.
- **Close:** Click an X or the same toggle button. Chat pane slides out, form expands back to full width.

## Implementation

All changes in one file: `src/app/deals/[id]/page.tsx`. A `useState` boolean controls open/closed. CSS `transition-all duration-300` on flex containers handles the animation. The chat pane toggles between `w-0 overflow-hidden` (closed) and `flex-1` (open).

`DealForm` and `ChatPanel` components remain unchanged.

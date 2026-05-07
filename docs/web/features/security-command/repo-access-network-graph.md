# Repository access network graph

**File:** `networkGraph.tsx`

## Purpose

Visualize selected repository access relationships using **React Flow**.

## Node types

- `repoCenter` — central repository node
- `netUser` — user nodes with access labels

## Edge semantics

- Access types come from `AccessLevel`:
  - `admin` → red (`#EF4444`)
  - `write` → teal (`#00C2CB`)
  - `read` → slate (`#64748B`)

Custom edge renderer (`AccessEdge`) applies color + optional highlight state.

## Interaction

- Clicking a user node toggles that user as `selected`.
- Selected user effects:
  - user node gets pulse/highlight style
  - corresponding edge chain receives red dashed pulse + glow
- Clicking pane clears selection.

## Layout algorithm

`buildGraph(repoLabel, users)`:

- places repository near top center
- fans users on a lower row
- creates edges from repo source handle to each user target handle

## Reset behavior

When `repoLabel` or `users` changes (due repo select), graph nodes/edges are rebuilt and selection resets.

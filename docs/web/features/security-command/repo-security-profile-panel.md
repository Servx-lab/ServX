# Repo security profile panel

**File:** `SecurityProfilePanel.tsx`

Right-hand column consists of two stacked cards.

## Section 1: Selected Repo Security Profile

- Title + selected repo name
- Large total vulnerabilities number
- Severity distribution bars:
  - Critical (red)
  - High (orange)
  - Medium (teal)
  - Low (slate)
- Bar percentages come from `data.vulnPct`.

## Section 2: Users with Critical Access

- Count of users with critical access
- List entries with:
  - avatar/fallback initials (`ProfilePhoto`)
  - name
  - role text

All values are derived from `RepoSecurityData`.

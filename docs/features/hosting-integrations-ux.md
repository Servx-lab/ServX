# Hosting Integrations: UX & Inline Editing

This document details the advanced frontend User Experience (UX) patterns implemented in the Hosting Integrations sidebar (Connected Accounts list).

## Radix UI Dropdown Focus Management

When integrating inline interactive elements (like a text input) alongside a Radix UI `DropdownMenu`, aggressive focus-stealing can occur. 

By default, when a user clicks a `DropdownMenuItem` (e.g., "Edit Name"), Radix UI will close the menu and immediately attempt to return the DOM focus back to the `DropdownMenuTrigger` (the 3-dots button). If you are simultaneously trying to auto-focus a newly rendered `<input>` box, Radix UI will steal the focus back a few milliseconds later, causing the input to instantly trigger an `onBlur` event and collapse.

**The Fix:**
You must explicitly block Radix UI from restoring focus by using the `onCloseAutoFocus` prop on the `DropdownMenuContent`:

```tsx
<DropdownMenuContent 
  onCloseAutoFocus={(e) => {
    // CRITICAL: Prevent Radix from stealing focus back to the trigger!
    e.preventDefault(); 
  }}
>
```

## Native OS-Level Inline Editing

To replicate standard operating system UX (like renaming a folder in Windows/macOS), the text must be fully highlighted the instant the input box appears.

Instead of relying on unstable `setTimeout` hacks inside a `useEffect`, we rely on React's native DOM mounting lifecycle:

1. Use the `autoFocus` prop to guarantee the input is focused the exact microsecond it is painted to the DOM.
2. Hook into `onFocus` to trigger the text selection natively.

```tsx
<input
  autoFocus
  onFocus={(e) => e.target.select()} // Highlights the text for immediate overwriting
  onKeyDown={(e) => {
    if (e.key === 'Enter') e.currentTarget.blur(); // Safely triggers save via onBlur
  }}
/>
```

**Note on Race Conditions:** 
Never bind your API save function directly to the `Enter` key if it is also bound to `onBlur`. Doing so will cause the save function to fire twice (once for the keydown, and once when the element loses focus as a result). Instead, pressing `Enter` should simply call `.blur()`, which gracefully funnels all save logic through a single `onBlur` event handler.

## Aesthetics & Zero Layout Shift

To visually indicate edit mode without shifting the layout of the sidebar:
- We use a negative left margin (`-ml-2`) to offset the horizontal padding (`px-2`) of the input box. This ensures the text stays perfectly aligned with the non-editing text.
- We utilize neutral styling (`bg-white border-gray-300 ring-gray-200`) instead of aggressive colored halos (like blue/indigo) to match standard professional dashboard aesthetics.

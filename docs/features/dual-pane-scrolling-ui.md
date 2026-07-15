# Dual-Pane Scrolling Layout Architecture

## The Problem
In complex integration views (such as the GitHub Repository Analytics or the Hosting Integration Dashboard), the UI is split into two panes: a navigation sidebar on the left, and a dense, chart-heavy analysis dashboard on the right.

Historically, the entire outer `PageLayout` container was responsible for scrolling. This caused a critical UX issue: when the user scrolled down to view the charts on the right, the sidebar on the left scrolled completely out of view, making it impossible to switch repositories or providers without scrolling all the way back up.

## The Solution
We implemented two CSS-based techniques to achieve independent scrolling for each pane, depending on the specific layout needs of the page.

### 1. The Sticky Sidebar Approach (Hosting Integrations)
For pages where the main layout naturally flows vertically but requires a persistent sidebar toolset, we utilized CSS `position: sticky`.

```tsx
<aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-8 h-fit">
    <HostingSidebar />
</aside>
```
- `lg:sticky`: Pins the sidebar to the scroll container.
- `lg:top-8`: Provides an 8-pixel offset from the top.
- `h-fit`: Critical fix. If the `aside` inherited the full height of the flex container, `sticky` would fail because the element would have no room to slide. `h-fit` collapses the height to its content, allowing it to stick as the parent scrolls.

### 2. The Fixed Viewport Approach (GitHub Analytics)
For highly dense, app-like interfaces where *both* panes need to scroll independently, relying on the outer `PageLayout` scroll is ineffective. We instead lock the main container's height to the viewport.

```tsx
<div className="flex h-[calc(100vh-14rem)] min-h-[600px] w-full bg-white overflow-hidden shadow-sm border border-gray-200">
    <div className="w-80 border-r ...">
       <ScrollArea className="flex-1"> {/* Left Scrollable List */} </ScrollArea>
    </div>
    <div className="flex-1 ...">
       <ScrollArea className="flex-1"> {/* Right Scrollable Dashboard */} </ScrollArea>
    </div>
</div>
```
- `h-[calc(100vh-14rem)]`: Constrains the container to the browser's viewport height (minus the header/padding).
- `overflow-hidden`: Prevents the content from expanding the container and triggering the outer `PageLayout` scrollbar.
- `ScrollArea`: Radix UI custom scrollbars placed inside the flex children handle all internal overflow cleanly and independently.

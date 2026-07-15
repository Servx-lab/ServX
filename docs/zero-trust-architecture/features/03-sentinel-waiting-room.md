# Feature: Sentinel Waiting Room

## Purpose
The Sentinel Waiting Room is the visual lock screen presented to any Unrecognized Device that attempts to access the application. It traps the user in a `PENDING` state and silently listens for approval from the Main Device.

## Frontend Modifications

### 1. The Interceptor (`RequireAuth.tsx`)
**File**: `apps/web/src/features/auth/RequireAuth.tsx`

We modified the React Router authentication guard to check for a specific Zero-Trust error flag (`isDevicePendingApproval`) populated by the AuthContext.

```tsx
// Device Zero-Trust Authorization
if (isDevicePendingApproval) {
    return <DevicePendingTakeover />;
}
```

### 2. The Radar Lock Screen (`DevicePendingTakeover.tsx`)
**File**: `apps/web/src/features/auth/DevicePendingTakeover.tsx`

This beautiful, glassmorphic component serves two purposes:
1. **UX**: It shows the user their hardware fingerprint and a pulsing radar indicating they must approve the login elsewhere.
2. **SSE Connection**: It opens an `EventSource` connection to the backend, listening for the `device_resolved` event.

```typescript
const sseUrl = `${absoluteBase}/devices/listen-approval/${deviceUUID}?token=${session.access_token}`;
sse = new EventSource(sseUrl);

sse.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.event === "device_resolved") {
    if (data.status === "APPROVED") {
      toast.success("🎉 Device authorized successfully!");
      setTimeout(() => window.location.reload(), 1500);
    } else if (data.status === "DENIED") {
      toast.error("❌ Access denied.");
      handleLogout();
    }
  }
};
```

## Backend Modifications
**File**: `apps/api/src/domains/devices/controller.ts`

The `/listen-approval/:fingerprint` endpoint hooks into Redis Pub/Sub. It specifically filters messages to only alert the frontend if the `device_fingerprint` matches the one in the URL.

```typescript
await subClient.subscribe(`device_approvals:${userId}`, (message) => {
  const data = JSON.parse(message);
  // Only forward the event if it's meant for THIS specific device fingerprint
  if (data.event === 'device_resolved' && data.device_fingerprint === fingerprint) {
    res.write(`data: ${message}\n\n`);
  }
});
```

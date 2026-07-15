# Feature: Handshake Coordinator & Geo-Location

## Purpose
This feature represents the "Master" side of the Zero-Trust Architecture. It allows the Main Device to intercept incoming login requests globally and provides highly accurate, real-world context (City and ISP) about the login attempt using silent IP-based Geolocation.

## Backend Modifications: Geo-Location Injection
**File**: `apps/api/src/domains/auth/controller.ts` (specifically `syncUser`)

To provide rich context without triggering scary browser GPS popups, we implemented an IP-based location fetcher. 
*Crucially, we added a safety check for local development (`::1` or `127.0.0.1`) that forces the API to resolve the host machine's public IP, ensuring real data is always returned during testing.*

```typescript
// Fetch real location data (Fallback to backend's public IP if client is localhost)
let locationStr: string | undefined;
let ispStr: string | undefined;
try {
  let targetIp = Array.isArray(clientIp) ? clientIp[0] : clientIp;
  const isLocal = targetIp === '::1' || targetIp === '127.0.0.1' || targetIp.startsWith('192.168.');
  
  // If local, don't pass targetIp so the API resolves our actual public IP
  const url = isLocal ? 'http://ip-api.com/json/' : `http://ip-api.com/json/${targetIp}`;
  
  const geoResponse = await axios.get(url, { timeout: 3000 });
  if (geoResponse.data && geoResponse.data.status === 'success') {
    locationStr = geoResponse.data.city && geoResponse.data.regionName ? `${geoResponse.data.city}, ${geoResponse.data.regionName}` : undefined;
    ispStr = geoResponse.data.isp || undefined;
  }
} catch (geoErr) {
  // Silent fail
}
```

This data is then bundled into the Redis payload:
```typescript
await redis.publish(`device_approvals:${id}`, JSON.stringify({
  event: 'login_request',
  device_fingerprint: fingerprint,
  device_name: cleanName,
  last_ip: clientIp,
  location: locationStr, // e.g., "Secunderabad, Telangana"
  isp: ispStr            // e.g., "Airtel Broadband"
}));
```

## Frontend Modifications: The Approval Drawer
**File**: `apps/web/src/features/auth/ApprovalDrawer.tsx`

This component is mounted globally in `App.tsx` (inside the `AuthProvider`). 

### Core Behaviors:
1. **Self-Awareness**: On mount, it checks `GET /devices` to see if the current browser's fingerprint `is_main`. If not, the component renders `null` and does nothing.
2. **SSE Listener**: If it *is* the Main Device, it connects to `GET /api/devices/listen-requests`.
3. **The Drawer UI**: When a `login_request` event is received via SSE, it pushes the request into a React state array. This causes a stunning, glassmorphic drawer to slide up from the bottom of the screen.
4. **Geo-Panel**: It renders the `location` next to a Rose-colored MapPin icon, and the `isp` next to a Blue-colored Globe icon.
5. **Action Handlers**: Clicking "Approve" or "Deny" fires `POST /api/devices/approve`, which resolves the handshake.

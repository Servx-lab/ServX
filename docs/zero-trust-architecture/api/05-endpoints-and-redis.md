# API & Redis Data Contracts

This document outlines the API endpoints and internal Redis Pub/Sub events that power the Zero-Trust Sentinel Architecture.

## REST Endpoints

### 1. `POST /api/devices/set-main`
Designates a specific device as the Main Device (Master Authenticator) and demotes all others.
- **Auth**: Required (Bearer Token)
- **Body**: 
  ```json
  {
    "deviceId": "uuid-of-the-device-row"
  }
  ```

### 2. `POST /api/devices/approve`
Called by the Main Device to approve or deny a pending login request.
- **Auth**: Required (Bearer Token)
- **Body**:
  ```json
  {
    "device_fingerprint": "the-unrecognized-device-fingerprint",
    "status": "APPROVED" // or "DENIED"
  }
  ```
- **Action**: Updates `user_devices.status` and publishes a `device_resolved` event to Redis.

---

## Server-Sent Events (SSE) Streams

### 1. `GET /api/devices/listen-requests`
Connected to exclusively by the Main Device.
- **Query Param**: `?token=<access_token>`
- **Behavior**: Subscribes to the Redis channel `device_approvals:${userId}`. Forwards all messages directly to the client.

### 2. `GET /api/devices/listen-approval/:fingerprint`
Connected to by Unrecognized Devices trapped in the Waiting Room.
- **Query Param**: `?token=<access_token>`
- **Behavior**: Subscribes to the Redis channel `device_approvals:${userId}`. Only forwards messages where `event === 'device_resolved'` AND `device_fingerprint` matches the URL parameter.

---

## Redis Pub/Sub Contracts
**Channel Pattern**: `device_approvals:${userId}`

### Event: `login_request`
Published by `POST /api/auth/sync` when an unapproved device attempts to log in.
```json
{
  "event": "login_request",
  "device_fingerprint": "abc-123-xyz",
  "device_name": "Chrome on Windows",
  "last_ip": "49.205.x.x",
  "location": "Secunderabad, Telangana",
  "isp": "Airtel Broadband"
}
```

### Event: `device_resolved`
Published by `POST /api/devices/approve` when the Main Device makes a decision.
```json
{
  "event": "device_resolved",
  "device_fingerprint": "abc-123-xyz",
  "status": "APPROVED"
}
```

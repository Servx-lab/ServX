# Connectivity Troubleshooting

## 1. Local API Connection Refused (`ERR_CONNECTION_REFUSED`)

### Symptom
Browser console shows `net::ERR_CONNECTION_REFUSED` for `http://localhost:5000/api/...`.

### Root Cause
On Windows, `localhost` may resolve to `::1` (IPv6), while the Node.js server might only be listening on `0.0.0.0` (IPv4). Even if it listens on both, some browser/OS configurations can still fail to route `localhost` correctly to the listening port.

### Solution
Change the API URL in the frontend environment variables to use the explicit IPv4 address `127.0.0.1`.
**File:** `apps/web/.env`
```env
VITE_API_URL=http://127.0.0.1:5000
```

---

## 2. Supabase DNS Not Found (`DNS_PROBE_POSSIBLE`)
- **NEW**: Managing the Stale-While-Revalidate (SWR) cache for hosting providers.

## SWR & Hosting Cache
If you notice that a hosting provider's status is out of date and "Sync Now" doesn't fix it, you may need to clear the local browser cache:
1. Open DevTools (F12).
2. Go to the **Application** tab.
3. Select **Local Storage** -> `http://localhost:5173`.
4. Delete the key `servx_cached_data`.
5. Refresh the page.

### Symptom
Browser shows `bxmnuzqujamyuvsomfdj.supabase.co’s DNS address could not be found.`

### Root Cause
The project ID `bxmnuzqujamyuvsomfdj` does not have a valid DNS record. This can happen if:
- The project was deleted on Supabase.
- The project ID is misspelled.
- The project was renamed.
- There is a major Supabase outage (check [status.supabase.com](https://status.supabase.com)).

### Next Steps
1. Verify the project ID in the Supabase Dashboard (Settings > API).
2. If using local Supabase, ensure the URL points to `http://127.0.0.1:54321`.
3. Update `.env` files in `apps/api` and `apps/web` with the correct URL.

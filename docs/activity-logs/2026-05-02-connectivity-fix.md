# Log: Connectivity and Documentation Setup
**Date:** 2026-05-02

## Objective
Address the `ERR_CONNECTION_REFUSED` and Supabase DNS issues, and establish a structured documentation system as requested.

## Actions Taken
1.  **Created Documentation Structure**:
    *   `docs/logs/`: For chronological task logs.
    *   `docs/troubleshooting/`: For common issues and fixes.
2.  **Investigated Connectivity**:
    *   Confirmed the API server is running on port 5000 and bound to `0.0.0.0` (IPv4) and `::` (IPv6).
    *   Confirmed `bxmnuzqujamyuvsomfdj.supabase.co` is currently failing DNS resolution.
3.  **Applied Fixes**:
    *   Updated `apps/web/.env` to use `127.0.0.1` instead of `localhost` for `VITE_API_URL` to avoid IPv4/IPv6 resolution ambiguity on Windows.

## Results
*   Local API server is confirmed responsive via `curl`.
*   Documentation system is active.

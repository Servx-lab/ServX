# Feature: Device Governance

## Purpose
The Device Governance feature allows users to view all active sessions tied to their account and explicitly designate which device acts as their "Master Authenticator" (Main Device). 

## Database Changes
Table: `user_devices`
- **Added Column**: `is_main_device` (boolean, default `false`)
- **Added Column**: `status` (enum/text: `APPROVED`, `PENDING`, `DENIED`)
- **Added Column**: `device_fingerprint` (text, unique per session/hardware)

## Backend Modifications
**File**: `apps/api/src/domains/devices/controller.ts` & `router.ts`

Created the `POST /api/devices/set-main` endpoint.
This endpoint ensures that only *one* device can be the main device at a time.

```typescript
export async function setMainDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.user?.id;
  const { deviceId } = req.body;
  
  // 1. Demote all existing main devices for this user
  await supabaseAdmin
    .from('user_devices')
    .update({ is_main_device: false })
    .eq('user_uuid', userId);

  // 2. Promote the selected device
  await supabaseAdmin
    .from('user_devices')
    .update({ is_main_device: true })
    .eq('id', deviceId)
    .eq('user_uuid', userId);
}
```

## Frontend Modifications
**File**: `apps/web/src/pages/ProfileSettings.tsx`

We added a new "Security & Devices" tab. It queries the `/devices` endpoint and renders a list of connected devices.

### Key Logic:
1. **Empty State Alert**: If no device is currently marked as `is_main_device`, a glowing red/cyan banner (`<ShieldAlert />`) warns the user that their account lacks a Master Authenticator.
2. **Set as Main Button**: Each device row has a "Set as Main" button. Clicking this triggers `apiClient.post('/devices/set-main', { deviceId })` and refreshes the list.

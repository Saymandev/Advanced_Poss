# BD Defaults Migration - System Settings

## Changes Made

### 1. Schema Defaults Updated
**File**: `backend/src/modules/settings/schemas/system-settings.schema.ts`

Updated default company settings to BD (Bangladesh) based:
- ✅ Currency: `USD` → `BDT`
- ✅ Timezone: `America/New_York` → `Asia/Dhaka`
- ✅ Date Format: `MM/DD/YYYY` → `DD/MM/YYYY`
- ✅ Time Format: `12h` → `24h`
- ✅ Language: `en` → `bn`

### 2. Automatic Migration Logic
**File**: `backend/src/modules/settings/settings.service.ts`

Added automatic migration in `getSystemSettings()` method:
- Detects old values (USD, America/New_York, MM/DD/YYYY, 12h, en)
- Automatically updates existing database records to BD defaults
- Applies BD defaults for new system settings documents

## How It Works

### For New Installations:
When system settings are created for the first time, they automatically use BD defaults:
```typescript
defaultCompanySettings: {
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  language: 'bn',
}
```

### For Existing Installations:
When `getSystemSettings()` is called:
1. Checks if settings exist
2. If they have old values (USD, America/New_York, etc.), automatically migrates them
3. Returns updated settings with BD defaults

## Testing

To verify the migration worked:

1. **Refresh the System Settings page** in the frontend
2. The Default Company Settings should now show:
   - Currency: `BDT`
   - Timezone: `Asia/Dhaka`
   - Date Format: `DD/MM/YYYY`
   - Time Format: `24 Hour` (24h)
   - Language: `bn`

3. If you still see old values:
   - Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache
   - The migration runs automatically on the next GET request

## Manual Migration (If Needed)

If you need to force the migration immediately, you can:

1. Call the GET endpoint: `GET /api/v1/settings/system`
   - This triggers the migration automatically

2. Or update via PATCH: `PATCH /api/v1/settings/system`
   ```json
   {
     "defaultCompanySettings": {
       "currency": "BDT",
       "timezone": "Asia/Dhaka",
       "dateFormat": "DD/MM/YYYY",
       "timeFormat": "24h",
       "language": "bn"
     }
   }
   ```

## Notes

- Migration is **automatic** and **non-destructive**
- Only updates if old values are detected
- Doesn't affect other settings (security, email, SMS, etc.)
- Works seamlessly on next page load


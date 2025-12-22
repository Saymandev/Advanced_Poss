# System Default Company Settings - Production Ready

## Final Default Values

**Location**: `backend/src/modules/settings/schemas/system-settings.schema.ts`

### Default Company Settings:
- ✅ **Currency**: `BDT` (Bangladesh Taka)
- ✅ **Timezone**: `Asia/Dhaka` (Bangladesh)
- ✅ **Date Format**: `DD/MM/YYYY` (Bangladesh format)
- ✅ **Time Format**: `12h` (12 hour format)
- ✅ **Language**: `en` (English)

## How It Works

### 1. Schema Defaults
The schema now has correct defaults that will be used for:
- New system settings documents
- Missing fields in existing documents

### 2. Automatic Migration
The `getSystemSettings()` method in `SettingsService`:
- Checks if settings exist
- **Automatically updates** any old values to BD defaults
- Forces update if values don't match correct defaults
- Runs on every GET request to ensure consistency

### 3. Company Creation
When new companies are created:
- They use hardcoded values: `currency: 'BDT'`, `language: 'en'`
- These match the system defaults
- Companies can override these in their own settings

## Force Update Existing Records

To immediately update existing system settings:

### Option 1: Via API
Simply call the GET endpoint:
```bash
GET /api/v1/settings/system
```
This will automatically migrate old values to new defaults.

### Option 2: Via Frontend
1. Navigate to `/dashboard/system-settings`
2. Click on "Default Settings" tab
3. The page will fetch settings, triggering automatic migration
4. Refresh the page to see updated values

### Option 3: Direct Database Update (if needed)
```javascript
db.systemsettings.updateOne(
  {},
  {
    $set: {
      "defaultCompanySettings.currency": "BDT",
      "defaultCompanySettings.timezone": "Asia/Dhaka",
      "defaultCompanySettings.dateFormat": "DD/MM/YYYY",
      "defaultCompanySettings.timeFormat": "12h",
      "defaultCompanySettings.language": "en"
    }
  },
  { upsert: true }
)
```

## Verification

After the migration, verify the settings:

1. **Backend**: Check system settings document in database
2. **Frontend**: Refresh System Settings page - should show:
   - Currency: `BDT`
   - Timezone: `Asia/Dhaka`
   - Date Format: `DD/MM/YYYY`
   - Time Format: `12 Hour`
   - Language: `en`

## Production Impact

### Does this affect the system?

✅ **YES - This affects:**
1. **New Companies**: When companies register, they get BD-based defaults
2. **System Settings UI**: Super Admin can see and modify defaults
3. **Default Values**: Used as reference when creating new companies

❌ **NO - This does NOT:**
1. Change existing company settings (companies have their own settings)
2. Break existing functionality
3. Force changes on active companies

### Production Readiness Checklist

- [x] Schema defaults are correct (BDT, Asia/Dhaka, DD/MM/YYYY, 12h, en)
- [x] Automatic migration logic in place
- [x] Migration runs on every GET request
- [x] New companies use BD defaults
- [x] Frontend will reflect updated values after refresh

## Troubleshooting

**If frontend still shows old values:**
1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Clear browser cache
3. Check backend logs for migration messages
4. Verify database record was updated

**To force immediate update:**
- Call GET `/api/v1/settings/system` endpoint
- Or navigate to System Settings page in frontend


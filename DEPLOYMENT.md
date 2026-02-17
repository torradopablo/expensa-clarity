# Deployment Considerations

This file contains implementation considerations and strategies for each project release.

## Unreleased

## [1.1.1] - 2026-02-17

### Deployment Strategy & Considerations
> **Critical**: This version requires manual data migration in the Supabase Dashboard.

1. **Edge Functions**: Deploy `process-expense` update to handle building profile linking.
2. **Data Migration**: Run the following SQL script in the Supabase SQL Editor for all projects:
   ```sql
   -- 1. Create missing profiles
   INSERT INTO public.building_profiles (user_id, building_name)
   SELECT DISTINCT user_id, building_name
   FROM public.expense_analyses
   WHERE building_name IS NOT NULL
   ON CONFLICT (user_id, building_name) DO NOTHING;

   -- 2. Link analyses via normalized names
   UPDATE public.expense_analyses ea
   SET building_profile_id = bp.id
   FROM public.building_profiles bp
   WHERE ea.user_id = bp.user_id
     AND LOWER(TRIM(ea.building_name)) = LOWER(TRIM(bp.building_name))
     AND ea.building_profile_id IS NULL;
   ```
3. **Frontend**: Deploy frontend changes to support the updated `Analysis` interface.

## [1.1.0] - 2026-02-16

### Deployment Strategy & Considerations
> **Warning**: To avoid desynchronization between the frontend and backend, follow this specific order:

1. **Edge Functions**: Deploy `process-expense` and `mercadopago-webhook` first. Ensure `MERCADOPAGO_ACCESS_TOKEN` is configured in the production environment.
2. **Storage**: Verify that the `expense-files` bucket exists in Production and has RLS policies allowing authenticated users to upload and read their files.
3. **Frontend**: Deploy the web application last.
4. **Data Integrity**: Note that existing 'pending' analyses will now appear in the History page, allowing users to retry interrupted processes. No SQL migrations are required for this release.


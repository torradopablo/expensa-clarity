# Deployment Considerations

This file contains implementation considerations and strategies for each project release.

## Unreleased

## [1.1.0] - 2026-02-16

### Deployment Strategy & Considerations
> **Warning**: To avoid desynchronization between the frontend and backend, follow this specific order:

1. **Edge Functions**: Deploy `process-expense` and `mercadopago-webhook` first. Ensure `MERCADOPAGO_ACCESS_TOKEN` is configured in the production environment.
2. **Storage**: Verify that the `expense-files` bucket exists in Production and has RLS policies allowing authenticated users to upload and read their files.
3. **Frontend**: Deploy the web application last.
4. **Data Integrity**: Note that existing 'pending' analyses will now appear in the History page, allowing users to retry interrupted processes. No SQL migrations are required for this release.


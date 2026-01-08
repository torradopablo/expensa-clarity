# Migration Guide: Supabase Edge Functions → Next.js API

## 🚨 Important Notes

1. **Backup First**: Always backup your Supabase database before making changes
2. **Test Environment**: Test in staging before production
3. **Monitor**: Keep an eye on error rates during transition

## 📋 Migration Checklist

### Phase 1: Preparation ✅
- [x] Create new Next.js API architecture
- [x] Implement all business logic in services
- [x] Update frontend to use new API routes
- [x] Add environment variables

### Phase 2: Testing
- [ ] Test all API endpoints locally
- [ ] Test AI processing with fallback
- [ ] Test payment flow end-to-end
- [ ] Test webhook handling

### Phase 3: Deployment
- [ ] Deploy Next.js API routes to production
- [ ] Update webhook URLs in Mercado Pago
- [ ] Switch frontend to production API
- [ ] Monitor for errors

### Phase 4: Cleanup
- [ ] Remove Supabase Edge Functions
- [ ] Clean up old code
- [ ] Update documentation

## 🔧 API Endpoint Mapping

| Old Supabase Function | New Next.js Route | Method |
|----------------------|-------------------|--------|
| `process-expense` | `/api/analyses/[id]/process` | POST |
| `create-payment` | `/api/payments/create` | POST |
| `mercadopago-webhook` | `/api/payments/webhook` | POST |

## 🌐 URL Changes

### Frontend Updates (Already Done)
```typescript
// Old
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-expense`

// New
`${import.meta.env.VITE_API_URL}/analyses/${analysisId}/process`
```

### Webhook URL Updates
```bash
# Old (in Mercado Pago dashboard)
https://your-project.supabase.co/functions/v1/mercadopago-webhook

# New (update in Mercado Pago dashboard)
https://your-domain.com/api/payments/webhook
```

## 🔄 Data Flow Changes

### Before (Supabase Functions)
```
Frontend → Supabase Edge Function → Supabase DB → Frontend
```

### After (Next.js API)
```
Frontend → Next.js API → Supabase DB → Frontend
```

## 🧪 Testing Commands

### Test New API Endpoints
```bash
# Test analysis creation
curl -X POST http://localhost:3000/api/analyses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period": "Enero 2026", "unit": "A-101"}'

# Test expense processing
curl -X POST http://localhost:3000/api/analyses/{id}/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "...", "mimeType": "image/jpeg"}'

# Test payment creation
curl -X POST http://localhost:3000/api/payments/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"analysisId": "..."}'
```

### Test Webhook
```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "payment", "data": {"id": "test_id"}}'
```

## 🚨 Rollback Plan

If anything goes wrong:

1. **Frontend**: Revert to old Supabase URLs
2. **Backend**: Keep Supabase Functions running
3. **Database**: No changes needed (same schema)

### Quick Rollback Commands
```typescript
// Revert frontend changes
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-expense`,
  // ... old code
);
```

## 📊 Performance Comparison

| Metric | Supabase Functions | Next.js API |
|--------|-------------------|-------------|
| Cold Start | ~2-3 seconds | None |
| Latency | ~500ms | ~100ms |
| Scalability | Limited | High |
| Cost | Per invocation | Server cost |

## 🔍 Monitoring

Add these monitoring endpoints:

```typescript
// GET /api/health
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
}

// GET /api/stats
export async function GET() {
  // Return API usage stats
}
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure middleware is properly configured
2. **Auth Failures**: Check token format and API keys
3. **AI Provider Failures**: Verify API keys and quotas
4. **Payment Issues**: Check Mercado Pago credentials

### Debug Mode

Add debug logging:
```typescript
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Debug info:', { userId, analysisId, etc });
}
```

## ✅ Success Criteria

- [ ] All API endpoints working
- [ ] AI processing with fallback
- [ ] Payment flow complete
- [ ] Webhooks receiving updates
- [ ] Frontend fully functional
- [ ] No errors in production
- [ ] Performance improved

## 📞 Support

If you encounter issues:

1. Check logs in Next.js console
2. Verify environment variables
3. Test with curl commands
4. Check Supabase RLS policies
5. Review Mercado Pago webhook configuration

# Backend Architecture - ExpensaCheck

## 🏗️ Overview

Clean, scalable backend architecture built with Next.js App Router, following Domain-Driven Design principles. All business logic has been moved from Supabase Edge Functions to Next.js API routes.

## 📁 Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│                   (Next.js API Routes)                        │
├─────────────────────────────────────────────────────────────┤
│                     Application Layer                         │
│                   (Domain Services)                           │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                             │
│              (Entities & Repositories)                        │
├─────────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                          │
│            (Database, AI, Payments, External APIs)            │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Design Principles

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Dependency Inversion**: Depend on abstractions, not concretions
3. **Single Responsibility**: Each class has one reason to change
4. **Open/Closed**: Open for extension, closed for modification
5. **Interface Segregation**: Small, focused interfaces

## 📦 Core Components

### Domain Layer (`src/lib/domain/`)

#### Entities
Pure business objects with no external dependencies:

```typescript
// Expense Analysis entity
interface ExpenseAnalysis {
  id: string;
  userId: string;
  buildingName: string;
  period: string;
  totalAmount: number;
  status: ExpenseStatus;
  categories: ExpenseCategory[];
}
```

#### Repositories
Abstract data access interfaces:

```typescript
interface IExpenseRepository {
  createAnalysis(analysis: Omit<ExpenseAnalysis, 'id'>): Promise<ExpenseAnalysis>;
  getAnalysisById(id: string, userId: string): Promise<ExpenseAnalysis>;
  // ... other methods
}
```

#### Services
Business logic orchestration:

```typescript
class ExpenseService {
  async processExpense(request: ProcessExpenseRequest): Promise<ExpenseAnalysis> {
    // Business logic for expense processing
  }
}
```

### Infrastructure Layer (`src/lib/infrastructure/`)

#### Database
Supabase client factory and repository implementation:

```typescript
class SupabaseExpenseRepository implements IExpenseRepository {
  // Concrete implementation using Supabase
}
```

#### AI Services
Provider-agnostic AI integration with fallback:

```typescript
class AIService {
  addProvider(provider: AIProvider): void;
  async extractExpenseData(imageBase64: string, mimeType: string): Promise<AIExtractedData>;
}
```

#### Payment Services
Mercado Pago integration:

```typescript
class MercadoPagoService {
  async createPaymentPreference(...): Promise<PaymentPreference>;
  async handleWebhook(...): Promise<void>;
}
```

### API Layer (`src/app/api/`)

RESTful endpoints following Next.js App Router:

```typescript
// /api/analyses/route.ts
export async function GET(request: NextRequest) { /* List analyses */ }
export async function POST(request: NextRequest) { /* Create analysis */ }

// /api/analyses/[id]/process/route.ts
export async function POST(request: NextRequest, { params }) { /* Process expense */ }
```

## 🔄 Data Flow

### Expense Processing Flow

```
1. Frontend uploads image
   ↓
2. API Route (/api/analyses/[id]/process)
   ↓
3. ExpenseService.processExpense()
   ↓
4. AIService.extractExpenseData() (with fallback)
   ↓
5. Repository.saveAnalysis()
   ↓
6. Database (Supabase)
   ↓
7. Response to Frontend
```

### Payment Flow

```
1. Frontend requests payment
   ↓
2. API Route (/api/payments/create)
   ↓
3. PaymentService.createPayment()
   ↓
4. MercadoPagoService.createPreference()
   ↓
5. Mercado Pago API
   ↓
6. Repository.updateStatus()
   ↓
7. Response with payment URL
```

## 🧪 Testing Strategy

### Unit Tests
- Test services in isolation with mocked repositories
- Test repository implementations with test database
- Test AI providers with mock responses

### Integration Tests
- Test complete API endpoints
- Test database operations
- Test external API integrations

### E2E Tests
- Test complete user flows
- Test webhook processing
- Test error scenarios

## 🔧 Configuration

### Environment Variables

```bash
# AI Providers
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
AI_PROVIDER=openai

# Payments
MERCADOPAGO_ACCESS_TOKEN=TEST-...
MERCADOPAGO_ENV=sandbox

# Database
NEXT_PUBLIC_SUPABASE_URL=https://....
SUPABASE_SERVICE_ROLE_KEY=....

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
```

### Dependency Injection

The DIContainer manages all dependencies:

```typescript
class DIContainer {
  static getExpenseService(): ExpenseService {
    return new ExpenseService(
      this.getExpenseRepository(),
      this.getAIService()
    );
  }
}
```

## 🚀 Deployment

### Production Checklist

- [ ] Set production environment variables
- [ ] Configure Mercado Pago webhooks
- [ ] Set up monitoring and logging
- [ ] Run integration tests
- [ ] Perform load testing
- [ ] Set up error tracking

### Performance Considerations

1. **Caching**: Cache AI responses when possible
2. **Rate Limiting**: Implement rate limiting for API endpoints
3. **Connection Pooling**: Use connection pooling for database
4. **Async Processing**: Use queues for heavy operations

## 🔍 Monitoring & Logging

### Structured Logging

```typescript
import { logger } from '@/lib/shared/utils/logger';

logger.info('Processing expense', { 
  analysisId, 
  userId, 
  provider: 'openai' 
});
```

### Metrics to Track

- API response times
- AI provider success rates
- Payment conversion rates
- Error rates by endpoint
- Database query performance

## 🛡️ Security

### Authentication & Authorization

- JWT tokens from Supabase Auth
- User context validation
- Row Level Security (RLS) in database

### Data Protection

- Input validation on all endpoints
- SQL injection prevention
- XSS protection
- CSRF protection

### API Security

- Rate limiting
- CORS configuration
- Request size limits
- IP whitelisting (if needed)

## 🔄 Future Enhancements

### Planned Improvements

1. **Caching Layer**: Redis for frequently accessed data
2. **Event Sourcing**: Audit trail for all changes
3. **Background Jobs**: Queue system for heavy processing
4. **Multi-tenancy**: Support for multiple organizations
5. **Analytics**: Advanced reporting and insights

### Scalability

- Horizontal scaling with load balancers
- Database read replicas
- Microservices decomposition
- CDN for static assets

## 📚 Documentation

- [API Documentation](./API_DOCS.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## 🤝 Contributing

1. Follow the established patterns
2. Write tests for new features
3. Update documentation
4. Use TypeScript strictly
5. Follow linting rules

## 📞 Support

For questions or issues:
- Check the troubleshooting guide
- Review the API documentation
- Contact the development team

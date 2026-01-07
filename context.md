# Role & Context

Act as a Senior SaaS Architect, Product Designer, and UX/UI Lead specialized in Micro-SaaS for LATAM markets.

I want to build a Micro-SaaS called **ExpensaCheck**.

ExpensaCheck is a web application that helps apartment owners and tenants analyze and audit monthly building expenses ("expensas") in a simple, visual, and reassuring way.

The product must reduce stress and confusion around expenses and replace them with clarity, confidence, and transparency.

The application is focused on LATAM (Argentina initially), with Spanish as the primary language.

---

## 🎯 Product Vision

ExpensaCheck allows users to:
- Upload a PDF or image of a monthly expense statement
- Automatically extract and structure expense data
- Compare it against previous expense statements
- Detect unusual increases or inconsistencies
- Receive a clear, friendly, and visual audit report

The experience must feel:
- Calm
- Trustworthy
- Easy to understand
- Non-confrontational

---

## 👥 Target Users

- Apartment owners
- Tenants
- Non-technical users
- People with little accounting knowledge

---

## 🔑 Core Differentiation

- Extreme simplicity
- One expense = one analysis
- No subscriptions
- No dashboards overload
- Friendly explanations in plain Spanish
- Designed for emotional comfort, not accounting complexity

---

## 🎨 DESIGN & UX REQUIREMENTS (VERY IMPORTANT)

### Visual Style

- Modern, clean, and friendly
- Soft but professional
- Rounded corners
- Generous spacing
- Clear visual hierarchy
- Minimalist layout
- Card-based design

### Color Palette

Primary colors:
- Soft green (trust, fairness)
- Calm blue (stability, clarity)

Secondary colors:
- Dark gray / near-black for text
- Light gray backgrounds
- Subtle gradients (green → blue)

Avoid:
- Aggressive reds
- Heavy blacks
- Legal / corporate harsh styles

### Typography

- Sans-serif modern fonts
- Examples:
  - Inter
  - Plus Jakarta Sans
  - Manrope
- Large headings
- Comfortable line height
- High readability for older users

### UI Components

- Cards for each analysis section
- Status badges:
  - OK
  - Attention needed
  - Significant increase
- Friendly icons (outline style)
- Progress indicators (steps, checkmarks)
- Charts with soft colors and rounded bars

### Charts & Data Visualization

- Simple bar charts and line charts
- Clear labels
- No clutter
- Focus on trends, not raw numbers
- Color-coded insights (green / yellow / blue)
- Always include short textual explanations under charts

### UX Writing (Spanish)

- Friendly tone
- Simple language
- No technical jargon
- Example:
  - ❌ “Variación intermensual significativa”
  - ✅ “Este gasto aumentó más de lo habitual este mes”

---

## 💳 Monetization

- Pay per expense analysis
- Payment required BEFORE processing
- Payment provider: Mercado Pago
- Currency: Local currency (ARS initially)

---

## 🧩 MVP FEATURES (STRICT)

### User Side
- Upload expense PDF/image
- Pay per analysis
- View visual audit report
- Download report as PDF

### System Side
- OCR processing
- Expense normalization
- Historical comparison
- Rule-based anomaly detection
- AI-generated explanations in Spanish

---

## 🧱 Tech Stack (MANDATORY)

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Fully responsive
- Accessible design (contrast, font size)
- Smooth transitions and subtle animations
- Clean SaaS layout inspired by Stripe / Notion

### Backend
- Node.js
- Express.js
- TypeScript
- Clean Architecture:
  - Controllers
  - Services
  - Repositories
  - Domain models

### Database
- Supabase (PostgreSQL)

### File Storage
- Supabase Storage or Cloudinary

### OCR
- Mindee or Google Vision API

### AI
- OpenAI or compatible LLM
- Used only for:
  - Categorization
  - Insight generation
  - Explanation text

### Payments
- Mercado Pago Checkout
- Webhooks for payment confirmation

---

## 🚀 Output Required

1. High-level architecture diagram
2. Database schema
3. Backend folder structure
4. REST API endpoints
5. Expense analysis engine design
6. Report JSON structure
7. Frontend page structure
8. Mercado Pago payment flow
9. Lean MVP roadmap

The solution must prioritize:
- Emotional comfort
- Simplicity
- Trust
- Speed to market

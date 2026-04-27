# ExamFlow — Phase 3 & Phase 4 Coding Prompts

> Yêu cầu: Phase 1 + Phase 2 đã hoàn thành và deploy.  
> Context dùng cho AI: "Project ExamFlow — monorepo NestJS + Next.js + PostgreSQL + Prisma + Redis. Phase 1 + 2 đã xong. Đang build Phase 3/4."

---

# PHASE 3 — Monetize: Subscription + Marketplace

> Mục tiêu: Doanh thu đầu tiên. Chỉ build khi đã có người dùng thật từ Phase 1–2.

---

## PROMPT 3.1 — Subscription System (Backend)

**Context:** Phase 1 + 2 đã xong. User model có field `plan: Plan`. Cần xây dựng hệ thống subscription với Stripe + VNPay.

### 1. Migration: Bảng billing

```prisma
model Plan {
  id          String   @id @default(uuid())
  name        String   @unique   // "free" | "pro_teacher" | "org_basic" | "org_pro"
  displayName String
  price       Float               // USD, 0 = miễn phí
  priceVND    Int                 // VND
  interval    String              // "month" | "year"
  stripePriceId String?           // Stripe Price ID
  features    Json                // { maxExams, maxQuestions, aiGeneratePerHour, ... }
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
}

model Subscription {
  id                  String             @id @default(uuid())
  userId              String?
  user                User?              @relation(fields: [userId], references: [id])
  organizationId      String?
  organization        Organization?      @relation(fields: [organizationId], references: [id])
  planId              String
  plan                Plan               @relation(fields: [planId], references: [id])
  status              SubscriptionStatus @default(ACTIVE)
  stripeSubscriptionId String?           @unique
  stripeCustomerId    String?
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  cancelAtPeriodEnd   Boolean            @default(false)
  canceledAt          DateTime?
  trialEndsAt         DateTime?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  invoices Invoice[]

  @@index([userId])
  @@index([organizationId])
  @@index([status])
}

model Invoice {
  id              String        @id @default(uuid())
  subscriptionId  String
  subscription    Subscription  @relation(fields: [subscriptionId], references: [id])
  stripeInvoiceId String?       @unique
  vnpayTxnRef     String?       @unique
  amount          Float
  currency        String        @default("USD")
  amountVND       Int?
  status          InvoiceStatus @default(PENDING)
  paymentMethod   String?       // "stripe" | "vnpay" | "momo"
  paidAt          DateTime?
  hostedUrl       String?       // Stripe invoice URL
  createdAt       DateTime      @default(now())
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

enum InvoiceStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}
```

Chạy: `npx prisma migrate dev --name add_billing`

### 2. Plan Config (features field)

```typescript
// Free Teacher
{
  maxExams: 5,
  maxQuestions: 50,
  maxAttemptPerExam: 30,
  aiGeneratePerHour: 3,
  analytics: "basic",
  marketplace: false,
  antiCheat: "basic"
}

// Pro Teacher ($9.99/tháng)
{
  maxExams: -1,           // unlimited
  maxQuestions: -1,
  maxAttemptPerExam: -1,
  aiGeneratePerHour: 30,
  analytics: "advanced",
  marketplace: true,
  antiCheat: "advanced",
  parentDashboard: true
}

// Org Basic ($29.99/tháng, đến 5 giáo viên)
{
  maxTeachers: 5,
  maxStudents: 200,
  maxExams: -1,
  maxQuestions: -1,
  aiGeneratePerHour: 100,
  analytics: "advanced",
  marketplace: false,
  antiCheat: "advanced",
  customBranding: false
}

// Org Pro ($79.99/tháng, đến 20 giáo viên)
{
  maxTeachers: 20,
  maxStudents: 1000,
  aiGeneratePerHour: 500,
  analytics: "advanced",
  marketplace: false,
  antiCheat: "advanced",
  customBranding: true,
  prioritySupport: true
}
```

### 3. Subscription Service (src/billing/subscription.service.ts)

`getActivePlan(userId: string)`:
- Tìm subscription ACTIVE hoặc TRIALING của user/org
- Trả về Plan features
- Cache Redis 5 phút: key `plan:{userId}`
- Nếu không có subscription → trả về Free plan mặc định

`checkFeatureAccess(userId: string, feature: string, value?: number)`:
- Lấy plan của user
- So sánh với plan.features
- VD: `checkFeatureAccess(userId, 'maxExams')` → check số exam hiện tại vs giới hạn
- Return: `{ allowed: boolean, limit: number, current: number, upgradeRequired: Plan | null }`

`createSubscription(userId: string, planId: string, paymentMethod: 'stripe' | 'vnpay')`:
- Tạo Stripe Customer nếu chưa có
- Tạo Stripe Subscription với trial 14 ngày
- Lưu vào DB
- Invalidate cache
- Gửi welcome email

`cancelSubscription(userId: string)`:
- Gọi Stripe để cancel at period end
- Update `cancelAtPeriodEnd=true`
- User vẫn dùng được đến hết kỳ

`reactivateSubscription(userId: string)`:
- Nếu `cancelAtPeriodEnd=true` → gọi Stripe để uncancel

`getInvoices(userId: string)`:
- Trả về danh sách hóa đơn, phân trang

### 4. Stripe Webhook Handler (src/billing/stripe-webhook.controller.ts)

POST `/billing/webhook/stripe` — không cần auth, verify Stripe signature:

Xử lý các events:
- `customer.subscription.updated` → update subscription status, period
- `customer.subscription.deleted` → set status=CANCELED
- `invoice.payment_succeeded` → update Invoice status=PAID, paidAt
- `invoice.payment_failed` → update Invoice status=FAILED, gửi email thông báo
- `customer.subscription.trial_will_end` → gửi email nhắc nhở (3 ngày trước)

Luôn return HTTP 200 ngay cả khi xử lý lỗi (Stripe sẽ retry nếu nhận non-200).

### 5. VNPay Integration (src/billing/vnpay.service.ts)

Dùng thư viện `vnpay` (npm package).

`createPaymentUrl(userId: string, planId: string, amount: number)`:
- Tạo Invoice PENDING trong DB
- Tạo VNPay payment URL với `vnp_TxnRef = invoiceId`
- Return URL để redirect frontend

`verifyReturn(query: VNPayReturnQuery)`:
- Verify checksum
- Nếu hợp lệ: update Invoice status=PAID → trigger subscription activation
- Redirect về frontend success/fail page

POST `/billing/webhook/vnpay` — IPN endpoint:
- Verify signature
- Update Invoice và Subscription status
- Return `{ RspCode: '00', Message: 'Confirm Success' }`

### 6. Feature Gate Middleware (src/billing/feature-gate.guard.ts)

Tạo decorator `@RequireFeature(feature: string, errorMessage?: string)`:

```typescript
// Dùng trong controller
@Post()
@RequireFeature('marketplace', 'Nâng cấp lên Pro để bán đề thi')
async publishToMarketplace() {}
```

Guard kiểm tra plan của user, throw `PaymentRequiredException` (HTTP 402) với body:

```json
{
  "success": false,
  "error": {
    "code": "UPGRADE_REQUIRED",
    "message": "Nâng cấp lên Pro để bán đề thi",
    "requiredPlan": "pro_teacher",
    "upgradeUrl": "/billing/upgrade"
  }
}
```

### 7. Billing Controller (src/billing/billing.controller.ts)

- `GET /billing/plans` — danh sách plans (public, không cần auth)
- `GET /billing/my-subscription` — subscription hiện tại (JwtAuthGuard)
- `GET /billing/invoices` — lịch sử hóa đơn
- `POST /billing/subscribe` — Body: `{ planId, paymentMethod }` → tạo subscription
- `POST /billing/cancel` — hủy subscription
- `POST /billing/reactivate` — khôi phục subscription
- `GET /billing/usage` — thống kê usage vs limits
- `POST /billing/checkout/stripe` — tạo Stripe Checkout Session URL
- `POST /billing/checkout/vnpay` — tạo VNPay payment URL
- `GET /billing/vnpay/return` — VNPay return URL (GET, redirect từ VNPay)

---

## PROMPT 3.2 — Subscription System (Frontend)

**Context:** Subscription backend (Prompt 3.1) đã xong.

### 1. Pricing Page (app/(public)/pricing/page.tsx)

Layout 3 cột cho 3 gói chính:

```
┌──────────────┬──────────────────┬──────────────┐
│     FREE     │    PRO TEACHER   │  ORG BASIC   │
│              │  ⭐ PHỔ BIẾN     │              │
│   0đ/tháng  │  199k/tháng      │  599k/tháng  │
│              │                  │              │
│  ✓ 5 đề thi │  ✓ Không giới    │  ✓ 5 GV      │
│  ✓ 50 câu   │    hạn đề thi    │  ✓ 200 HS    │
│  ✗ AI       │  ✓ AI 30 lần/h  │  ✓ Analytics │
│  ✗ Sell     │  ✓ Bán đề thi   │  ✓ Branding  │
│             │  ✓ Analytics     │              │
│ [Dùng miễn │  [Dùng thử 14    │ [Liên hệ]   │
│   phí]      │    ngày miễn phí]│              │
└──────────────┴──────────────────┴──────────────┘
```

- Toggle Monthly / Yearly (yearly = giảm 20%)
- FAQ section phía dưới

### 2. Billing Dashboard (app/(teacher)/billing/page.tsx)

Tabs: Gói hiện tại / Lịch sử hóa đơn / Phương thức thanh toán

**Tab Gói hiện tại:**

Nếu Free:
```
┌──────────────────────────────────────────────┐
│  Gói hiện tại: FREE                          │
│                                              │
│  Usage:                                      │
│  📝 Đề thi: 3/5     ████░░░░░░  60%         │
│  ❓ Câu hỏi: 34/50  ██████░░░░  68%         │
│  🤖 AI: 2/3 giờ này ██████░░░░  67%         │
│                                              │
│  [Nâng cấp lên Pro →]                       │
└──────────────────────────────────────────────┘
```

Nếu Pro:
```
┌──────────────────────────────────────────────┐
│  Gói hiện tại: PRO TEACHER ✓                 │
│  Chu kỳ: 01/05/2025 – 01/06/2025            │
│  Tự động gia hạn: Có                        │
│                                              │
│  [Xem hóa đơn] [Hủy gói]                   │
└──────────────────────────────────────────────┘
```

**Tab Lịch sử hóa đơn:**
Table: Ngày, Gói, Số tiền, Trạng thái, Link tải PDF

### 3. Checkout Flow

Khi click "Nâng cấp":

Bước 1 — Chọn phương thức thanh toán:
- Stripe (thẻ quốc tế) → redirect sang Stripe Checkout
- VNPay (ATM/Internet Banking) → redirect sang VNPay
- MoMo (bổ sung sau)

Bước 2a (Stripe): Redirect sang Stripe Checkout URL → Stripe xử lý → redirect về `/billing/success?session_id=...`

Bước 2b (VNPay): Redirect sang VNPay URL → user thanh toán → VNPay redirect về `/billing/vnpay/return`

Trang Success: confetti animation + "Chào mừng bạn đến với Pro! 🎉" + list features đã unlock.

### 4. Upgrade Prompt Component (components/billing/UpgradePrompt.tsx)

Component tái sử dụng, hiện khi user gặp feature bị giới hạn:

```
┌────────────────────────────────────────────┐
│  🔒 Tính năng này yêu cầu gói Pro          │
│                                            │
│  Nâng cấp để:                              │
│  • Bán đề thi trên marketplace             │
│  • Sinh câu hỏi AI không giới hạn         │
│  • Analytics nâng cao                      │
│                                            │
│  [Dùng thử 14 ngày miễn phí →]            │
└────────────────────────────────────────────┘
```

Dùng trong:
- AI Generator: khi hết giới hạn
- Marketplace: khi cố publish đề thi
- Analytics nâng cao: khi cố xem advanced stats

### 5. Usage Bar Component (components/billing/UsageBar.tsx)

```typescript
interface UsageBarProps {
  label: string
  current: number
  limit: number   // -1 = unlimited
  icon: string
}
```

- Nếu limit = -1: hiện "∞ Không giới hạn" màu xanh
- Nếu >= 90%: thanh màu đỏ + warning
- Nếu >= 70%: thanh màu cam
- Dưới 70%: thanh màu xanh

---

## PROMPT 3.3 — Marketplace (Backend)

**Context:** Billing system đã xong. Cần xây dựng marketplace cho phép giáo viên bán đề thi và tài liệu.

### 1. Migration: Marketplace tables

```prisma
model MarketplaceItem {
  id             String          @id @default(uuid())
  sellerId       String
  seller         User            @relation("Seller", fields: [sellerId], references: [id])
  type           MarketplaceType // EXAM | DOCUMENT
  title          String
  description    String
  previewContent String?         // preview miễn phí (JSON)
  price          Float           // USD
  priceVND       Int
  currency       String          @default("USD")
  examId         String?         @unique
  exam           Exam?           @relation(fields: [examId], references: [id])
  documentUrl    String?         // S3/R2 URL cho PDF
  thumbnailUrl   String?
  tags           String[]
  subject        String?         // Toán, Lý, Hóa...
  gradeLevel     String?         // Lớp 10, Lớp 11...
  status         ItemStatus      @default(PENDING_REVIEW)
  totalSales     Int             @default(0)
  totalRevenue   Float           @default(0)
  averageRating  Float?
  reviewCount    Int             @default(0)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  purchases MarketplacePurchase[]
  reviews   MarketplaceReview[]

  @@index([sellerId])
  @@index([type])
  @@index([status])
  @@index([tags])
  @@index([subject, gradeLevel])
}

model MarketplacePurchase {
  id          String           @id @default(uuid())
  buyerId     String
  buyer       User             @relation("Buyer", fields: [buyerId], references: [id])
  itemId      String
  item        MarketplaceItem  @relation(fields: [itemId], references: [id])
  price       Float
  priceVND    Int?
  platformFee Float            // 30% của price
  sellerEarning Float          // 70% của price
  invoiceId   String?
  purchasedAt DateTime         @default(now())

  @@unique([buyerId, itemId])
  @@index([buyerId])
  @@index([itemId])
}

model MarketplaceReview {
  id        String          @id @default(uuid())
  reviewerId String
  reviewer  User            @relation(fields: [reviewerId], references: [id])
  itemId    String
  item      MarketplaceItem @relation(fields: [itemId], references: [id])
  rating    Int             // 1-5
  comment   String?
  createdAt DateTime        @default(now())

  @@unique([reviewerId, itemId])
}

model SellerPayout {
  id          String       @id @default(uuid())
  sellerId    String
  seller      User         @relation(fields: [sellerId], references: [id])
  amount      Float
  currency    String       @default("USD")
  status      PayoutStatus @default(PENDING)
  method      String?      // "bank_transfer" | "momo"
  bankAccount Json?        // encrypted bank info
  processedAt DateTime?
  createdAt   DateTime     @default(now())
}

enum MarketplaceType {
  EXAM
  DOCUMENT
}

enum ItemStatus {
  DRAFT
  PENDING_REVIEW   // chờ admin duyệt
  PUBLISHED
  REJECTED
  ARCHIVED
}

enum PayoutStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### 2. Marketplace Service (src/marketplace/marketplace.service.ts)

`publishExamToMarketplace(sellerId, dto)`:
- Validate: seller có plan Pro (`checkFeatureAccess(sellerId, 'marketplace')`)
- Validate: exam tồn tại, thuộc seller, status=PUBLISHED
- Tạo MarketplaceItem với status=PENDING_REVIEW
- Kèm theo stats thực tế của đề thi: tổng lượt làm, điểm trung bình (đây là USP)

`uploadDocument(sellerId, file, dto)`:
- Upload file lên Cloudflare R2 (hoặc S3)
- Tạo MarketplaceItem type=DOCUMENT
- Tạo preview (200 ký tự đầu cho text, page 1 thumbnail cho PDF)

`searchItems(query)`:
```typescript
interface SearchQuery {
  keyword?: string
  type?: MarketplaceType
  subject?: string
  gradeLevel?: string
  tags?: string[]
  minPrice?: number
  maxPrice?: number
  sortBy?: 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc'
  page?: number
  limit?: number
}
```
Full-text search trên title + description + tags dùng PostgreSQL `to_tsvector`.

`getItemDetail(itemId, viewerId?)`:
- Trả về item đầy đủ
- Nếu viewerId đã mua → trả về full content (accessCode cho exam, document URL cho tài liệu)
- Nếu chưa mua → trả về preview + stats (totalSales, averageRating, exam stats: lượt làm, điểm TB, độ khó thực tế)

`purchaseItem(buyerId, itemId)`:
- Validate: chưa mua trước đó
- Tạo Invoice → tích hợp payment (Stripe hoặc VNPay)
- Sau khi thanh toán xong (webhook):
  - Tạo MarketplacePurchase
  - Platform fee = 30%, seller earning = 70%
  - Cộng vào seller's pending payout balance

`getMyPurchases(userId)`:
- Danh sách đã mua với link truy cập content

`getMyListings(sellerId)`:
- Danh sách item đang bán kèm stats: doanh thu, lượt mua, rating

`getEarnings(sellerId)`:
```typescript
{
  totalEarnings: number,
  pendingPayout: number,
  paidOut: number,
  thisMonthEarnings: number,
  salesHistory: Array<{ date, amount, itemTitle }>,
  topItems: Array<{ itemId, title, sales, revenue }>
}
```

`submitReview(buyerId, itemId, rating, comment)`:
- Chỉ buyer đã mua mới được review
- Sau khi review: re-calculate averageRating của item

`requestPayout(sellerId, amount, method, bankInfo)`:
- Minimum payout: $10
- Tạo SellerPayout record
- Notify admin để xử lý thủ công (Phase 3) hoặc tự động (Phase 4)

### 3. Marketplace Controller

- `POST /marketplace/items/exam` — publish exam (RequireFeature: marketplace)
- `POST /marketplace/items/document` — upload document (multipart, RequireFeature: marketplace)
- `GET /marketplace/items` — search/browse (public)
- `GET /marketplace/items/:id` — chi tiết item (public, nhưng check mua chưa nếu authed)
- `POST /marketplace/items/:id/purchase` — mua item (JwtAuthGuard)
- `GET /marketplace/my/purchases` — đã mua (JwtAuthGuard)
- `GET /marketplace/my/listings` — đang bán (JwtAuthGuard, TEACHER+)
- `GET /marketplace/my/earnings` — doanh thu (JwtAuthGuard, TEACHER+)
- `POST /marketplace/items/:id/reviews` — đánh giá (JwtAuthGuard)
- `GET /marketplace/items/:id/reviews` — xem đánh giá (public)
- `POST /marketplace/payouts/request` — yêu cầu rút tiền (JwtAuthGuard, TEACHER+)
- `PATCH /marketplace/items/:id` — sửa listing (JwtAuthGuard, owner only)
- `DELETE /marketplace/items/:id` — xoá listing

### 4. File Storage Service (src/storage/storage.service.ts)

Dùng Cloudflare R2 (S3-compatible, rẻ hơn AWS S3):

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Methods:
- `uploadFile(key, buffer, mimeType)` → trả về public URL
- `getPresignedUrl(key, expiresIn)` → URL tạm thời để download
- `deleteFile(key)`
- `getPublicUrl(key)` → URL public (cho thumbnail)

Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

---

## PROMPT 3.4 — Marketplace (Frontend)

**Context:** Marketplace backend (Prompt 3.3) đã xong.

### 1. Marketplace Browse Page (app/(public)/marketplace/page.tsx)

Layout:

```
┌─────────────────────────────────────────────────────┐
│  🛒 Marketplace Đề Thi & Tài Liệu                   │
│                                                     │
│  [🔍 Tìm kiếm...]  [Môn học ▼] [Lớp ▼] [Loại ▼]  │
│  Sắp xếp: [Mới nhất ▼]                   X kết quả │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ [thumb]  │ │ [thumb]  │ │ [thumb]  │            │
│  │ Đề Thi   │ │ Tài liệu │ │ Đề Thi   │            │
│  │ Toán 12  │ │ Lý 11    │ │ Hóa 10   │            │
│  │ ⭐ 4.8   │ │ ⭐ 4.5   │ │ ⭐ 4.2   │            │
│  │ 234 lượt │ │ 89 lượt  │ │ 56 lượt  │            │
│  │ 29,000đ  │ │ 15,000đ  │ │ 25,000đ  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────┘
```

Item Card hiển thị:
- Thumbnail / icon theo môn học
- Badge loại: "Đề thi" (xanh) / "Tài liệu" (cam)
- Tiêu đề (truncate 2 dòng)
- Rating ⭐ + số đánh giá
- Số lượt mua
- **Exam stats (USP):** "24 câu · 1,240 lượt làm · ĐTB: 72%"
- Giá (VND)
- Avatar + tên người bán

Infinite scroll hoặc pagination.

### 2. Item Detail Page (app/(public)/marketplace/[id]/page.tsx)

Layout 2 cột:

**Cột trái (60%):**
- Thumbnail lớn
- Tiêu đề + badge loại
- Tags: môn học, lớp, chủ đề
- Mô tả đầy đủ
- Preview (nếu có): 3 câu hỏi đầu ẩn đáp án
- Đánh giá từ người mua (list reviews với avatar, rating, comment)

**Cột phải (40%) — Sticky:**

```
┌─────────────────────────────────┐
│  29,000đ                        │
│                                 │
│  📊 Stats đề thi:               │
│  • 24 câu hỏi                   │
│  • 1,240 lượt làm               │
│  • Điểm TB: 72%                 │
│  • Độ khó thực tế: Trung bình   │
│                                 │
│  👤 Người bán: [avatar] Tên GV  │
│  ⭐ Rating: 4.8 (124 đánh giá)  │
│                                 │
│  [  Mua ngay — 29,000đ  ]      │
│  [  Thêm vào giỏ hàng   ]      │
│                                 │
│  ✅ Truy cập ngay sau khi mua   │
│  ✅ Hoàn tiền nếu không dùng   │
│     được trong 7 ngày           │
└─────────────────────────────────┘
```

Nếu đã mua: Hiện nút "Vào thi ngay" (exam) hoặc "Tải xuống" (document) thay thế.

### 3. Seller Dashboard (app/(teacher)/marketplace/page.tsx)

Tabs: Đang bán / Doanh thu / Đăng bán mới

**Tab Đang bán:**
- Table: Tiêu đề, Loại, Trạng thái, Lượt mua, Doanh thu, Rating, Actions
- Status badge: Draft (xám) / Chờ duyệt (vàng) / Đang bán (xanh) / Bị từ chối (đỏ)
- Action: Sửa, Ẩn, Xoá

**Tab Doanh thu:**

Stats cards: Tổng doanh thu / Chưa rút / Đã rút / Tháng này

Biểu đồ doanh thu 30 ngày (Recharts LineChart).

Nút "Yêu cầu rút tiền" (chỉ active khi balance >= $10):
- Modal: nhập số tiền + phương thức (Bank transfer / MoMo)
- Lưu ý: xử lý trong 3-5 ngày làm việc

**Tab Đăng bán mới:**
Wizard 3 bước:

Bước 1 — Chọn loại: "Đề thi" hoặc "Tài liệu PDF"

Bước 2 (Đề thi):
- Dropdown chọn từ danh sách exam đã publish
- Hiện stats của exam: tổng lượt làm, điểm TB, tổng câu
- Nhập giá (VND, min 5,000đ)
- Textarea mô tả (bắt buộc)
- Tags: môn học, lớp, chủ đề
- Chọn preview: tối đa 3 câu hiển thị miễn phí

Bước 2 (Tài liệu):
- Upload file PDF (max 20MB)
- Upload thumbnail (tùy chọn)
- Nhập tiêu đề, mô tả, giá, tags

Bước 3: Xem trước listing + submit

### 4. My Purchases Page (app/(student)/purchases/page.tsx)

Grid các item đã mua:
- Thumbnail + tiêu đề
- Ngày mua + giá đã trả
- Action: "Vào thi" (exam) hoặc "Tải xuống" (document)
- Nút "Viết đánh giá" nếu chưa đánh giá

---

## PROMPT 3.5 — Landing Page + SEO

**Context:** Toàn bộ Phase 3 backend + frontend đã xong. Cần landing page để thu hút người dùng organic.

### 1. Landing Page (app/(public)/page.tsx)

Sections theo thứ tự:

**Hero Section:**
- Headline lớn: "Tạo bài thi online chuyên nghiệp trong 5 phút"
- Subheadline: "Nền tảng dạy học và kiểm tra thông minh cho giáo viên Việt Nam"
- 2 CTA buttons: "Bắt đầu miễn phí" + "Xem demo"
- Hero image/mockup của giao diện

**Social Proof:**
- "Đã có X giáo viên và Y học sinh tin dùng" (số thật từ DB)
- 3 avatar giáo viên + quote ngắn

**Features Section:**
3 columns, mỗi cột 1 nhóm tính năng chính với icon và mô tả ngắn.

**How it Works:**
3 bước đơn giản với số lớn: 1. Tạo câu hỏi → 2. Publish đề thi → 3. Phân tích kết quả

**AI Feature Highlight:**
Section riêng nổi bật: "✨ Sinh câu hỏi bằng AI" với GIF demo hoặc mockup.

**Pricing Section:**
Nhúng pricing page vào (hoặc dùng lại component).

**Marketplace Teaser:**
"Bán đề thi của bạn — Kiếm thêm thu nhập" với số liệu (nếu có).

**FAQ:**
8-10 câu hỏi thường gặp, dùng accordion component.

**Final CTA:**
"Bắt đầu miễn phí hôm nay — Không cần thẻ tín dụng"

### 2. SEO Setup (Next.js Metadata)

`app/layout.tsx` — metadata mặc định:
```typescript
export const metadata: Metadata = {
  title: { default: 'ExamFlow — Nền tảng thi trực tuyến', template: '%s | ExamFlow' },
  description: 'Tạo đề thi online, quản lý học sinh, phân tích kết quả. Tích hợp AI sinh câu hỏi từ tài liệu.',
  keywords: ['thi trực tuyến', 'tạo đề thi', 'e-learning', 'học trực tuyến', 'giáo viên'],
  openGraph: { type: 'website', locale: 'vi_VN', ... },
  robots: { index: true, follow: true },
}
```

Từng page quan trọng có metadata riêng:
- `/pricing` — "Bảng giá ExamFlow"
- `/marketplace` — "Marketplace Đề Thi & Tài Liệu"
- `/blog` (nếu có) — blog bài viết

### 3. Sitemap + Robots (Next.js App Router)

`app/sitemap.ts`:
- Static pages: /, /pricing, /marketplace, /login, /register
- Dynamic: /marketplace/[id] cho tất cả published items

`app/robots.ts`:
- Allow: tất cả
- Disallow: /api/, /dashboard/, /teacher/, /student/

### 4. Google Analytics + Meta Pixel

Tạo `components/analytics/Analytics.tsx`:
- Google Analytics 4 (dùng `@next/third-parties/google`)
- Track: page views, register event, purchase event, upgrade event

---

# PHASE 4 — Scale: Enterprise + Gamification + Advanced AI

> Mục tiêu: Scale nếu có traction. Chỉ build khi MRR > $500 hoặc > 50 org đang dùng.

---

## PROMPT 4.1 — Battle Mode (Real-time Exam)

**Context:** Phase 1–3 đã xong. Cần tính năng thi nhóm real-time. Cài thêm `@nestjs/websockets`, `socket.io`.

### PHẦN A: Backend

**1. Migration**

```prisma
model BattleRoom {
  id          String          @id @default(uuid())
  code        String          @unique  // 6 ký tự để join
  examId      String
  exam        Exam            @relation(fields: [examId], references: [id])
  hostId      String
  host        User            @relation("BattleHost", fields: [hostId], references: [id])
  status      BattleStatus    @default(WAITING)
  maxPlayers  Int             @default(4)
  startedAt   DateTime?
  endedAt     DateTime?
  createdAt   DateTime        @default(now())

  players BattlePlayer[]
}

model BattlePlayer {
  id          String      @id @default(uuid())
  roomId      String
  room        BattleRoom  @relation(fields: [roomId], references: [id])
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  score       Float       @default(0)
  answeredAt  DateTime?
  rank        Int?
  answers     Json        @default("[]")

  @@unique([roomId, userId])
}

enum BattleStatus {
  WAITING    // chờ người chơi join
  COUNTDOWN  // đếm ngược 3-2-1
  PLAYING    // đang thi
  FINISHED
}
```

**2. Battle Gateway (src/battle/battle.gateway.ts)**

WebSocket Gateway với namespace `/battle`:

Events từ client → server:
- `join-room` payload: `{ roomCode, userId }` → validate → add vào room, broadcast `player-joined`
- `ready` → đánh dấu player sẵn sàng, nếu tất cả ready → bắt đầu countdown
- `submit-answer` payload: `{ questionIndex, answer, timeMs }` → chấm điểm ngay lập tức → broadcast `score-update`
- `leave-room` → remove player, broadcast `player-left`

Events từ server → client:
- `room-state` → toàn bộ state phòng (players, scores, status)
- `player-joined` payload: `{ player }`
- `player-left` payload: `{ userId }`
- `countdown-start` payload: `{ seconds: 3 }`
- `game-start` payload: `{ firstQuestion, totalQuestions }`
- `next-question` payload: `{ question, questionIndex, timeLimit }`
- `score-update` payload: `{ userId, score, rank, isCorrect }`
- `question-timeout` → hết giờ câu này, reveal đáp án
- `game-over` payload: `{ rankings: [{ userId, displayName, score, rank }] }`

**3. Battle Service (src/battle/battle.service.ts)**

`createRoom(hostId, examId, maxPlayers)`:
- Validate exam tồn tại và có thể dùng cho battle (type multiple_choice hoặc true_false, không có essay)
- Tạo BattleRoom với random code 6 ký tự
- Lưu state vào Redis: `battle:{roomId}:state`

`getRoomByCode(code)`: tìm room + players

`startBattle(roomId)`:
- Transition status: WAITING → COUNTDOWN → PLAYING
- Emit countdown event (3 giây)
- Sau đó emit câu hỏi đầu tiên
- Mỗi câu có time limit (từ question difficulty: dễ=20s, TB=30s, khó=45s)

`submitAnswer(roomId, userId, questionIndex, answer, timeMs)`:
- Chấm điểm ngay: đúng = base_point * (1 + speedBonus)
  - speedBonus = (timeLimit - timeMs) / timeLimit * 0.5 (tối đa +50% điểm nếu trả lời nhanh)
- Update score trong Redis
- Emit `score-update` cho tất cả players trong room
- Kiểm tra tất cả đã trả lời chưa → nếu rồi thì next question sớm

`endBattle(roomId)`:
- Tính final rankings
- Lưu kết quả vào DB (BattlePlayer records)
- Emit `game-over`
- Xoá state khỏi Redis

**Redis State Structure:**

```json
// battle:{roomId}:state
{
  "roomId": "...",
  "status": "PLAYING",
  "currentQuestionIndex": 2,
  "questionOrder": ["q1", "q2", "q3"],
  "players": {
    "userId1": { "score": 250, "answeredCurrent": true },
    "userId2": { "score": 180, "answeredCurrent": false }
  },
  "questionStartedAt": "2024-01-01T10:00:00Z"
}
```

---

### PHẦN B: Frontend

**1. Battle Lobby (app/(student)/battle/page.tsx)**

2 options:

Option A — Tạo phòng (HOST):
- Dropdown chọn exam
- Input max players (2-4)
- Click "Tạo phòng" → nhận room code
- Hiện room code to, dễ nhìn: "ABC123"
- List players đã join (cập nhật real-time qua socket)
- Nút "Bắt đầu" (chỉ active khi >= 2 players)

Option B — Tham gia phòng (JOIN):
- Input room code 6 ký tự (uppercase, auto-format)
- Click "Tham gia"

**2. Battle Game Page (app/(student)/battle/[roomId]/page.tsx)**

Layout:

```
┌────────────────────────────────────────────────────┐
│  [P1: An 250đ 🥇] [P2: Bình 180đ 🥈] [Timer: 24s] │
├────────────────────────────────────────────────────┤
│                                                    │
│               Câu 3 / 10                           │
│   Thủ đô của Pháp là thành phố nào?               │
│                                                    │
│   ┌──────────┐  ┌──────────┐                      │
│   │  Berlin  │  │  Paris   │  ← highlight khi chọn│
│   └──────────┘  └──────────┘                      │
│   ┌──────────┐  ┌──────────┐                      │
│   │  London  │  │   Rome   │                      │
│   └──────────┘  └──────────┘                      │
│                                                    │
│   ✅ An đã trả lời!    ⏳ Bình đang suy nghĩ...   │
└────────────────────────────────────────────────────┘
```

Sau khi trả lời: Reveal đáp án đúng/sai + score update animation.

Màn hình kết thúc:

```
┌────────────────────────────────────────────┐
│  🏆 KẾT QUẢ                               │
│                                            │
│  🥇 Nguyễn An      350 điểm               │
│  🥈 Trần Bình      280 điểm               │
│  🥉 Lê Cường       195 điểm               │
│                                            │
│  [Chơi lại] [Về trang chủ]               │
└────────────────────────────────────────────┘
```

---

## PROMPT 4.2 — Gamification System

**Context:** Phase 1–3 đã xong. Battle mode (Prompt 4.1) tùy chọn. Thêm streak, badge, leaderboard.

### PHẦN A: Backend

**1. Migration**

```prisma
model UserStreak {
  id             String   @id @default(uuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  currentStreak  Int      @default(0)
  longestStreak  Int      @default(0)
  lastActivityAt DateTime?
  updatedAt      DateTime @updatedAt
}

model Badge {
  id          String      @id @default(uuid())
  code        String      @unique  // "first_exam", "streak_7", "perfect_score"...
  name        String
  description String
  iconUrl     String
  category    String      // "achievement" | "streak" | "social"
  condition   Json        // { type: "attempt_count", value: 10 }
}

model UserBadge {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  badgeId   String
  badge     Badge    @relation(fields: [badgeId], references: [id])
  earnedAt  DateTime @default(now())

  @@unique([userId, badgeId])
}

model LeaderboardEntry {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  period    String   // "2024-W01" (weekly) | "2024-01" (monthly) | "all_time"
  score     Float
  rank      Int?
  updatedAt DateTime @updatedAt

  @@unique([userId, period])
  @@index([period, score])
}
```

**2. Gamification Service (src/gamification/gamification.service.ts)**

`updateStreak(userId)`:
- Gọi mỗi khi user submit attempt hoặc review
- Nếu lastActivityAt = hôm qua → currentStreak += 1
- Nếu lastActivityAt = hôm nay → không thay đổi (đã hoạt động rồi)
- Nếu lastActivityAt > 1 ngày trước → reset currentStreak = 1
- Update longestStreak nếu cần
- Return: `{ currentStreak, longestStreak, isNewRecord: boolean }`

`checkAndAwardBadges(userId, triggerEvent)`:
- triggerEvent: 'attempt_submit' | 'perfect_score' | 'streak_update' | 'purchase' | ...
- Kiểm tra các badge conditions liên quan đến event
- Nếu đủ điều kiện và chưa có badge → tạo UserBadge
- Return: `Badge[]` (danh sách badge mới nhận được, có thể rỗng)

Badge conditions mẫu:
- `first_exam`: submit attempt đầu tiên
- `streak_3`, `streak_7`, `streak_30`: streak liên tiếp
- `perfect_score`: totalScore === maxScore
- `speed_demon`: submit exam trong 50% thời gian cho phép
- `examiner`: tạo 10 đề thi
- `seller`: bán được đề thi đầu tiên

`updateLeaderboard(userId, score)`:
- Update Redis sorted set: `leaderboard:weekly:{week}`, `leaderboard:monthly:{month}`, `leaderboard:all_time`
- Dùng `ZADD` với score tích lũy
- Cron job hàng ngày: sync từ Redis sang PostgreSQL

`getLeaderboard(period, limit, userId?)`:
- Lấy từ Redis sorted set (real-time)
- Return: `{ entries: [...], myRank: number | null, myScore: number }`

**3. Hook vào các Service hiện có**

Cập nhật `AttemptService.submit()`:
```typescript
// Sau khi grade xong, gọi:
await this.gamificationService.updateStreak(userId);
const newBadges = await this.gamificationService.checkAndAwardBadges(userId, 'attempt_submit');
await this.gamificationService.updateLeaderboard(userId, totalScore);

// Return thêm vào response:
return { ...attemptResult, newBadges, streakInfo };
```

**4. Gamification Controller**

- `GET /gamification/leaderboard` — query: `?period=weekly|monthly|all_time&limit=50`
- `GET /gamification/my-badges` — danh sách badge của mình
- `GET /gamification/my-streak` — thông tin streak hiện tại
- `GET /gamification/badges` — tất cả badges có thể kiếm được (catalog)

---

### PHẦN B: Frontend

**1. Badge Notification Toast (components/gamification/BadgeToast.tsx)**

Popup đẹp khi nhận badge mới (sau submit exam):

```
┌─────────────────────────────────┐
│  🏆 Huy hiệu mới!               │
│                                 │
│   [Icon badge]                  │
│   🔥 Streak 7 ngày              │
│   "Kiên trì 7 ngày liên tiếp"  │
└─────────────────────────────────┘
```

Animation: slide in từ góc phải, tự đóng sau 4 giây.

**2. Streak Widget (components/gamification/StreakWidget.tsx)**

Hiển thị trong Student Dashboard:

```
🔥 7 ngày liên tiếp  📈 Kỷ lục: 14 ngày
████████░░░░░░  T2 T3 T4 T5 T6 T7 CN
(7 ngày qua: có hoạt động = filled, không = empty)
```

**3. Leaderboard Page (app/(student)/leaderboard/page.tsx)**

Tabs: Tuần này / Tháng này / Mọi thời đại

```
┌─────────────────────────────────────────┐
│  🏆 Bảng Xếp Hạng                      │
│                                         │
│  🥇 1. Nguyễn An           2,450đ      │
│  🥈 2. Trần Bình           2,280đ      │
│  🥉 3. Lê Cường            1,950đ      │
│     4. Phạm Dũng           1,820đ      │
│     5. Hoàng Em            1,700đ      │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  📍 Vị trí của bạn: #23 — 890đ        │
└─────────────────────────────────────────┘
```

Real-time update mỗi 30 giây (polling đơn giản, không cần WebSocket).

**4. Profile Page — Badges (app/(student)/profile/page.tsx)**

Grid badges: đã kiếm (màu đầy đủ) vs chưa kiếm (greyscale + điều kiện cần đạt).

---

## PROMPT 4.3 — Adaptive Learning AI

**Context:** Phase 1–3 + AI từ Phase 2 đã xong. Cần nâng cấp AI lên adaptive learning thực sự.

### PHẦN A: Backend

**1. Migration**

```prisma
model LearningProfile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])

  // Topic mastery: { "toán_giải_tích": 0.72, "vật_lý_cơ_học": 0.45 }
  topicMastery  Json  @default("{}")

  // Question type performance: { "MULTIPLE_CHOICE": { correct: 45, total: 60 } }
  typeStats     Json  @default("{}")

  // Difficulty performance: { "1": 0.9, "2": 0.7, "3": 0.4 }
  difficultyStats Json @default("{}")

  // Time patterns: average time per question difficulty
  timingStats   Json  @default("{}")

  updatedAt   DateTime @updatedAt
}
```

**2. Learning Profile Service (src/ai/learning-profile.service.ts)**

`updateProfile(userId, attemptId)`:
- Sau mỗi attempt submit, phân tích answers
- Tính correctRate theo từng tag (topic)
- Tính correctRate theo difficulty
- Update LearningProfile với exponential moving average:
  - `newMastery = oldMastery * 0.7 + currentAttemptRate * 0.3`
  - (trọng số cao hơn cho kết quả gần đây)

`getWeakTopics(userId, topN = 5)`:
- Trả về N topics có mastery thấp nhất
- Chỉ tính topics đã có đủ data (>= 5 câu hỏi)

`getRecommendedDifficulty(userId, topic?)`:
- Nếu mastery >= 0.8 → recommend difficulty 3
- Nếu mastery 0.5-0.8 → recommend difficulty 2
- Nếu mastery < 0.5 → recommend difficulty 1
- Có thể filter theo topic cụ thể

**3. Adaptive Question Selection Service (src/ai/adaptive-selection.service.ts)**

`selectAdaptiveQuestions(userId, examConfig)`:
- Lấy learning profile của user
- Từ question bank, chọn câu hỏi theo:
  - 40% từ weak topics
  - 30% từ medium topics
  - 30% từ topics chưa được test
- Trong mỗi nhóm, độ khó được chọn theo `getRecommendedDifficulty()`
- Return ordered list questionIds

`generateAdaptiveExam(userId, subject, totalQuestions)`:
- Gọi `selectAdaptiveQuestions()`
- Nếu không đủ câu trong bank → gọi AI sinh thêm câu dựa trên weak topics
- Return danh sách câu hỏi

**4. AI Tutor Service (src/ai/tutor.service.ts)**

`explainWrongAnswer(userId, questionId, userAnswer)`:
- Lấy thông tin câu hỏi, đáp án đúng, đáp án user chọn
- Lấy learning profile để biết background của user
- Gọi Claude API với prompt:

```
Học sinh đã trả lời sai câu hỏi này.
Câu hỏi: [content]
Đáp án đúng: [correctAnswer] — [explanation]
Học sinh trả lời: [userAnswer]
Chủ đề yếu của học sinh: [weakTopics]

Hãy giải thích:
1. Tại sao đáp án của học sinh sai (ngắn gọn, không phán xét)
2. Tại sao đáp án đúng là đúng (rõ ràng, có ví dụ nếu cần)
3. Gợi ý cách ghi nhớ (mnemonic hoặc trick)

Ngôn ngữ: Tiếng Việt. Giọng văn: thân thiện, khuyến khích.
Độ dài: tối đa 200 từ.
```

`generatePracticeQuestions(userId, topic, count = 5)`:
- Lấy mastery score của topic từ learning profile
- Gọi AI sinh câu hỏi với độ khó phù hợp
- Tương tự AI generate từ Phase 2 nhưng không cần document

`analyzeClassPerformance(examId, teacherId)`:
- Aggregate performance data của tất cả students trong exam
- Gọi AI với data:

```
Dưới đây là dữ liệu bài thi của lớp:
- Tổng học sinh: X
- Điểm trung bình: Y%
- Câu hỏi khó nhất (tỷ lệ đúng thấp nhất): [list]
- Phân bố điểm: [histogram data]

Hãy phân tích:
1. Điểm mạnh của lớp
2. Kiến thức cần dạy lại
3. 3 câu hỏi cụ thể cần giải thích thêm và lý do
4. Gợi ý cho buổi học tiếp theo

Định dạng: JSON với keys: strengths, weaknesses, questionsToReview, teachingSuggestions
```

**5. Controller additions**

- `POST /ai/tutor/explain` — Body: `{ questionId, userAnswer }` (student only)
- `POST /ai/practice` — Body: `{ topic, count }` → sinh câu luyện tập
- `GET /ai/adaptive-exam` — query: `?subject=&count=` → tạo đề adaptive
- `POST /ai/analyze-class/:examId` — teacher only, phân tích cả lớp

---

### PHẦN B: Frontend

**1. AI Tutor trong Result Page**

Cập nhật `app/(student)/attempts/[id]/result/page.tsx`:

Với mỗi câu sai, thêm button "💡 Giải thích":
- Click → loading spinner
- Gọi `POST /ai/tutor/explain`
- Hiện giải thích trong expandable panel bên dưới câu đó
- Cache trong localStorage để không gọi lại khi re-render

**2. Adaptive Practice Widget (components/student/AdaptiveWidget.tsx)**

Widget trong Student Dashboard:

```
┌─────────────────────────────────────────┐
│  🎯 Luyện tập thông minh                │
│                                         │
│  Dựa trên kết quả của bạn:             │
│                                         │
│  📉 Yếu nhất: Vật lý cơ học (42%)      │
│  📈 Tốt nhất: Toán đại số (85%)        │
│                                         │
│  [▶ Luyện tập Vật lý cơ học ngay]     │
│  [📝 Tạo đề ôn tập cá nhân hóa]       │
└─────────────────────────────────────────┘
```

**3. Class Analytics AI Insight (teacher UI)**

Cập nhật `app/(teacher)/exams/[id]/results/page.tsx`:

Thêm tab "🤖 AI Insight":
- Button "Phân tích cả lớp bằng AI"
- Loading state: "AI đang phân tích dữ liệu..." (5-10 giây)
- Hiển thị kết quả trong sections: Điểm mạnh / Điểm yếu / Câu cần giải thích lại / Gợi ý buổi học tiếp theo

---

## PROMPT 4.4 — B2B Enterprise Features

**Context:** Phase 1–3 đã xong. Nhắm đến trường học và trung tâm lớn.

### PHẦN A: Custom Subdomain

**1. Subdomain Routing (Next.js middleware)**

Cập nhật `middleware.ts`:
- Detect subdomain từ `request.headers.get('host')`
- VD: `truong-abc.examflow.vn` → slug = `truong-abc`
- Tìm Organization theo slug
- Set header `x-org-slug` để các page biết context
- Nếu slug không tồn tại → redirect về trang chính

**2. White-label Config**

```prisma
model OrganizationBranding {
  id              String       @id @default(uuid())
  organizationId  String       @unique
  organization    Organization @relation(fields: [organizationId], references: [id])
  logoUrl         String?
  faviconUrl      String?
  primaryColor    String?      // hex color
  secondaryColor  String?
  customDomain    String?      // custom domain về sau
  welcomeMessage  String?
  footerText      String?
  updatedAt       DateTime     @updatedAt
}
```

**3. Branding Service**

`getBranding(orgSlug)`: lấy branding config, cache Redis 30 phút.
`updateBranding(orgId, dto)`: update branding, invalidate cache.
`uploadLogo(orgId, file)`: upload logo lên R2, update branding.

**4. Dynamic Theme (Frontend)**

Khi có `x-org-slug` header:
- Fetch branding config từ `GET /organizations/:slug/branding` (public)
- Inject CSS variables: `--primary-color`, `--secondary-color`
- Replace logo, favicon, tab title
- Hiện welcome message trên login page

### PHẦN B: SSO (Google Workspace)

**1. Cài packages**

```bash
pnpm add passport-google-oauth20 @types/passport-google-oauth20
```

**2. Google OAuth Strategy (src/auth/strategies/google.strategy.ts)**

- Strategy: `passport-google-oauth20`
- Scope: `['email', 'profile']`
- Callback: tìm user bằng email, nếu không có → tạo mới với role=STUDENT (hoặc theo org default)
- Sau login: return JWT tokens như flow bình thường

**3. Org SSO Config**

```prisma
model OrganizationSSO {
  id             String       @id @default(uuid())
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id])
  provider       String       // "google" | "microsoft"
  allowedDomain  String       // "truongabc.edu.vn" — chỉ email domain này được login
  defaultRole    Role         @default(STUDENT)
  isActive       Boolean      @default(true)
}
```

Nếu org có SSO config và user email match `allowedDomain`:
- Auto-assign user vào org
- Apply `defaultRole`

**4. Controller**

- `GET /auth/google` — redirect sang Google
- `GET /auth/google/callback` — callback, trả tokens
- `GET /auth/google?org=truong-abc` — SSO cho org cụ thể (check allowed domain)

### PHẦN C: Bulk Operations

**1. Bulk Import Students (CSV)**

```
POST /organizations/:id/students/import
Content-Type: multipart/form-data
file: students.csv
```

CSV format:
```
email,displayName,studentCode
hs001@example.com,Nguyễn Văn A,2024001
hs002@example.com,Trần Thị B,2024002
```

Logic:
- Parse CSV (dùng `csv-parse`)
- Validate từng row
- Bulk upsert users (tạo hoặc thêm vào org nếu đã có)
- Gửi invitation email cho user mới
- Return: `{ created: N, invited: N, skipped: N, errors: [...] }`

**2. Bulk Export Results (Excel)**

```
GET /organizations/:id/reports/export?period=2024-01&format=xlsx
```

Dùng `exceljs`:
- Sheet 1: Tổng quan (tổng HS, tổng bài, điểm TB)
- Sheet 2: Chi tiết từng học sinh (tên, email, bài thi, điểm, ngày)
- Sheet 3: Thống kê theo đề thi

---

## PROMPT 4.5 — Performance & Scale Optimization

**Context:** Tất cả Phase 4 features đã xong. Optimize để handle traffic lớn hơn.

### 1. Database Query Optimization

Audit và optimize các slow queries:

**Pagination với cursor (thay offset):**

Cập nhật tất cả `findAll()` services dùng cursor-based pagination thay vì `skip/take`:

```typescript
// Thay vì
const items = await prisma.question.findMany({ skip: (page-1)*limit, take: limit })

// Dùng cursor
const items = await prisma.question.findMany({
  take: limit + 1,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { createdAt: 'desc' }
})
const hasMore = items.length > limit
const nextCursor = hasMore ? items[limit].id : null
```

**Eager loading tránh N+1:**

Review tất cả queries có nested relations, dùng `include` đúng chỗ thay vì loop query.

**Full-text search index:**

```sql
-- Migration: thêm GIN index cho full-text search
CREATE INDEX questions_content_fts ON questions USING GIN(to_tsvector('simple', content));
CREATE INDEX marketplace_items_fts ON marketplace_items USING GIN(to_tsvector('simple', title || ' ' || description));
```

### 2. Redis Caching Strategy

**Cache-aside pattern** cho các endpoint đọc nhiều:

```typescript
// Generic cache helper
async getOrSet<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)
  const data = await fetcher()
  await redis.set(key, JSON.stringify(data), 'EX', ttl)
  return data
}
```

Cache các endpoint sau:
- `GET /marketplace/items` — 2 phút (invalidate khi có purchase hoặc new item)
- `GET /gamification/leaderboard` — 1 phút
- `GET /analytics/exams/:id` — 5 phút (invalidate khi có attempt mới)
- `GET /billing/plans` — 1 giờ (invalidate khi admin cập nhật plan)
- `GET /organizations/:slug/branding` — 30 phút

### 3. Background Jobs (Bull Queue)

Cài `@nestjs/bull` + `bull` để xử lý tác vụ nặng async:

**Queues cần tạo:**

`email-queue`:
- Job: `send-welcome-email`
- Job: `send-invoice-email`
- Job: `send-trial-ending-reminder`
- Retry: 3 lần, backoff 5 phút

`ai-queue`:
- Job: `generate-questions` — move AI generation sang background
- Job: `analyze-class-performance`
- Concurrency: 2 (giới hạn API calls song song)

`analytics-queue`:
- Job: `update-leaderboard`
- Job: `update-learning-profile`
- Chạy sau mỗi attempt submit, không block response

`payout-queue`:
- Job: `process-seller-payout`
- Chạy hàng ngày, xử lý các payout request

**Bull Dashboard:**
Cài `@bull-board/nestjs` để có UI monitor queues tại `/admin/queues`.

### 4. API Rate Limiting Nâng cao

Cập nhật ThrottlerModule với multiple guards:

```typescript
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 10 },       // 10 req/giây
  { name: 'medium', ttl: 60000, limit: 100 },     // 100 req/phút
  { name: 'long', ttl: 900000, limit: 500 },      // 500 req/15 phút
])
```

Custom throttler cho từng endpoint:
- Auth endpoints: `@Throttle({ short: { limit: 3 }, medium: { limit: 10 } })`
- AI endpoints: `@Throttle({ medium: { limit: 5 }, long: { limit: 20 } })`
- Upload endpoints: `@Throttle({ medium: { limit: 10 } })`

### 5. Health Check Nâng cao

Cập nhật `GET /health`:

```typescript
// Dùng @nestjs/terminus
@Get('health')
@HealthCheck()
check() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.redis.pingCheck('redis'),
    () => this.http.pingCheck('stripe', 'https://api.stripe.com'),
    () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
  ])
}
```

---

## Thứ tự thực hiện Phase 3 & 4

### Phase 3 (Tháng 5–7)

| Bước | Prompt | Nội dung | Ước tính |
|------|--------|----------|----------|
| 1 | 3.1 | Subscription Backend | 4–5 giờ |
| 2 | 3.2 | Subscription Frontend | 3–4 giờ |
| 3 | 3.3 | Marketplace Backend | 5–6 giờ |
| 4 | 3.4 | Marketplace Frontend | 4–5 giờ |
| 5 | 3.5 | Landing Page + SEO | 3–4 giờ |

**Tổng Phase 3:** 19–24 giờ

### Phase 4 (Tháng 8+)

| Bước | Prompt | Nội dung | Ước tính |
|------|--------|----------|----------|
| 1 | 4.1 | Battle Mode | 5–7 giờ |
| 2 | 4.2 | Gamification | 4–5 giờ |
| 3 | 4.3 | Adaptive AI | 5–6 giờ |
| 4 | 4.4 | Enterprise B2B | 4–5 giờ |
| 5 | 4.5 | Performance & Scale | 3–4 giờ |

**Tổng Phase 4:** 21–27 giờ

---

## Tổng kết toàn bộ Roadmap

| Phase | Tổng thời gian | Mục tiêu chính |
|-------|---------------|----------------|
| Phase 1 | 29–37 giờ | Portfolio hoàn chỉnh, deploy được |
| Phase 2 | 22–30 giờ | Portfolio ấn tượng (AI + anti-cheat + test) |
| Phase 3 | 19–24 giờ | Doanh thu đầu tiên (subscription + marketplace) |
| Phase 4 | 21–27 giờ | Scale nếu có traction |
| **Tổng** | **91–118 giờ** | **Full product** |

> **Nhắc lại nguyên tắc quan trọng:** Phase 4 chỉ build khi có tín hiệu rõ ràng từ thị trường. Đừng build vì "nghe hay ho" — build vì người dùng đang yêu cầu.

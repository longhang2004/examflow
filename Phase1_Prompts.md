# ExamFlow — Phase 1 Coding Prompts

> Dùng với Cursor (Agent mode) hoặc Claude Projects.  
> Paste từng prompt theo thứ tự. Mỗi prompt tiếp theo đều giả định prompt trước đã hoàn thành.  
> Thêm dòng này vào đầu nếu AI mất context: **"Project ExamFlow — monorepo NestJS + Next.js + PostgreSQL + Prisma + Redis. Phase 1 MVP."**

---

## PROMPT 1 — Project Setup & Database Schema

Bạn là senior full-stack developer. Hãy setup một monorepo project với cấu trúc và yêu cầu sau.

### Tech Stack

- Backend: NestJS (TypeScript), Prisma ORM, PostgreSQL
- Frontend: Next.js 14 (App Router, TypeScript)
- Cache: Redis (ioredis)
- Package manager: pnpm
- Monorepo tool: turborepo

### Cấu trúc thư mục

```
root/
├── apps/
│   ├── api/          ← NestJS backend
│   └── web/          ← Next.js frontend
├── packages/
│   └── types/        ← Shared TypeScript types
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 1. Turbo + pnpm workspace

- Cấu hình turbo.json với pipeline: build, dev, lint
- pnpm-workspace.yaml định nghĩa apps/* và packages/*

### 2. NestJS app (apps/api) — packages cần cài

- @nestjs/common, @nestjs/core, @nestjs/platform-express
- @nestjs/config, @nestjs/jwt, @nestjs/passport
- passport, passport-jwt, passport-local
- @prisma/client, prisma
- bcrypt, @types/bcrypt
- class-validator, class-transformer
- @nestjs/mapped-types
- ioredis
- uuid

### 3. Next.js app (apps/web) — packages cần cài

- next 14, react, react-dom (TypeScript)
- axios
- zustand
- react-hook-form + @hookform/resolvers + zod
- @tanstack/react-query
- tailwindcss, postcss, autoprefixer
- lucide-react
- date-fns

### 4. Prisma Schema (apps/api/prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  STUDENT
  TEACHER
  ORG_ADMIN
  SUPER_ADMIN
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

enum ExamStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum AttemptStatus {
  IN_PROGRESS
  SUBMITTED
  GRADED
}

enum QuestionType {
  MULTIPLE_CHOICE
  MULTIPLE_SELECT
  TRUE_FALSE
  FILL_BLANK
  ESSAY
}

model User {
  id             String        @id @default(uuid())
  email          String        @unique
  passwordHash   String
  displayName    String
  avatarUrl      String?
  role           Role          @default(STUDENT)
  plan           Plan          @default(FREE)
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  questions  Question[]
  exams      Exam[]
  attempts   Attempt[]
  ownedOrgs  Organization[]  @relation("OrgOwner")
  parentOf   ParentStudent[] @relation("Parent")
  studentOf  ParentStudent[] @relation("Student")
}

model Organization {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  ownerId   String
  owner     User     @relation("OrgOwner", fields: [ownerId], references: [id])
  plan      Plan     @default(FREE)
  members   User[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  questions Question[]
  exams     Exam[]
}

model Question {
  id             String        @id @default(uuid())
  creatorId      String
  creator        User          @relation(fields: [creatorId], references: [id])
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  type           QuestionType
  content        String
  config         Json
  tags           String[]
  difficulty     Int           @default(1)
  isPublic       Boolean       @default(false)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  examQuestions ExamQuestion[]
}

model Exam {
  id             String        @id @default(uuid())
  title          String
  description    String?
  creatorId      String
  creator        User          @relation(fields: [creatorId], references: [id])
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  config         Json
  accessCode     String?       @unique
  status         ExamStatus    @default(DRAFT)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  questions ExamQuestion[]
  attempts  Attempt[]
}

model ExamQuestion {
  id         String   @id @default(uuid())
  examId     String
  exam       Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
  order      Int
  point      Float    @default(1)

  @@unique([examId, questionId])
  @@unique([examId, order])
}

model Attempt {
  id            String        @id @default(uuid())
  examId        String
  exam          Exam          @relation(fields: [examId], references: [id])
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  questionOrder String[]
  answers       Json          @default("[]")
  status        AttemptStatus @default(IN_PROGRESS)
  startedAt     DateTime      @default(now())
  submittedAt   DateTime?
  totalScore    Float?
  maxScore      Float?

  @@index([examId, userId])
}

model ParentStudent {
  id        String @id @default(uuid())
  parentId  String
  parent    User   @relation("Parent", fields: [parentId], references: [id])
  studentId String
  student   User   @relation("Student", fields: [studentId], references: [id])

  @@unique([parentId, studentId])
}
```

### 5. File .env.example (apps/api)

```
DATABASE_URL="postgresql://user:password@localhost:5432/examapp"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

### 6. File .env.example (apps/web)

```
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 7. Docker Compose (root/docker-compose.yml)

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: examapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
volumes:
  postgres_data:
```

### Output mong đợi

- Toàn bộ file config tạo đúng
- `pnpm install` chạy thành công ở root
- `docker-compose up -d` chạy được
- `npx prisma migrate dev --name init` tạo được tables
- `pnpm dev` khởi động cả api (port 3001) và web (port 3000)

---

## PROMPT 2 — Auth Module (Backend)

**Context:** NestJS + Prisma + PostgreSQL + Redis monorepo đã setup. Schema đã có User model với role, plan, organizationId.

### Cấu trúc module cần tạo

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── jwt-refresh.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   └── dto/
│       ├── register.dto.ts
│       └── login.dto.ts
├── prisma/
│   ├── prisma.module.ts   ← @Global()
│   └── prisma.service.ts
└── redis/
    ├── redis.module.ts    ← @Global()
    └── redis.service.ts
```

### Prisma Service (Global)

- Extends PrismaClient
- onModuleInit: `$connect()`
- onModuleDestroy: `$disconnect()`
- Export PrismaModule as `@Global()`

### Redis Service (Global)

Dùng ioredis. Cần các methods:
- `get(key: string): Promise<string | null>`
- `set(key: string, value: string, ttl?: number): Promise<void>`
- `del(key: string): Promise<void>`

### DTOs (class-validator)

**RegisterDto:**
- email: string — IsEmail
- password: string — MinLength(8), phải có chữ hoa và số (custom validator)
- displayName: string — MinLength(2), MaxLength(50)
- role: enum Role — optional, default STUDENT, không cho phép SUPER_ADMIN

**LoginDto:**
- email: string — IsEmail
- password: string — IsNotEmpty

### Auth Service — Methods

- `register(dto)` — hash password bcrypt rounds=12, tạo user, trả tokens
- `login(dto)` — verify email+password, trả tokens
- `refreshTokens(userId, refreshToken)` — verify từ Redis, cấp tokens mới
- `logout(userId)` — xoá refresh token khỏi Redis
- `generateTokens(userId, email, role)` — tạo accessToken (15m) + refreshToken (7d)
- `saveRefreshToken(userId, token)` — lưu Redis key `refresh:{userId}`, TTL 7 ngày
- `validateRefreshToken(userId, token)` — so sánh với Redis

### Auth Controller — Endpoints

- `POST /auth/register` → 201, trả `{ user, tokens: { accessToken, refreshToken } }`
- `POST /auth/login` → 200, trả `{ user, tokens }`
- `POST /auth/refresh` → 200, nhận refreshToken từ body, trả tokens mới (JwtRefreshGuard)
- `POST /auth/logout` → 200 (JwtAuthGuard)
- `GET /auth/me` → 200, trả user hiện tại (JwtAuthGuard)

### JWT Strategy

- Secret từ ConfigService
- Payload: `{ sub: userId, email, role }`
- validate(): query DB lấy user, bỏ passwordHash trước khi return

### Roles Guard

- Đọc required roles từ `@Roles()` decorator
- So sánh với user.role từ JWT
- Nếu không có `@Roles()` thì pass (chỉ cần authenticated)

### Current User Decorator

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### Response format chuẩn

Tạo TransformResponseInterceptor áp dụng globally:

```json
// Success
{ "success": true, "data": {}, "timestamp": "2024-01-01T00:00:00Z" }

// Error
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." }, "timestamp": "..." }
```

### Error handling

- Email đã tồn tại → 409 ConflictException
- Sai password → 401 UnauthorizedException
- Token hết hạn → 401 UnauthorizedException
- Không đủ quyền → 403 ForbiddenException

### Test thủ công — curl commands

Sau khi xong, cung cấp curl commands để test 5 luồng:
1. Register teacher
2. Login
3. GET /auth/me với token
4. Refresh token
5. Logout

---

## PROMPT 3 — Question & Exam Module (Backend)

**Context:** Auth module đã xong. Có JwtAuthGuard, RolesGuard, @CurrentUser(), @Roles(). Response format chuẩn đã có.

### PHẦN A: Question Module

**Cấu trúc:**

```
src/questions/
├── questions.module.ts
├── questions.controller.ts
├── questions.service.ts
└── dto/
    ├── create-question.dto.ts
    ├── update-question.dto.ts
    └── query-question.dto.ts
```

**Question Config schema theo từng type:**

MULTIPLE_CHOICE:
```json
{
  "options": [{ "id": "a", "text": "Đáp án A" }],
  "correctAnswer": "a",
  "explanation": "Giải thích..."
}
```

MULTIPLE_SELECT:
```json
{
  "options": [{ "id": "a", "text": "..." }],
  "correctAnswers": ["a", "c"],
  "explanation": "..."
}
```

TRUE_FALSE:
```json
{ "correctAnswer": true, "explanation": "..." }
```

FILL_BLANK:
```json
{
  "correctAnswers": ["hà nội", "Hà Nội"],
  "caseSensitive": false,
  "explanation": "..."
}
```

ESSAY:
```json
{
  "rubric": ["Nội dung", "Văn phong"],
  "maxWords": 500,
  "explanation": "Gợi ý đáp án..."
}
```

**DTOs:**

CreateQuestionDto:
- type: QuestionType (required)
- content: string — MinLength(10)
- config: object (required, validate theo type)
- tags: string[] — optional, max 10
- difficulty: number — 1/2/3, default 1
- isPublic: boolean — default false
- organizationId?: string

UpdateQuestionDto: PartialType(CreateQuestionDto)

QueryQuestionDto:
- page: number — default 1
- limit: number — default 20, max 100
- type?: QuestionType
- difficulty?: number
- tags?: string (comma-separated)
- search?: string (search trong content)
- organizationId?: string

**Question Service — Methods:**

- `create(userId, dto)` — tạo câu hỏi mới
- `findAll(userId, query)` — phân trang, chỉ trả câu hỏi: của user, hoặc trong org của user, hoặc isPublic=true
- `findOne(id, userId)` — lấy 1 câu hỏi, check quyền
- `update(id, userId, dto)` — chỉ creator hoặc org_admin được sửa
- `remove(id, userId)` — không cho xoá nếu đang dùng trong exam đã PUBLISHED

**Question Controller:** Tất cả routes cần JwtAuthGuard

- `POST /questions` — TEACHER, ORG_ADMIN, SUPER_ADMIN
- `GET /questions` — list câu hỏi (filter/search/pagination)
- `GET /questions/:id`
- `PATCH /questions/:id`
- `DELETE /questions/:id`

---

### PHẦN B: Exam Module

**Cấu trúc:**

```
src/exams/
├── exams.module.ts
├── exams.controller.ts
├── exams.service.ts
└── dto/
    ├── create-exam.dto.ts
    ├── update-exam.dto.ts
    ├── add-questions.dto.ts
    └── query-exam.dto.ts
```

**Exam Config schema:**

```json
{
  "duration": 30,
  "maxAttempts": 1,
  "shuffleQuestions": false,
  "shuffleOptions": false,
  "showResultAfter": true,
  "startAt": null,
  "endAt": null
}
```

**DTOs:**

CreateExamDto:
- title: string — MinLength(3)
- description?: string
- config: ExamConfigDto
- organizationId?: string

ExamConfigDto (validate từng field):
- duration: number | null — min 1 nếu có giá trị
- maxAttempts: number — min 1, max 10, default 1
- shuffleQuestions: boolean
- shuffleOptions: boolean
- showResultAfter: boolean
- startAt?: string — IsDateString
- endAt?: string — IsDateString, phải sau startAt nếu cả 2 có

AddQuestionsDto:
- questions: Array of `{ questionId: string, point: number, order: number }`

**Exam Service — Methods:**

- `create(userId, dto)` — tạo exam status=DRAFT, sinh accessCode 6 ký tự uppercase ngẫu nhiên
- `findAll(userId, query)` — list exam của user/org, filter theo status
- `findOne(id, userId)` — chi tiết kèm questions
- `findByAccessCode(code)` — public info (không cần auth)
- `update(id, userId, dto)` — chỉ được sửa khi status=DRAFT
- `addQuestions(examId, userId, dto)` — thêm/cập nhật câu hỏi
- `removeQuestion(examId, questionId, userId)` — xoá câu hỏi khỏi exam
- `publish(examId, userId)` — DRAFT → PUBLISHED, validate có ít nhất 1 câu hỏi
- `archive(examId, userId)` — PUBLISHED → ARCHIVED
- `getResults(examId, userId)` — tổng hợp kết quả, chỉ creator/org_admin xem được

**Exam Controller:**

- `POST /exams` — TEACHER+
- `GET /exams` — list exam của mình
- `GET /exams/:id` — chi tiết (owner/org_admin)
- `GET /exams/code/:code` — tìm bằng access code (không cần auth)
- `PATCH /exams/:id` — sửa
- `POST /exams/:id/questions` — thêm/update câu hỏi
- `DELETE /exams/:id/questions/:qid` — xoá câu hỏi
- `PATCH /exams/:id/publish`
- `PATCH /exams/:id/archive`
- `GET /exams/:id/results` — kết quả tổng hợp

**Lưu ý chung:**
- Validate quyền truy cập: user chỉ thao tác resource của mình hoặc trong org
- List endpoints trả `{ data: [...], meta: { total, page, limit, totalPages } }`
- Không expose passwordHash trong bất kỳ response nào

---

## PROMPT 4 — Attempt Module + Grading Engine (Backend)

**Context:** Auth, Question, Exam modules đã xong. Attempt schema: `{ id, examId, userId, questionOrder[], answers Json, status, startedAt, submittedAt, totalScore, maxScore }`

### PHẦN A: Attempt Module

**Cấu trúc:**

```
src/attempts/
├── attempts.module.ts
├── attempts.controller.ts
├── attempts.service.ts
├── grading.service.ts
└── dto/
    ├── start-attempt.dto.ts
    ├── save-answer.dto.ts
    └── submit-attempt.dto.ts
```

**DTOs:**

StartAttemptDto:
- examId: string (required)
- accessCode?: string

SaveAnswerDto:
- questionId: string (required)
- answer: any (string | string[] | boolean)
- timeSpent: number (giây, required)

**Attempt Service — Logic chi tiết:**

`start(userId, dto)`:
1. Tìm exam, validate: status=PUBLISHED, trong khoảng startAt-endAt (nếu có)
2. Validate accessCode nếu exam có
3. Đếm attempts của user cho exam, so với maxAttempts
4. Nếu có attempt IN_PROGRESS → return attempt đó (resume)
5. Tính maxScore = sum(point) của tất cả ExamQuestion
6. Tạo questionOrder: nếu shuffleQuestions=true thì shuffle mảng questionIds
7. Khởi tạo answers = []
8. Nếu exam có duration: lưu Redis key `attempt:{attemptId}:timer` TTL = duration*60
9. Return attempt + danh sách questions (theo questionOrder, shuffle options nếu cần)

`saveAnswer(userId, attemptId, dto)`:
1. Validate attempt tồn tại, thuộc userId, status=IN_PROGRESS
2. Check Redis timer key: nếu hết TTL → auto-submit và trả về kết quả
3. Validate questionId có trong questionOrder
4. Upsert answer trong mảng answers (replace nếu đã có questionId đó)
5. Lưu vào DB — KHÔNG chấm điểm ở bước này

`submit(userId, attemptId)`:
1. Validate attempt IN_PROGRESS, thuộc userId
2. Gọi GradingService.gradeAttempt(attempt)
3. Update: status=SUBMITTED/GRADED, submittedAt, totalScore, maxScore, answers (có isCorrect, pointEarned)
4. Xoá Redis timer key
5. Return kết quả đầy đủ

`findOne(userId, attemptId)`:
- Nếu IN_PROGRESS: không trả correctAnswer
- Nếu SUBMITTED/GRADED và showResultAfter=true: trả đầy đủ kể cả correctAnswer + explanation

`findMyAttempts(userId, query)`:
- List attempts của user, filter theo examId nếu có
- Chỉ trả meta (score, status, time), không trả answers chi tiết

---

### PHẦN B: Grading Service

`gradeAttempt(attempt, questions)`: Với mỗi answer, gọi gradeAnswer() rồi gắn isCorrect và pointEarned vào.

`gradeAnswer(question, userAnswer, examQuestion)`:

**MULTIPLE_CHOICE:** So sánh bằng ===. isCorrect ? point : 0

**MULTIPLE_SELECT:**
- Sort cả 2 mảng, so sánh
- Partial credit: pointEarned = max(0, correctSelected/totalCorrect - wrongSelected/totalOptions) * point

**TRUE_FALSE:** So sánh boolean.

**FILL_BLANK:**
- Trim whitespace
- Nếu caseSensitive=false: toLowerCase() trước khi so sánh
- isCorrect = correctAnswers.some(ans => normalize(ans) === normalize(userAnswer))

**ESSAY:**
- isCorrect = null, pointEarned = null
- Attempt status = SUBMITTED (không phải GRADED)

---

### PHẦN C: Analytics Module (cơ bản)

**Cấu trúc:**

```
src/analytics/
├── analytics.module.ts
├── analytics.controller.ts
└── analytics.service.ts
```

`getExamStats(examId, requesterId)` — validate requester là creator/org_admin:

```typescript
// Return type
{
  examId: string,
  totalAttempts: number,
  completedAttempts: number,
  averageScore: number,           // % so với maxScore
  highestScore: number,
  lowestScore: number,
  passRate: number,               // % score >= 60%
  scoreDistribution: Array<{ range: string, count: number }>,  // 10 buckets
  questionStats: Array<{
    questionId: string,
    content: string,              // preview 50 ký tự
    totalAnswered: number,
    correctCount: number,
    correctRate: number,
    averageTimeSpent: number      // giây
  }>
}
```

`getMyStats(userId)`:

```typescript
{
  totalAttempts: number,
  completedAttempts: number,
  averageScore: number,
  recentAttempts: Array<{
    attemptId: string,
    examTitle: string,
    score: number,
    maxScore: number,
    submittedAt: Date
  }>,                             // 10 lần gần nhất
  weakTopics: string[]            // tags có correctRate thấp nhất
}
```

**Analytics Controller:**
- `GET /analytics/exams/:examId` — TEACHER/ORG_ADMIN
- `GET /analytics/me` — tất cả roles

**Attempt Controller:**
- `POST /attempts` — bắt đầu làm bài
- `PUT /attempts/:id/answers` — lưu đáp án (auto-save)
- `POST /attempts/:id/submit` — nộp bài
- `GET /attempts/:id` — xem kết quả
- `GET /attempts` — lịch sử (query: ?examId=)

---

## PROMPT 5 — Frontend Auth + Layout

**Context:** Next.js 14 App Router TypeScript. API tại NEXT_PUBLIC_API_URL. Packages đã cài: axios, zustand, react-hook-form, zod, @tanstack/react-query, tailwindcss, lucide-react.

### PHẦN A: API Client & Auth Store

**API Client (lib/api-client.ts):**
- Axios instance với baseURL từ env
- Request interceptor: gắn `Authorization: Bearer {accessToken}`
- Response interceptor: 401 → gọi refresh → retry request gốc. Refresh thất bại → logout + redirect /login
- Export typed functions: `get<T>`, `post<T>`, `put<T>`, `patch<T>`, `del<T>`

**Auth Store (store/auth.store.ts) — Zustand:**

```typescript
interface AuthStore {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  setUser: (user: User) => void
  initialize: () => Promise<void>  // gọi khi app load, verify token qua GET /auth/me
}
```

Persist accessToken vào localStorage.

**Shared Types (packages/types/index.ts):**

```typescript
export type Role = 'STUDENT' | 'TEACHER' | 'ORG_ADMIN' | 'SUPER_ADMIN'
export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE'
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'
export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'TRUE_FALSE' | 'FILL_BLANK' | 'ESSAY'

export interface User {
  id: string; email: string; displayName: string; avatarUrl?: string;
  role: Role; plan: Plan; organizationId?: string; createdAt: string;
}
export interface Question {
  id: string; type: QuestionType; content: string; config: any;
  tags: string[]; difficulty: number; isPublic: boolean; createdAt: string;
}
export interface Exam {
  id: string; title: string; description?: string; config: any;
  accessCode?: string; status: ExamStatus; questions?: any[]; createdAt: string;
}
export interface Attempt {
  id: string; examId: string; status: AttemptStatus; answers: any[];
  totalScore?: number; maxScore?: number; startedAt: string; submittedAt?: string;
}
```

---

### PHẦN B: Layout & Route Protection

**Route Groups:**

```
app/
├── (auth)/
│   ├── layout.tsx        ← clean, no nav
│   ├── login/page.tsx
│   └── register/page.tsx
├── (student)/
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   └── exams/[code]/page.tsx
└── (teacher)/
    ├── layout.tsx
    └── dashboard/page.tsx
```

**Middleware (middleware.ts):**
- Protected: /dashboard, /exams, /teacher/*
- Chưa login → redirect /login
- Đã login vào /login hoặc /register → redirect theo role: STUDENT → /dashboard, TEACHER+ → /teacher/dashboard

**Auth Layout:** Clean, centered card, gradient background nhẹ, logo ở trên.

**Teacher Layout:** Sidebar với các link (Dashboard, Ngân hàng câu hỏi, Đề thi, Analytics, Cài đặt) + Header (avatar, tên, logout).

**Student Layout:** Header đơn giản (logo, tên user, Trang chủ, Lịch sử, logout).

---

### PHẦN C: Auth Pages

**Login Page:**
- Fields: Email, Password (toggle show/hide)
- useForm + zod validation
- Loading state trên nút submit
- Success → redirect theo role
- Error → hiển thị message từ API
- Link đến Register

**Register Page:**
- Fields: Họ và tên, Email, Password, Confirm Password
- Role selection: Radio "Tôi là..." — Học sinh / Giáo viên
- Validate confirmPassword === password
- Success → auto login → redirect

---

### PHẦN D: Shared Components

```
components/
├── ui/
│   ├── Button.tsx     ← variants: primary, secondary, danger, ghost + loading state
│   ├── Input.tsx      ← with label, error message
│   ├── Card.tsx
│   ├── Badge.tsx      ← status badges với màu khác nhau
│   ├── Spinner.tsx
│   ├── Alert.tsx      ← success/error/warning/info
│   └── Modal.tsx      ← dialog overlay
├── layout/
│   ├── TeacherSidebar.tsx
│   ├── TeacherHeader.tsx
│   └── StudentHeader.tsx
└── providers/
    └── QueryProvider.tsx  ← React Query provider
```

**Design guidelines:**
- Tailwind CSS thuần túy
- Primary color: #1E40AF (blue)
- Font: Inter (Google Fonts)
- Border radius: rounded-lg cho cards, rounded-md cho inputs/buttons
- Spacing chuẩn: p-4, p-6 cho cards
- Hover states trên tất cả interactive elements
- Mobile responsive (không phải ưu tiên hàng đầu Phase 1)

---

## PROMPT 6 — Teacher: Question Bank + Exam Builder

**Context:** Next.js 14, App Router. Auth store, API client, React Query, react-hook-form+zod đã setup. Teacher layout và shared UI components đã xong.

API endpoints dùng trong prompt này:
- Questions: GET/POST /questions, GET/PATCH/DELETE /questions/:id
- Exams: GET/POST /exams, GET/PATCH /exams/:id, POST /exams/:id/questions, PATCH /exams/:id/publish

### PHẦN A: Ngân hàng câu hỏi

**Question List Page (app/(teacher)/questions/page.tsx):**
- Header: "Ngân hàng câu hỏi" + button "Tạo câu hỏi mới"
- Filter bar: dropdown Type, dropdown Difficulty (Dễ/TB/Khó), search box debounce 300ms
- Grid/Table câu hỏi với pagination
- useQuery(['questions', filters], fetchQuestions)

Question Card hiển thị: loại câu (badge), preview 50 ký tự, tags (chip), độ khó (⭐), actions (Sửa, Xoá)

**Question Form (dùng chung cho /questions/new và /questions/[id]/edit):**

Step 1 — Chọn loại: 5 cards lớn để chọn type.

Step 2 — Nhập nội dung câu hỏi (Markdown supported, có preview button).

Step 3 — Cấu hình theo loại:

- MULTIPLE_CHOICE: 4 input fields (A/B/C/D), radio chọn đáp án đúng, nút thêm (max 6) / xoá (min 2)
- MULTIPLE_SELECT: tương tự nhưng dùng Checkbox
- TRUE_FALSE: Radio Đúng / Sai
- FILL_BLANK: input đáp án chấp nhận (thêm nhiều được), toggle phân biệt hoa thường
- ESSAY: textarea rubric, input giới hạn từ (optional)

Phần chung: textarea giải thích đáp án, tags input (type + Enter), difficulty selector (1/2/3), toggle isPublic.

Validation bằng zod, submit POST hoặc PATCH.

---

### PHẦN B: Quản lý đề thi

**Exam List Page (app/(teacher)/exams/page.tsx):**
- Header: "Đề thi của tôi" + button "Tạo đề thi mới"
- Filter: status (Draft/Published/Archived)
- Exam Card: tiêu đề, status badge, số câu/tổng điểm, access code (click to copy), thời gian, actions

**Exam Detail/Edit Page (app/(teacher)/exams/[id]/page.tsx) — Layout 2 cột:**

Cột trái (40%) — Form thông tin:
- Tiêu đề, mô tả
- Config: thời gian (phút, 0=không giới hạn), số lần làm tối đa, toggle shuffle questions, toggle shuffle options, toggle hiện đáp án sau nộp, date picker mở/đóng
- Access code (display only, nút copy)
- Buttons: Lưu nháp / Publish

Cột phải (60%) — Danh sách câu hỏi:
- Drag & drop sắp xếp (dùng @dnd-kit/core)
- Mỗi câu: số thứ tự, preview nội dung, điểm (editable input), nút xoá
- Tổng điểm hiển thị cuối danh sách
- Button "Thêm câu hỏi từ ngân hàng"

Modal thêm câu hỏi:
- Search + filter trong question bank
- Checkbox chọn nhiều
- Nhập điểm cho từng câu (default 1)
- Button "Thêm X câu đã chọn"

**Create Exam Page (app/(teacher)/exams/new/page.tsx):**
- Wizard 2 bước: Bước 1 thông tin cơ bản → Bước 2 redirect sang /exams/[id] để thêm câu hỏi

---

### PHẦN C: Exam Results Page (app/(teacher)/exams/[id]/results/page.tsx)

Stats cards hàng đầu: tổng lượt làm, điểm TB (%), tỷ lệ pass (>60%), điểm cao/thấp nhất.

Score distribution chart: Recharts BarChart, X=range điểm (0-10%...100%), Y=số học sinh.

Question analysis table:
- Cột: câu hỏi, lượt trả lời, tỷ lệ đúng (progress bar), thời gian TB
- Sort được theo tỷ lệ đúng
- Highlight câu có tỷ lệ đúng < 30% (nền đỏ nhạt)

Student list: tên, điểm, thời gian nộp, status. Click để xem chi tiết attempt.

---

## PROMPT 7 — Student: Exam Taking UI

**Context:** Next.js 14, App Router. Auth store, API client, React Query đã xong. Student layout đã xong.

API endpoints:
- POST /attempts — bắt đầu thi
- PUT /attempts/:id/answers — lưu đáp án
- POST /attempts/:id/submit — nộp bài
- GET /attempts/:id — xem kết quả
- GET /attempts — lịch sử
- GET /exams/code/:code — tìm exam bằng code

### PHẦN A: Student Dashboard (app/(student)/dashboard/page.tsx)

- Welcome header "Xin chào, [tên]!"
- Card lớn "Vào thi bằng mã" → input access code + button "Vào thi"
- Section "Lần làm bài gần đây" → 5 attempt gần nhất với điểm

### PHẦN B: Xác nhận vào thi (app/(student)/exams/[code]/page.tsx)

1. Gọi GET /exams/code/:code
2. Hiển thị: tiêu đề, mô tả, số câu, thời gian làm, số lần còn lại, thời gian mở/đóng
3. Nút "Bắt đầu làm bài" → POST /attempts
4. Nếu exam chưa mở/đã đóng → thông báo phù hợp
5. Nếu hết lượt → "Bạn đã hết lượt làm bài"

### PHẦN C: Giao diện làm bài (app/(student)/attempts/[id]/page.tsx)

**Layout tổng thể:**

```
┌─────────────────────────────────────────────────────┐
│  [Logo]   Đề thi: [Tên đề]              [Timer]     │
├───────────────────────────┬─────────────────────────┤
│                           │   Điều hướng câu        │
│   Nội dung câu hỏi        │   [1][2][3][4]...       │
│                           │   Xám=chưa xem          │
│   [Các đáp án]            │   Vàng=xem chưa trả lời │
│                           │   Xanh=đã trả lời        │
│                           │                         │
│                           │   [Nộp bài]             │
├───────────────────────────┴─────────────────────────┤
│  [← Câu trước]                    [Câu tiếp theo →] │
└─────────────────────────────────────────────────────┘
```

**Timer Component:**
- Đếm ngược MM:SS từ duration
- Chuyển màu đỏ khi còn < 5 phút
- Warning toast khi còn 2 phút
- Hết giờ → auto submit
- Không có duration → ẩn timer
- Khi mở lại tab (resume): tính thời gian còn lại = startedAt + duration - now

**Question Navigator:**
- Grid số thứ tự câu
- Màu: Xám=chưa xem, Vàng=đã xem chưa trả lời, Xanh=đã trả lời, border highlight=đang xem
- Click để jump đến câu đó

**Question Display theo type:**

MULTIPLE_CHOICE:
```
Câu 3 / 20                                    [3 điểm]
──────────────────────────────────────────────────────
Nội dung câu hỏi?

○  A. Đáp án A
○  B. Đáp án B
●  C. Đáp án C    ← highlight xanh khi đã chọn
○  D. Đáp án D
```

MULTIPLE_SELECT: Checkbox thay Radio, label "(Chọn tất cả đáp án đúng)"

TRUE_FALSE: Radio Đúng / Sai

FILL_BLANK: Input text, placeholder "Nhập câu trả lời..."

ESSAY: Textarea lớn + word count (nếu có maxWords)

**Auto-save:**
- Mỗi khi chọn đáp án / nhập text → debounce 1 giây → PUT /attempts/:id/answers
- Khi chuyển câu → save câu hiện tại trước
- Hiển thị trạng thái nhỏ ở góc: "Đang lưu..." / "Đã lưu" / "Lỗi lưu"

**Submit flow:**
1. Click "Nộp bài"
2. Modal confirm: "Bạn còn X câu chưa trả lời. Bạn có chắc muốn nộp?"
3. Confirm → POST /attempts/:id/submit → loading → redirect kết quả

**Anti-cheat cơ bản:**
- Khi vào trang thi → request Fullscreen API
- Lắng nghe `visibilitychange`: tab ẩn → tăng tab_switch_count, hiện warning toast "Bạn đã rời khỏi trang thi! (lần X)", gọi API ghi log
- Lắng nghe `fullscreenchange`: thoát fullscreen → warning + yêu cầu vào lại

### PHẦN D: Trang kết quả (app/(student)/attempts/[id]/result/page.tsx)

Layout kết quả:

```
┌─────────────────────────────────────────┐
│          KẾT QUẢ BÀI THI               │
│                                         │
│    [Score Ring: 8.5/10 = 85%]          │
│                                         │
│  ✅ Đúng: 17  ❌ Sai: 3  ○ Bỏ: 0      │
│  ⏱ Thời gian: 24 phút 33 giây         │
└─────────────────────────────────────────┘
```

Chi tiết từng câu (nếu showResultAfter=true):
- Hiển thị câu hỏi
- Đáp án của user: xanh nếu đúng, đỏ nếu sai
- Đáp án đúng (nếu user sai)
- Giải thích (nếu có)
- Icon ✅ / ❌ rõ ràng

Câu essay: hiển thị bài làm + badge "Chờ chấm điểm" màu vàng.

Buttons cuối: "Về trang chủ" + "Làm lại" (nếu còn lượt).

### PHẦN E: Lịch sử làm bài (app/(student)/history/page.tsx)

Table: Tên đề thi, Điểm (x/total), Phần trăm, Thời gian nộp, Status. Click row → xem lại kết quả.

### PHẦN F: Exam State Management

Zustand store riêng (examStore):

```typescript
interface ExamStore {
  attempt: Attempt | null
  questions: Question[]
  currentIndex: number
  answers: Record<string, any>     // questionId → answer
  viewedQuestions: Set<string>     // để tính màu navigator
  savedStatus: 'saved' | 'saving' | 'error'
  tabSwitchCount: number

  setAttempt: (attempt: Attempt) => void
  setCurrentIndex: (index: number) => void
  saveAnswer: (questionId: string, answer: any) => void
  markViewed: (questionId: string) => void
  submitExam: () => Promise<void>
  incrementTabSwitch: () => void
}
```

---

## PROMPT 8 — Deploy, README & Polish

**Context:** Tất cả tính năng Phase 1 đã xong. Cần deploy và chuẩn bị portfolio.

### PHẦN A: Environment & Security

**Validate env khi startup (apps/api/src/config/env.validation.ts):**
Dùng Joi hoặc zod. Nếu thiếu env quan trọng → throw error, không để app chạy broken.

Variables cần validate:
- DATABASE_URL (required)
- REDIS_URL (required)
- JWT_SECRET (required, minLength 32)
- JWT_REFRESH_SECRET (required, minLength 32)
- JWT_EXPIRES_IN (default '15m')
- JWT_REFRESH_EXPIRES_IN (default '7d')
- PORT (default 3001)
- FRONTEND_URL (required)
- NODE_ENV: 'development' | 'production' | 'test'

**CORS:** Origins = FRONTEND_URL + localhost:3000 (dev). Credentials: true.

**Security (cài @nestjs/throttler + helmet):**
- Rate limit: 100 req/15min general, 5 req/15min cho auth endpoints
- Helmet security headers
- Global validation pipe: whitelist:true, forbidNonWhitelisted:true

### PHẦN B: Docker & Deploy

**Dockerfile (apps/api/Dockerfile):**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma
RUN npm install --production
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

**railway.toml (root):**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/api/Dockerfile"

[deploy]
startCommand = "npx prisma migrate deploy && node dist/main.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
```

**Health check endpoint:**
`GET /health` → `{ status: 'ok', timestamp: Date, database: 'connected', redis: 'connected' }`
Thực sự ping DB và Redis để verify.

**Vercel (web) — vercel.json:**

```json
{
  "buildCommand": "pnpm --filter web build",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```

Set env var `NEXT_PUBLIC_API_URL` = Railway API URL.

### PHẦN C: README.md (root) — Tiếng Anh cho portfolio quốc tế

Viết README đầy đủ theo cấu trúc sau:

1. **Title + Badges** (Node.js, NestJS, Next.js, PostgreSQL, TypeScript, MIT License)
2. **Tagline** — 2 dòng mô tả ngắn gọn
3. **Live Demo** — link Frontend + API Docs
4. **Features** — 10 features chính với emoji
5. **Architecture** — ASCII diagram system architecture
6. **Tech Stack** — Table: Layer | Technology | Purpose
7. **Database Schema** — ERD dùng Mermaid:

```
erDiagram
    User ||--o{ Question : creates
    User ||--o{ Exam : creates
    User ||--o{ Attempt : makes
    Exam ||--|{ ExamQuestion : contains
    Question ||--|{ ExamQuestion : included_in
    Attempt }|--|| Exam : for
```

8. **Getting Started** — Prerequisites, Installation, Running locally
9. **API Reference** — Table: Method | Endpoint | Description | Auth Required
10. **Security Features** — list anti-cheat, JWT, rate limiting
11. **Roadmap** — Phase 1-4 brief
12. **License** — MIT

### PHẦN D: Swagger API Docs

Cài `@nestjs/swagger`. Mỗi endpoint có @ApiOperation, @ApiResponse. Group theo tags: Auth, Users, Questions, Exams, Attempts, Analytics. Accessible tại `/api-docs`. Có Bearer token auth trong Swagger UI.

### PHẦN E: Seed Data (apps/api/prisma/seed.ts)

Tạo accounts demo:
- teacher@demo.com / Demo123! (TEACHER)
- student@demo.com / Demo123! (STUDENT)
- student2@demo.com / Demo123! (STUDENT)

Tạo dữ liệu mẫu:
- 10 câu hỏi đa dạng loại
- 2 đề thi đã PUBLISHED (1 có timer 30 phút, 1 không giới hạn)
- 3 attempts đã SUBMITTED với kết quả

Run: `npx prisma db seed`

### PHẦN F: Demo Video Script (4 phút)

- 00:00–00:30 — Intro: show running app, nêu tech stack
- 00:30–01:30 — Teacher flow: login → tạo câu hỏi → tạo đề thi → publish
- 01:30–02:30 — Student flow: nhập code → làm bài → auto-save → submit → kết quả
- 02:30–03:30 — Analytics: teacher xem kết quả, biểu đồ, câu khó nhất
- 03:30–04:00 — Quick code walkthrough: kiến trúc, 1 service, 1 guard

---

## Thứ tự thực hiện

| Bước | Prompt | Nội dung | Ước tính |
|------|--------|----------|----------|
| 1 | Prompt 1 | Project setup + DB schema | 2–3 giờ |
| 2 | Prompt 2 | Auth backend | 3–4 giờ |
| 3 | Prompt 3 | Question + Exam backend | 4–5 giờ |
| 4 | Prompt 4 | Attempt + Grading + Analytics | 4–5 giờ |
| 5 | Prompt 5 | Frontend Auth + Layout | 3–4 giờ |
| 6 | Prompt 6 | Teacher UI | 5–6 giờ |
| 7 | Prompt 7 | Student Exam-taking UI | 5–6 giờ |
| 8 | Prompt 8 | Deploy + README + Polish | 3–4 giờ |

**Tổng ước tính:** 29–37 giờ làm việc thực tế (~2 tháng nếu làm part-time)

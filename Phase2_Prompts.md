# ExamFlow — Phase 2 Coding Prompts
# Nâng cấp kỹ thuật: Anti-cheat + AI + Multi-tenancy + Testing

> Yêu cầu: Phase 1 đã hoàn thành và deploy.  
> Context dùng cho AI: "Project ExamFlow — monorepo NestJS + Next.js + PostgreSQL + Prisma + Redis. Phase 1 đã xong. Đang build Phase 2."  
> Thứ tự khuyến nghị: Prompt 1 → 2 → 3 → 4 → 5 → 6 → 7

---

## PROMPT 1 — Anti-cheat: Backend (Server-side Enforcement)

**Context:** Phase 1 đã xong. Attempt model đã có. Cần bổ sung hệ thống ghi log gian lận và enforce server-side.

### Mục tiêu

Mọi logic chống gian lận phải được enforce ở server — client chỉ gửi event, server quyết định hành động.

### 1. Migration: Thêm trường vào Attempt

Thêm các trường sau vào Attempt model trong schema.prisma:

```prisma
model Attempt {
  // ... các trường cũ giữ nguyên

  // Anti-cheat fields
  tabSwitchCount   Int      @default(0)
  tabSwitchLog     Json     @default("[]")
  // tabSwitchLog schema: [{ timestamp: string, count: number }]

  fullscreenExits  Int      @default(0)
  fullscreenLog    Json     @default("[]")
  // fullscreenLog schema: [{ timestamp: string, duration: number }]

  warningCount     Int      @default(0)
  isFlagged        Boolean  @default(false)
  flagReason       String?
}
```

Chạy migration: `npx prisma migrate dev --name add_anticheat_fields`

### 2. Anti-cheat Service (src/attempts/anticheat.service.ts)

Tạo AntiCheatService với các methods:

`recordTabSwitch(attemptId: string, timestamp: string)`:
- Validate attempt tồn tại và status=IN_PROGRESS
- Tăng tabSwitchCount
- Append vào tabSwitchLog: `{ timestamp, count: tabSwitchCount mới }`
- Tính warningCount: nếu tabSwitchCount >= 3 → tăng warningCount
- Nếu tabSwitchCount >= 5 → set isFlagged=true, flagReason="Rời khỏi trang thi 5 lần"
- Return: `{ tabSwitchCount, warningCount, isFlagged, shouldAutoSubmit }`
- shouldAutoSubmit = true nếu isFlagged và tabSwitchCount >= 10

`recordFullscreenExit(attemptId: string, timestamp: string, durationMs: number)`:
- Tương tự tabSwitch nhưng cho fullscreen
- Append vào fullscreenLog: `{ timestamp, duration: durationMs }`
- Tăng fullscreenExits
- Nếu fullscreenExits >= 3 → tăng warningCount
- Return: `{ fullscreenExits, warningCount, isFlagged }`

`getAntiCheatReport(attemptId: string, requesterId: string)`:
- Chỉ creator của exam hoặc org_admin mới xem được
- Return toàn bộ anti-cheat data của attempt

`checkTimerValidity(attemptId: string)`:
- Check Redis key `attempt:{attemptId}:timer` còn tồn tại không
- Nếu không tồn tại và exam có duration → return `{ expired: true }`
- Return `{ expired: false, remainingSeconds: ttl }`

### 3. Anti-cheat Controller (thêm vào attempts.controller.ts)

Thêm các endpoints:

- `POST /attempts/:id/events/tab-switch`
  - Body: `{ timestamp: string }`
  - Guard: JwtAuthGuard
  - Validate user sở hữu attempt
  - Gọi anticheatService.recordTabSwitch()
  - Nếu shouldAutoSubmit → tự động gọi attemptService.submit()
  - Return: `{ warning: string | null, autoSubmitted: boolean }`

- `POST /attempts/:id/events/fullscreen-exit`
  - Body: `{ timestamp: string, durationMs: number }`
  - Tương tự tab-switch

- `GET /attempts/:id/anticheat-report`
  - Guard: JwtAuthGuard + chỉ TEACHER/ORG_ADMIN/SUPER_ADMIN
  - Return báo cáo anti-cheat đầy đủ

- `GET /attempts/:id/timer-status`
  - Guard: JwtAuthGuard
  - Return: `{ remainingSeconds: number | null, expired: boolean }`
  - Dùng để client đồng bộ timer khi resume attempt

### 4. Cron Job: Auto-submit hết giờ (src/tasks/tasks.module.ts)

Cài @nestjs/schedule. Tạo TasksModule với TasksService:

`handleExpiredAttempts()` — chạy mỗi 1 phút (`@Cron('* * * * *')`):
1. Query tất cả attempt có status=IN_PROGRESS
2. Với mỗi attempt, gọi `checkTimerValidity(attemptId)`
3. Nếu expired=true → gọi `attemptService.submit(userId, attemptId)` (internal call, bỏ qua auth check)
4. Log số lượng attempt bị auto-submit

Lưu ý: cần internal method `submitInternal(attemptId)` trong AttemptService không check ownership, chỉ dùng cho cron job.

### 5. Exam Results — Thêm anti-cheat summary

Cập nhật `getExamStats()` trong AnalyticsService để thêm:

```typescript
antiCheatSummary: {
  flaggedAttempts: number,
  averageTabSwitches: number,
  suspiciousAttempts: Array<{
    attemptId: string,
    userId: string,
    displayName: string,
    tabSwitchCount: number,
    fullscreenExits: number,
    isFlagged: boolean
  }>
}
```

---

## PROMPT 2 — Anti-cheat: Frontend (Exam-taking UI)

**Context:** Phase 1 frontend đã xong. Anti-cheat backend (Prompt 1) đã xong. Cần bổ sung anti-cheat logic vào giao diện làm bài `app/(student)/attempts/[id]/page.tsx`.

### 1. Fullscreen Manager (hooks/useFullscreen.ts)

Tạo custom hook:

```typescript
interface UseFullscreenReturn {
  isFullscreen: boolean
  requestFullscreen: () => Promise<void>
  exitCount: number
}
```

Logic:
- Khi mount: gọi `document.documentElement.requestFullscreen()` tự động
- Lắng nghe `document.addEventListener('fullscreenchange', handler)`
- Khi detect exit fullscreen (document.fullscreenElement === null):
  - Ghi lại `exitStartTime = Date.now()`
  - Tăng exitCount
  - Gọi API `POST /attempts/:id/events/fullscreen-exit` với `{ timestamp, durationMs: Date.now() - exitStartTime }`
  - Hiện overlay yêu cầu vào lại fullscreen (không thể tắt)
- Khi unmount: `document.exitFullscreen()` nếu đang fullscreen

### 2. Tab Switch Monitor (hooks/useTabSwitch.ts)

```typescript
interface UseTabSwitchReturn {
  switchCount: number
  lastWarning: string | null
}
```

Logic:
- Lắng nghe `document.addEventListener('visibilitychange', handler)`
- Khi `document.visibilityState === 'hidden'`:
  - Tăng local switchCount
  - Gọi API `POST /attempts/:id/events/tab-switch` với `{ timestamp: new Date().toISOString() }`
  - Từ response nhận warning message và autoSubmitted flag
  - Nếu autoSubmitted=true → redirect ngay sang trang kết quả với message "Bài thi đã bị nộp tự động do vi phạm quy định"
- Khi `document.visibilityState === 'visible'`:
  - Hiện toast warning (nếu có warning từ response)

### 3. Timer Sync (hooks/useExamTimer.ts) — Cập nhật từ Phase 1

Cải tiến timer để đồng bộ với server:

- Khi component mount (kể cả resume): gọi `GET /attempts/:id/timer-status`
- Nếu `expired=true` → submit ngay, không hiện timer
- Nếu `expired=false` → dùng `remainingSeconds` từ server làm giá trị khởi tạo (không dùng localStorage)
- Đồng bộ lại với server mỗi 60 giây để tránh drift
- Khi countdown đến 0: gọi submit trước khi server cron xử lý

### 4. Fullscreen Required Overlay (components/exam/FullscreenOverlay.tsx)

Component hiển thị khi user thoát fullscreen:

```
┌─────────────────────────────────────────┐
│                                         │
│   ⚠️  Bạn đã thoát chế độ toàn màn     │
│                                         │
│   Vui lòng quay lại để tiếp tục bài    │
│   thi. Lần thoát: 2/3                  │
│                                         │
│   [Quay lại toàn màn hình]             │
│                                         │
│   ⚠️ Thoát 3 lần sẽ bị ghi nhận       │
│      là vi phạm quy định thi.           │
└─────────────────────────────────────────┘
```

- Overlay full screen, z-index cao nhất
- Không thể đóng bằng Escape hay click ngoài
- Chỉ đóng khi user click nút và fullscreen thành công

### 5. Warning Toast System (components/exam/ExamWarningToast.tsx)

Toast xuất hiện ở góc trên phải, không thể tắt, tự đóng sau 5 giây:

- Level 1 (tabSwitch 1-2): Vàng — "Cảnh báo: Bạn đã rời khỏi trang thi (lần X)"
- Level 2 (tabSwitch 3-4): Cam — "Cảnh báo nghiêm trọng: Bài thi của bạn đang bị theo dõi"
- Level 3 (tabSwitch 5+): Đỏ — "Vi phạm quy định: Bài thi sẽ bị nộp tự động nếu tiếp tục"

### 6. Cập nhật Exam-taking Page

Tích hợp tất cả hooks vào page:

```typescript
// Trong component
const { isFullscreen, requestFullscreen, exitCount } = useFullscreen(attemptId)
const { switchCount, lastWarning } = useTabSwitch(attemptId, onAutoSubmit)
const { remainingSeconds, isExpired } = useExamTimer(attemptId, exam.config.duration)

// Handler khi bị auto-submit
const onAutoSubmit = () => {
  router.push(`/attempts/${attemptId}/result?reason=autosubmit`)
}
```

Thêm vào result page: nếu query param `reason=autosubmit` → hiện banner "Bài thi đã được nộp tự động do hết giờ / vi phạm quy định".

### 7. Anti-cheat Report trong Teacher UI

Cập nhật `app/(teacher)/exams/[id]/results/page.tsx`:

Thêm tab "Báo cáo gian lận" bên cạnh tab kết quả hiện tại:

- Bảng học sinh bị flag: tên, số lần rời tab, số lần thoát fullscreen, badge "Bị đánh dấu"
- Click vào row → modal hiển thị timeline chi tiết (timestamp từng sự kiện)
- Badge màu đỏ trên tab nếu có attempt bị flag

---

## PROMPT 3 — AI: Sinh câu hỏi từ tài liệu

**Context:** Phase 1 + Anti-cheat đã xong. Cần tích hợp AI để giáo viên upload file PDF/DOCX và tự động sinh câu hỏi.

### PHẦN A: Backend — AI Module

**Cài packages:**
- `@anthropic-ai/sdk` (hoặc `openai` nếu dùng OpenAI)
- `multer` + `@types/multer` (file upload)
- `pdf-parse` (đọc PDF)
- `mammoth` (đọc DOCX)

**Cấu trúc:**

```
src/ai/
├── ai.module.ts
├── ai.controller.ts
├── ai.service.ts
├── document-parser.service.ts
└── dto/
    ├── generate-questions.dto.ts
    └── generate-from-text.dto.ts
```

**1. Document Parser Service (document-parser.service.ts)**

`extractText(file: Express.Multer.File): Promise<string>`:
- Nếu mimetype = `application/pdf` → dùng pdf-parse
- Nếu mimetype = `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → dùng mammoth
- Nếu mimetype = `text/plain` → đọc trực tiếp buffer.toString()
- Giới hạn text: tối đa 15000 ký tự (cắt bớt nếu dài hơn, thêm note "... [nội dung đã được cắt bớt]")
- Throw BadRequestException nếu file type không được hỗ trợ

`sanitizeText(text: string): string`:
- Loại bỏ ký tự đặc biệt không cần thiết
- Chuẩn hóa whitespace
- Giữ lại dấu tiếng Việt

**2. DTOs**

GenerateQuestionsDto:
- questionTypes: QuestionType[] — mảng loại câu muốn sinh (required, min 1)
- count: number — tổng số câu (required, min 1, max 30)
- difficulty: 1 | 2 | 3 — độ khó (required)
- language: 'vi' | 'en' — ngôn ngữ câu hỏi (default 'vi')
- additionalInstructions?: string — hướng dẫn thêm cho AI (max 500 ký tự)

GenerateFromTextDto: Giống trên nhưng thêm field `text: string` (MinLength 100, MaxLength 15000) thay vì upload file.

**3. AI Service (ai.service.ts)**

`generateQuestionsFromText(text: string, dto: GenerateQuestionsDto, userId: string)`:

Bước 1 — Xây dựng system prompt:

```
Bạn là chuyên gia giáo dục có nhiệm vụ tạo câu hỏi kiểm tra từ nội dung tài liệu.

Quy tắc bắt buộc:
1. Câu hỏi phải bám sát nội dung tài liệu, không bịa đặt thông tin
2. Ngôn ngữ: [language]
3. Trả về JSON hợp lệ, không có text thừa trước hoặc sau JSON
4. Đảm bảo đáp án chính xác và có giải thích rõ ràng

Format JSON output:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE | MULTIPLE_SELECT | TRUE_FALSE | FILL_BLANK | ESSAY",
      "content": "Nội dung câu hỏi",
      "config": { /* theo type, xem schema bên dưới */ },
      "tags": ["tag1", "tag2"],
      "difficulty": 1 | 2 | 3,
      "explanation": "Giải thích tại sao đây là đáp án đúng"
    }
  ]
}

Config schema theo từng type: [paste schema từ Prompt 3 Phase 1]
```

Bước 2 — User prompt:

```
Tài liệu:
---
[text đã extract và sanitize]
---

Yêu cầu:
- Tạo [count] câu hỏi
- Loại câu hỏi: [questionTypes join(', ')]
- Độ khó: [difficulty] (1=dễ, 2=trung bình, 3=khó)
- [additionalInstructions nếu có]

Phân bổ số lượng đều nhau giữa các loại câu hỏi được yêu cầu.
```

Bước 3 — Gọi API:
- Model: claude-sonnet-4-20250514 (hoặc gpt-4o-mini nếu dùng OpenAI)
- max_tokens: 4000
- Parse JSON response
- Validate từng question có đủ field không
- Throw InternalServerErrorException nếu AI trả về JSON không hợp lệ (retry 1 lần)

Bước 4 — Rate limiting:
- Lưu Redis key `ai:ratelimit:{userId}` với count và TTL 1 giờ
- Free plan: tối đa 5 lần generate/giờ
- Pro plan: tối đa 30 lần generate/giờ
- Throw TooManyRequestsException nếu vượt giới hạn

`generateQuestionsFromFile(file: Express.Multer.File, dto: GenerateQuestionsDto, userId: string)`:
- Gọi documentParser.extractText(file) trước
- Rồi gọi generateQuestionsFromText()

`suggestTags(content: string): Promise<string[]>`:
- Prompt ngắn gọn: "Từ nội dung câu hỏi sau, gợi ý 3-5 tags ngắn gọn (1-2 từ mỗi tag). Trả về JSON array. Nội dung: [content]"
- Dùng claude-haiku (model nhỏ hơn, rẻ hơn)

`suggestDifficulty(content: string, correctAnswer: any): Promise<1 | 2 | 3>`:
- Tương tự, prompt ngắn: "Đánh giá độ khó (1=dễ/2=trung bình/3=khó) cho câu hỏi sau. Trả về chỉ 1 số. Câu hỏi: [content]. Đáp án: [correctAnswer]"

**4. AI Controller (ai.controller.ts)**

Guard: JwtAuthGuard + chỉ TEACHER/ORG_ADMIN/SUPER_ADMIN

- `POST /ai/generate/file`
  - Dùng `FileInterceptor('file')` từ @nestjs/platform-express
  - File size limit: 10MB
  - Allowed mimetypes: pdf, docx, txt
  - Body (multipart): GenerateQuestionsDto fields + file
  - Return: `{ questions: GeneratedQuestion[], extractedTextPreview: string (200 ký tự đầu), tokensUsed: number }`

- `POST /ai/generate/text`
  - Body: GenerateFromTextDto
  - Không cần file upload
  - Return: giống trên

- `POST /ai/suggest/tags`
  - Body: `{ content: string }`
  - Return: `{ tags: string[] }`

- `POST /ai/suggest/difficulty`
  - Body: `{ content: string, correctAnswer: any }`
  - Return: `{ difficulty: 1 | 2 | 3 }`

- `GET /ai/usage`
  - Return: `{ used: number, limit: number, resetsAt: string }` — usage trong giờ hiện tại

---

### PHẦN B: Frontend — AI Question Generator

**1. AI Generator Modal (components/teacher/AIGeneratorModal.tsx)**

Wizard 3 bước trong modal:

**Bước 1 — Upload tài liệu:**

Tab 1: Upload file
- Drag & drop zone (accept: .pdf, .docx, .txt, max 10MB)
- Preview tên file + size sau khi chọn
- Nút "Xoá" để chọn lại

Tab 2: Dán văn bản
- Textarea lớn, placeholder "Dán nội dung tài liệu vào đây..."
- Character count: X / 15000

**Bước 2 — Cấu hình sinh câu hỏi:**

- Checkbox group "Loại câu hỏi cần sinh": (Trắc nghiệm 1 đáp án / Nhiều đáp án / Đúng-Sai / Điền vào chỗ trống / Tự luận)
- Slider hoặc input "Số câu hỏi": 1–30
- Radio "Độ khó": Dễ / Trung bình / Khó
- Dropdown "Ngôn ngữ": Tiếng Việt / English
- Textarea "Hướng dẫn thêm" (optional, placeholder: "VD: Tập trung vào phần định nghĩa và ví dụ")
- Hiển thị: "Bạn còn X lần generate trong giờ này"

**Bước 3 — Xem và chọn câu hỏi:**

- Loading state đẹp: spinner + "AI đang phân tích tài liệu..." (khoảng 10-20 giây)
- Sau khi xong: list các câu hỏi được sinh ra
- Mỗi câu hỏi hiển thị: loại (badge), nội dung, đáp án đúng, giải thích
- Checkbox để chọn câu muốn thêm vào ngân hàng
- Nút "Chọn tất cả" / "Bỏ chọn tất cả"
- Nút "Sinh lại" (gọi lại API với cùng input)
- Nút "Thêm X câu đã chọn vào ngân hàng" → gọi POST /questions cho từng câu

**2. Tích hợp vào Question Bank Page**

Thêm button "✨ Sinh câu hỏi bằng AI" bên cạnh button "Tạo câu hỏi mới". Click → mở AIGeneratorModal.

**3. Tích hợp vào Question Form**

Thêm 2 nút nhỏ bên cạnh field tags và difficulty:
- "Gợi ý tags" → gọi `POST /ai/suggest/tags` → auto-fill tags field
- "Gợi ý độ khó" → gọi `POST /ai/suggest/difficulty` → auto-select difficulty

---

## PROMPT 4 — Spaced Repetition Engine

**Context:** Phase 1 + Anti-cheat + AI đã xong. Thêm tính năng ôn tập thông minh cho học sinh.

### PHẦN A: Backend

**1. Migration: Thêm bảng mới**

```prisma
model ReviewCard {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  questionId     String
  question       Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  // SM-2 Algorithm fields
  easeFactor     Float    @default(2.5)  // E-Factor, min 1.3
  interval       Int      @default(1)    // ngày đến lần review tiếp
  repetitions    Int      @default(0)    // số lần đã review thành công
  nextReviewAt   DateTime @default(now())
  lastReviewedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, questionId])
  @@index([userId, nextReviewAt])
}

model ReviewSession {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  cards     Json     // [{ questionId, quality, timeTaken }]
  reviewedAt DateTime @default(now())
}
```

Thêm relation vào User và Question model.

**2. SM-2 Algorithm Service (src/review/sm2.service.ts)**

Implement thuật toán SM-2 (Spaced Repetition):

```typescript
interface SM2Input {
  easeFactor: number   // EF hiện tại
  interval: number     // interval hiện tại (ngày)
  repetitions: number  // số lần đã review thành công
  quality: number      // 0-5 (0-1: sai hoàn toàn, 2: sai nhưng nhớ khi thấy, 3: đúng khó khăn, 4: đúng sau chút suy nghĩ, 5: đúng ngay)
}

interface SM2Output {
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewAt: Date
}
```

Logic SM-2:
- Nếu quality < 3 (trả lời sai): repetitions = 0, interval = 1
- Nếu quality >= 3 (trả lời đúng):
  - repetitions = 0: interval = 1
  - repetitions = 1: interval = 6
  - repetitions > 1: interval = interval * easeFactor (làm tròn)
  - easeFactor = max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  - repetitions += 1
- nextReviewAt = now + interval ngày

**3. Review Service (src/review/review.service.ts)**

`addToReviewQueue(userId: string, questionId: string)`:
- Upsert ReviewCard với giá trị mặc định nếu chưa có
- Nếu đã có → không thay đổi (giữ tiến độ hiện tại)

`getReviewDue(userId: string, limit: number = 20)`:
- Query ReviewCard của user có nextReviewAt <= now()
- Order by nextReviewAt ASC (ưu tiên câu quá hạn lâu nhất)
- Kèm theo Question data đầy đủ
- Return: `{ cards: ReviewCardWithQuestion[], totalDue: number, nextDueAt: Date | null }`

`submitReview(userId: string, questionId: string, quality: number, timeTaken: number)`:
- Validate quality trong 0-5
- Lấy ReviewCard hiện tại
- Chạy SM2 algorithm
- Update ReviewCard với kết quả mới
- Lưu vào ReviewSession
- Return ReviewCard đã cập nhật với nextReviewAt mới

`getReviewStats(userId: string)`:
```typescript
{
  totalCards: number,
  dueToday: number,
  dueTomorrow: number,
  dueThisWeek: number,
  masteredCards: number,       // repetitions >= 5
  newCards: number,            // repetitions === 0
  averageEaseFactor: number,
  streakDays: number           // số ngày review liên tiếp
}
```

`bulkAddFromAttempt(userId: string, attemptId: string)`:
- Lấy tất cả answers của attempt có isCorrect=false hoặc isCorrect=null
- Gọi addToReviewQueue cho từng questionId đó
- Return số lượng câu đã thêm vào queue

**4. Review Controller (src/review/review.controller.ts)**

Guard: JwtAuthGuard (chỉ STUDENT cần tính năng này, nhưng TEACHER cũng được)

- `GET /review/due` — lấy danh sách câu cần ôn (query: ?limit=20)
- `POST /review/submit` — Body: `{ questionId, quality: 0-5, timeTaken: number (ms) }`
- `GET /review/stats` — thống kê ôn tập
- `POST /review/add` — Body: `{ questionId }` — thêm 1 câu thủ công
- `POST /review/add-from-attempt/:attemptId` — thêm câu sai từ attempt

**5. Tự động thêm vào review queue**

Cập nhật `AttemptService.submit()`: sau khi grade xong, gọi `reviewService.bulkAddFromAttempt()` tự động. Học sinh không cần làm gì, câu sai tự động vào queue.

---

### PHẦN B: Frontend — Review Mode

**1. Review Dashboard Widget (components/student/ReviewWidget.tsx)**

Widget nhỏ hiển thị trên Student Dashboard:

```
┌─────────────────────────────────────┐
│  📚 Ôn tập hôm nay                  │
│                                     │
│  🔴 12 câu cần ôn ngay              │
│  🟡 5 câu đến hạn ngày mai          │
│                                     │
│  🔥 Streak: 7 ngày liên tiếp        │
│                                     │
│       [Bắt đầu ôn tập →]           │
└─────────────────────────────────────┘
```

Fetch từ `GET /review/stats`. Nếu dueToday = 0 → hiện "Bạn đã hoàn thành ôn tập hôm nay! 🎉"

**2. Review Session Page (app/(student)/review/page.tsx)**

Layout làm bài ôn tập (tương tự exam-taking nhưng đơn giản hơn):

Hiển thị câu hỏi (giống exam-taking UI, cùng component QuestionDisplay).

Sau khi trả lời, hiện đáp án + giải thích (luôn luôn, không có option ẩn).

Rating bar — học sinh tự đánh giá độ dễ khi nhớ ra đáp án:

```
Bạn nhớ đáp án này như thế nào?

[😰 Quên hoàn toàn] [😕 Nhớ mang máng] [😐 Khó khăn] [🙂 Sau suy nghĩ] [😄 Dễ dàng]
       0                   1                  2             3-4               5
```

Sau khi chọn rating → `POST /review/submit` → load câu tiếp theo.

Progress bar: "Câu 3 / 12 — còn 9 câu"

Màn hình kết thúc session:
```
┌─────────────────────────────────────┐
│        ✅ Ôn tập hoàn thành!        │
│                                     │
│   Đã ôn: 12 câu                    │
│   Thời gian: 8 phút                 │
│                                     │
│   📅 Lịch ôn tiếp theo:            │
│   • 3 câu: ngày mai                 │
│   • 5 câu: 3 ngày nữa              │
│   • 4 câu: 1 tuần nữa             │
└─────────────────────────────────────┘
```

---

## PROMPT 5 — Phụ huynh Dashboard

**Context:** Phase 1 đã xong. Cần thêm loại tài khoản phụ huynh có thể theo dõi con.

### PHẦN A: Backend

**1. Migration**

Cập nhật Role enum trong Prisma:

```prisma
enum Role {
  STUDENT
  TEACHER
  PARENT        // ← thêm mới
  ORG_ADMIN
  SUPER_ADMIN
}
```

Cập nhật bảng ParentStudent để có thêm status:

```prisma
model ParentStudent {
  id        String              @id @default(uuid())
  parentId  String
  parent    User                @relation("Parent", fields: [parentId], references: [id])
  studentId String
  student   User                @relation("Student", fields: [studentId], references: [id])
  status    ParentStudentStatus @default(PENDING)
  createdAt DateTime            @default(now())

  @@unique([parentId, studentId])
}

enum ParentStudentStatus {
  PENDING    // phụ huynh gửi yêu cầu, chờ học sinh confirm
  ACCEPTED
  REJECTED
}
```

**2. Parent Service (src/parent/parent.service.ts)**

`sendLinkRequest(parentId: string, studentEmail: string)`:
- Validate parentId có role=PARENT
- Tìm student bằng email
- Tạo ParentStudent record với status=PENDING
- Không lộ thông tin student nếu không tìm thấy (security)

`respondToLinkRequest(studentId: string, parentId: string, accept: boolean)`:
- Chỉ student mới được gọi endpoint này
- Update status = ACCEPTED hoặc REJECTED

`getMyStudents(parentId: string)`:
- Trả về danh sách student đã ACCEPTED
- Kèm theo stats cơ bản: tổng số attempt, điểm TB tuần này

`getStudentDetail(parentId: string, studentId: string)`:
- Validate parentId đã được ACCEPTED link với studentId
- Trả về:

```typescript
{
  student: { id, displayName, email, avatarUrl },
  recentAttempts: Array<{
    examTitle: string,
    score: number,
    maxScore: number,
    percentage: number,
    submittedAt: Date
  }>,            // 10 lần gần nhất
  weeklyProgress: Array<{
    date: string,
    attemptsCount: number,
    averageScore: number
  }>,            // 7 ngày gần nhất
  reviewStats: {
    dueToday: number,
    streakDays: number
  },
  weakTopics: string[]
}
```

`getPendingRequests(studentId: string)`:
- Trả về danh sách yêu cầu đang chờ của student

**3. Parent Controller (src/parent/parent.controller.ts)**

- `POST /parent/link-request` — Body: `{ studentEmail }` — Guard: PARENT only
- `GET /parent/my-students` — Guard: PARENT only
- `GET /parent/students/:studentId` — Guard: PARENT only, validate đã linked
- `GET /student/parent-requests` — Guard: STUDENT only, xem pending requests
- `PATCH /student/parent-requests/:parentId` — Body: `{ accept: boolean }` — Guard: STUDENT only

---

### PHẦN B: Frontend

**1. Register Page — Thêm role PARENT**

Cập nhật register page: thêm option "Phụ huynh" vào radio group chọn role.

**2. Parent Dashboard (app/(parent)/dashboard/page.tsx)**

Layout mới cho role PARENT:

Sidebar: Tổng quan / Danh sách con / Cài đặt.

Nếu chưa có con nào được link:
```
┌────────────────────────────────────────────┐
│                                            │
│   👨‍👩‍👧 Bắt đầu theo dõi con bạn           │
│                                            │
│   Nhập email của con để gửi yêu cầu kết   │
│   nối. Con bạn sẽ cần xác nhận.           │
│                                            │
│   [Email của con]  [Gửi yêu cầu]          │
└────────────────────────────────────────────┘
```

Nếu đã có con được link → hiển thị card cho từng con:

```
┌─────────────────────────────────────────────┐
│  👤 Nguyễn Văn A                            │
│                                             │
│  📊 Điểm TB tuần này: 78%                  │
│  📝 Đã làm: 5 bài trong 7 ngày             │
│  📚 Ôn tập hôm nay: 3 câu chưa ôn          │
│                                             │
│               [Xem chi tiết →]             │
└─────────────────────────────────────────────┘
```

**3. Student Detail Page (app/(parent)/students/[id]/page.tsx)**

Tabs: Tổng quan / Lịch sử bài thi / Tiến độ ôn tập

Tab Tổng quan:
- Weekly activity chart (Recharts BarChart — 7 ngày, mỗi ngày = số bài + điểm TB)
- Top 3 điểm cao nhất
- Chủ đề yếu nhất (weakTopics)

Tab Lịch sử bài thi:
- Table tương tự student history page nhưng readonly
- Không xem được nội dung đề thi, chỉ xem điểm + thời gian

Tab Tiến độ ôn tập:
- Streak calendar (dạng GitHub contribution graph đơn giản)
- Số câu đến hạn hôm nay

**4. Student: Quản lý yêu cầu phụ huynh**

Thêm section vào Student Settings page (app/(student)/settings/page.tsx):

```
Tài khoản phụ huynh theo dõi

Đang chờ xác nhận:
• Nguyễn Văn B (parent@email.com) — [Chấp nhận] [Từ chối]

Đã kết nối:
• Nguyễn Văn C (dad@email.com) — [Ngắt kết nối]
```

---

## PROMPT 6 — Testing: Unit Test + Integration Test

**Context:** Toàn bộ Phase 1 + Phase 2 features đã xong. Cần viết test để chuẩn bị portfolio và đảm bảo quality.

### PHẦN A: Unit Tests (NestJS)

**Setup:**

```bash
# Đã có sẵn trong NestJS: @nestjs/testing, jest
# Cài thêm:
pnpm add -D @faker-js/faker supertest @types/supertest
```

**1. Grading Service Tests (src/attempts/grading.service.spec.ts)**

Test từng loại câu hỏi:

MULTIPLE_CHOICE:
- Đúng đáp án → isCorrect=true, pointEarned=fullPoint
- Sai đáp án → isCorrect=false, pointEarned=0
- Không trả lời (null) → isCorrect=false, pointEarned=0

MULTIPLE_SELECT:
- Chọn đúng tất cả → full point
- Chọn đúng 1/2 đáp án đúng (không chọn sai) → partial credit 50%
- Chọn đúng 1/2 + chọn thêm 1 sai → partial credit bị trừ
- Chọn sai hết → 0 point

TRUE_FALSE:
- Đúng / Sai đúng → full point
- Ngược lại → 0

FILL_BLANK:
- caseSensitive=false: "Hà Nội" === "hà nội" → đúng
- caseSensitive=true: "Hà Nội" !== "hà nội" → sai
- Nhiều đáp án hợp lệ: match bất kỳ → đúng
- Có trailing space: vẫn match sau khi trim

ESSAY:
- Luôn return isCorrect=null, pointEarned=null

**2. SM-2 Algorithm Tests (src/review/sm2.service.spec.ts)**

- quality=0 (sai hoàn toàn): repetitions reset về 0, interval=1
- quality=5 liên tiếp 5 lần: easeFactor tăng dần, interval tăng theo công thức
- easeFactor không bao giờ < 1.3
- quality=3 sau nhiều lần đúng: interval tăng nhưng EF giảm nhẹ
- nextReviewAt luôn trong tương lai

**3. Auth Service Tests (src/auth/auth.service.spec.ts)**

Mock PrismaService và RedisService.

- register: hash password, không lưu plaintext
- register: email trùng → throw ConflictException
- register: không cho phép role=SUPER_ADMIN
- login: sai password → throw UnauthorizedException
- login: email không tồn tại → throw UnauthorizedException (không lộ thông tin)
- refreshTokens: token không khớp Redis → throw UnauthorizedException
- logout: xoá token khỏi Redis

**4. Anti-cheat Service Tests (src/attempts/anticheat.service.spec.ts)**

- tabSwitch < 3: isFlagged=false, warningCount không tăng
- tabSwitch = 5: isFlagged=true, flagReason được set
- tabSwitch = 10: shouldAutoSubmit=true
- fullscreenExits = 3: warningCount tăng

---

### PHẦN B: Integration Tests (E2E)

**Setup (apps/api/test/jest-e2e.json):**

Dùng test database riêng: `DATABASE_URL` với suffix `_test`.

Tạo `apps/api/test/helpers/`:
- `test-app.helper.ts` — tạo NestJS test app
- `auth.helper.ts` — hàm tạo user và lấy token nhanh
- `seed.helper.ts` — seed data cơ bản cho test

**1. Auth E2E (test/auth.e2e-spec.ts)**

Full flow test:
- Register → nhận tokens → GET /auth/me → data đúng
- Login → nhận tokens → dùng accessToken
- Refresh token → nhận tokens mới
- Logout → refreshToken cũ không dùng được nữa
- Hết hạn accessToken → trả 401
- Rate limit: gọi POST /auth/login 6 lần trong 15 phút → lần 6 nhận 429

**2. Exam Flow E2E (test/exam-flow.e2e-spec.ts)**

Happy path đầy đủ:
- Teacher tạo câu hỏi (5 câu)
- Teacher tạo exam + thêm 5 câu + publish
- Student bắt đầu attempt (POST /attempts)
- Student gửi đáp án cho tất cả câu
- Student submit (POST /attempts/:id/submit)
- Kiểm tra: totalScore đúng, answers có isCorrect
- Teacher xem analytics → totalAttempts=1, questionStats đúng

Edge cases:
- Student cố submit attempt đã submitted → 400
- Student dùng accessCode sai → 401
- Student làm bài vượt maxAttempts → 400
- Teacher publish exam không có câu hỏi → 400

**3. Anti-cheat E2E (test/anticheat.e2e-spec.ts)**

- Gửi 5 tab-switch events cho 1 attempt → attempt bị flag
- Gửi sự kiện cho attempt không phải của mình → 403
- Gửi sự kiện cho attempt đã submitted → 400

---

### PHẦN C: Test Scripts & CI

**package.json (apps/api):**

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:e2e:ci": "DATABASE_URL=$TEST_DATABASE_URL jest --config ./test/jest-e2e.json --runInBand"
  }
}
```

**GitHub Actions (.github/workflows/test.yml):**

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: examapp_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api test:cov
      - run: pnpm --filter api test:e2e:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/examapp_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret-key-min-32-characters-long
          JWT_REFRESH_SECRET: test-refresh-secret-min-32-chars
          FRONTEND_URL: http://localhost:3000
```

Coverage threshold (jest.config.js):

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 75,
    lines: 75,
    statements: 75
  }
}
```

---

## PROMPT 7 — Monitoring, Error Tracking & API Docs

**Context:** Tất cả Phase 2 features và tests đã xong. Cần thêm observability và documentation hoàn chỉnh.

### PHẦN A: Error Monitoring — Sentry

**Cài packages:**

```bash
pnpm add @sentry/nestjs @sentry/profiling-node     # api
pnpm add @sentry/nextjs                             # web
```

**Backend (apps/api/src/main.ts):**

- Init Sentry với `dsn` từ env, `environment: NODE_ENV`, `tracesSampleRate: 0.1` (production), `1.0` (development)
- Integrate SentryModule vào AppModule
- Custom filter: SentryGlobalFilter — bắt tất cả exception, skip 4xx client errors (chỉ report 5xx)
- Thêm user context khi có JWT: `Sentry.setUser({ id: userId, email })`

**Frontend (apps/web):**

- Tạo `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Wrap Next.js config với `withSentryConfig`
- Error Boundary component bắt React errors

**Env vars cần thêm:**

```
# api
SENTRY_DSN="https://..."

# web
NEXT_PUBLIC_SENTRY_DSN="https://..."
SENTRY_AUTH_TOKEN="..."   # dùng cho source maps
```

---

### PHẦN B: Logging — Structured Logs

**Cài:** `pnpm add winston nest-winston`

Tạo `src/logger/logger.module.ts` với WinstonModule:

- Development: console output, colorized, format đẹp
- Production: JSON format, levels: error/warn/info, không log debug
- Mỗi log có: `{ level, message, timestamp, context, traceId }`

Thêm `traceId` (uuid) vào mỗi request qua Middleware:
- Tạo `src/middleware/trace-id.middleware.ts`
- Gắn `x-trace-id` header vào response
- Dùng AsyncLocalStorage để truyền traceId qua service layers

Log các sự kiện quan trọng:
- User register/login/logout
- Exam publish/archive
- Attempt submit
- AI generate (kèm userId, tokensUsed)
- Anti-cheat flag

---

### PHẦN C: Swagger — Hoàn thiện API Docs

Cập nhật Swagger setup đã có từ Phase 1 để đầy đủ hơn:

**1. Bổ sung decorators cho tất cả endpoints Phase 2:**

Mỗi endpoint mới cần:
- `@ApiOperation({ summary: '...', description: '...' })`
- `@ApiResponse({ status: 200, description: '...', type: ResponseDto })`
- `@ApiResponse({ status: 400, description: 'Validation error' })`
- `@ApiResponse({ status: 401, description: 'Unauthorized' })`
- `@ApiConsumes('multipart/form-data')` cho file upload endpoints
- `@ApiBody({ type: ... })` với schema đầy đủ

**2. Response DTOs (cho Swagger)**

Tạo file `src/common/dto/response.dto.ts`:

```typescript
export class PaginatedResponseDto<T> {
  @ApiProperty() data: T[]
  @ApiProperty() meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export class ExamStatsResponseDto {
  // định nghĩa đầy đủ các fields của analytics response
}

export class GeneratedQuestionDto {
  // định nghĩa fields của AI response
}
```

**3. Swagger UI config (src/main.ts)**

```typescript
const config = new DocumentBuilder()
  .setTitle('ExamFlow API')
  .setDescription(`
    ## ExamFlow Online Examination Platform API
    
    ### Authentication
    Dùng Bearer token JWT. Lấy token từ POST /auth/login.
    
    ### Rate Limiting
    - General: 100 requests/15 minutes
    - Auth endpoints: 5 requests/15 minutes  
    - AI endpoints: 5-30 requests/hour (tuỳ plan)
    
    ### Error Format
    Tất cả errors trả về: { success: false, error: { code, message } }
  `)
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Auth', 'Đăng ký, đăng nhập, quản lý token')
  .addTag('Questions', 'Quản lý ngân hàng câu hỏi')
  .addTag('Exams', 'Tạo và quản lý đề thi')
  .addTag('Attempts', 'Làm bài thi và xem kết quả')
  .addTag('Analytics', 'Thống kê và báo cáo')
  .addTag('AI', 'Sinh câu hỏi bằng AI')
  .addTag('Review', 'Ôn tập spaced repetition')
  .addTag('Parent', 'Theo dõi tiến độ học của con')
  .addTag('Anti-cheat', 'Sự kiện giám sát thi cử')
  .build()
```

---

### PHẦN D: Performance Cơ bản

**1. Database Indexes (thêm vào schema.prisma)**

```prisma
model Question {
  @@index([creatorId])
  @@index([organizationId])
  @@index([type])
  @@index([difficulty])
  @@index([isPublic])
}

model Exam {
  @@index([creatorId])
  @@index([organizationId])
  @@index([status])
  @@index([accessCode])
}

model Attempt {
  @@index([userId])
  @@index([status])
  @@index([submittedAt])
}

model ReviewCard {
  @@index([userId, nextReviewAt])
}
```

Chạy `npx prisma migrate dev --name add_indexes`

**2. Response Caching (Redis)**

Thêm cache cho các endpoint analytics nặng:

Tạo decorator `@CacheResponse(ttl: number)` dùng Redis:
- Key: `cache:{method}:{path}:{userId}:{queryHash}`
- `GET /analytics/exams/:examId` → cache 5 phút
- `GET /analytics/me` → cache 2 phút
- Invalidate cache khi có attempt submit mới cho exam đó

**3. Request Validation Performance**

Đảm bảo `class-transformer` đã enable `excludeExtraneousValues` để không process field thừa từ client.

---

### PHẦN E: Update README & Changelog

**Cập nhật README.md:**

Thêm vào Features section:
- ✅ Anti-cheat: Tab switch detection, fullscreen enforcement, auto-submit
- ✅ AI Question Generator: Upload PDF/DOCX → tự động sinh câu hỏi
- ✅ Spaced Repetition: SM-2 algorithm, ôn tập thông minh
- ✅ Parent Dashboard: Theo dõi tiến độ học của con
- ✅ Monitoring: Sentry error tracking, structured logging
- ✅ Test Coverage: Unit tests + E2E tests, CI/CD

Tạo `CHANGELOG.md`:

```markdown
## [2.0.0] - Phase 2

### Added
- Anti-cheat system (tab switch detection, fullscreen enforcement, auto-submit)
- AI question generation from PDF/DOCX (Claude API)
- Spaced repetition review system (SM-2 algorithm)
- Parent monitoring dashboard
- Unit tests (GradingService, SM2Service, AuthService)
- E2E tests (auth flow, exam flow)
- Sentry error monitoring
- Structured logging (Winston)
- Database indexes for performance
- Redis response caching for analytics

### Changed
- Attempt model: added anti-cheat fields
- Exam results: added anti-cheat summary
- Student dashboard: added review widget

### Fixed
- Timer sync issue on tab resume (now server-authoritative)
```

---

## Thứ tự thực hiện Phase 2

| Bước | Prompt | Nội dung | Ước tính |
|------|--------|----------|----------|
| 1 | Prompt 1 | Anti-cheat Backend | 2–3 giờ |
| 2 | Prompt 2 | Anti-cheat Frontend | 3–4 giờ |
| 3 | Prompt 3 | AI Question Generator | 4–5 giờ |
| 4 | Prompt 4 | Spaced Repetition | 4–5 giờ |
| 5 | Prompt 5 | Parent Dashboard | 3–4 giờ |
| 6 | Prompt 6 | Testing | 4–6 giờ |
| 7 | Prompt 7 | Monitoring + Docs + Polish | 2–3 giờ |

**Tổng ước tính Phase 2:** 22–30 giờ làm việc thực tế

**Ưu tiên nếu bị hạn chế thời gian:**
- Must-have (portfolio): Prompt 1, 2, 3, 6 (anti-cheat + AI + test)
- Nice-to-have: Prompt 4, 5 (spaced repetition + parent)
- Polish: Prompt 7

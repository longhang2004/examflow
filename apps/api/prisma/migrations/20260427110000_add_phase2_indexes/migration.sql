-- Add indexes for Phase 2 analytics, ownership filters, and review workloads.
CREATE INDEX IF NOT EXISTS "Question_creatorId_idx" ON "Question"("creatorId");
CREATE INDEX IF NOT EXISTS "Question_organizationId_idx" ON "Question"("organizationId");
CREATE INDEX IF NOT EXISTS "Question_type_idx" ON "Question"("type");
CREATE INDEX IF NOT EXISTS "Question_difficulty_idx" ON "Question"("difficulty");
CREATE INDEX IF NOT EXISTS "Question_isPublic_idx" ON "Question"("isPublic");

CREATE INDEX IF NOT EXISTS "Exam_creatorId_idx" ON "Exam"("creatorId");
CREATE INDEX IF NOT EXISTS "Exam_organizationId_idx" ON "Exam"("organizationId");
CREATE INDEX IF NOT EXISTS "Exam_status_idx" ON "Exam"("status");
CREATE INDEX IF NOT EXISTS "Exam_accessCode_idx" ON "Exam"("accessCode");

CREATE INDEX IF NOT EXISTS "Attempt_userId_idx" ON "Attempt"("userId");
CREATE INDEX IF NOT EXISTS "Attempt_status_idx" ON "Attempt"("status");
CREATE INDEX IF NOT EXISTS "Attempt_submittedAt_idx" ON "Attempt"("submittedAt");

#!/bin/bash
#
# ExamFlow E2E API Test Script
# Requires: curl, jq, running API at $API_URL (default http://localhost:3001)
#
# Usage: bash apps/api/test/e2e-test.sh [api_url]

API_URL="${1:-http://localhost:3001}"
PASS=0
FAIL=0
TOTAL=0

green() { printf "\033[0;32m%s\033[0m\n" "$1"; }
red()   { printf "\033[0;31m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

assert_status() {
  local test_name="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" -eq "$expected" ]; then
    green "  ✓ $test_name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "  ✗ $test_name (expected $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_json() {
  local test_name="$1" field="$2" expected="$3" body="$4"
  TOTAL=$((TOTAL + 1))
  local actual
  actual=$(echo "$body" | jq -r "$field" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    green "  ✓ $test_name ($field = $expected)"
    PASS=$((PASS + 1))
  else
    red "  ✗ $test_name ($field: expected '$expected', got '$actual')"
    FAIL=$((FAIL + 1))
  fi
}

bold "======================================="
bold " ExamFlow E2E API Tests"
bold " Target: $API_URL"
bold "======================================="
echo ""

# ──────────────────────────────────────────
bold "1. Health Check"
# ──────────────────────────────────────────
RESP=$(curl -s -w "\n%{http_code}" "$API_URL/health")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "GET /health returns 200" 200 "$STATUS"
assert_json "Health status is ok" ".data.status" "ok" "$BODY"

echo ""

# ──────────────────────────────────────────
bold "2. Auth Flow"
# ──────────────────────────────────────────

UNIQUE=$(date +%s)

# Register teacher
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e-teacher-${UNIQUE}@test.com\",\"password\":\"TestPass123\",\"displayName\":\"E2E Teacher\",\"role\":\"TEACHER\"}")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Register teacher" 201 "$STATUS"
assert_json "Returns user email" ".data.user.email" "e2e-teacher-${UNIQUE}@test.com" "$BODY"

TEACHER_TOKEN=$(echo "$BODY" | jq -r '.data.tokens.accessToken')
TEACHER_REFRESH=$(echo "$BODY" | jq -r '.data.tokens.refreshToken')

# Register student
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e-student-${UNIQUE}@test.com\",\"password\":\"TestPass123\",\"displayName\":\"E2E Student\"}")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Register student" 201 "$STATUS"

STUDENT_TOKEN=$(echo "$BODY" | jq -r '.data.tokens.accessToken')

# Login
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e-teacher-${UNIQUE}@test.com\",\"password\":\"TestPass123\"}")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Login teacher" 200 "$STATUS"

TEACHER_TOKEN=$(echo "$BODY" | jq -r '.data.tokens.accessToken')
TEACHER_REFRESH=$(echo "$BODY" | jq -r '.data.tokens.refreshToken')

# GET /auth/me
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "GET /auth/me" 200 "$STATUS"
assert_json "Returns teacher role" ".data.role" "TEACHER" "$BODY"

# Duplicate email
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e-teacher-${UNIQUE}@test.com\",\"password\":\"TestPass123\",\"displayName\":\"Dupe\"}")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Duplicate email returns 409" 409 "$STATUS"

# Wrong password
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e-teacher-${UNIQUE}@test.com\",\"password\":\"WrongPass123\"}")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Wrong password returns 401" 401 "$STATUS"

# Unauthenticated access
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me")
STATUS=$(echo "$RESP" | tail -1)
assert_status "No token returns 401" 401 "$STATUS"

echo ""

# ──────────────────────────────────────────
bold "3. Questions CRUD"
# ──────────────────────────────────────────

# Create MC question
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/questions" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MULTIPLE_CHOICE",
    "content": "What is the capital of France? This is an E2E test question.",
    "config": {"options": [{"id":"a","text":"London"},{"id":"b","text":"Paris"},{"id":"c","text":"Berlin"}], "correctAnswer": "b"},
    "tags": ["geography", "e2e"],
    "difficulty": 1
  }')
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Create MC question" 201 "$STATUS"
Q1_ID=$(echo "$BODY" | jq -r '.data.id')

# Create T/F question
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/questions" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TRUE_FALSE",
    "content": "The earth is flat. This is a true or false question for testing.",
    "config": {"correctAnswer": false},
    "tags": ["science", "e2e"],
    "difficulty": 1
  }')
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Create T/F question" 201 "$STATUS"
Q2_ID=$(echo "$BODY" | jq -r '.data.id')

# List questions
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/questions?page=1&limit=10" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "List questions" 200 "$STATUS"

# Get single question
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/questions/$Q1_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Get question by ID" 200 "$STATUS"

# Update question
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$API_URL/questions/$Q1_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"difficulty": 2}')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Update question" 200 "$STATUS"

# Student cannot create question
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/questions" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"TRUE_FALSE","content":"Student should not create questions for testing.","config":{"correctAnswer":true}}')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Student cannot create questions (403)" 403 "$STATUS"

echo ""

# ──────────────────────────────────────────
bold "4. Exams CRUD + Publish"
# ──────────────────────────────────────────

# Create exam
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/exams" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"E2E Test Exam","description":"Automated test exam","config":{"maxAttempts":2,"shuffleQuestions":false,"shuffleOptions":false,"showResultAfter":true}}')
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Create exam" 201 "$STATUS"
EXAM_ID=$(echo "$BODY" | jq -r '.data.id')
ACCESS_CODE=$(echo "$BODY" | jq -r '.data.accessCode')

# List exams
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/exams" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status "List exams" 200 "$STATUS"

# Add questions to exam
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/exams/$EXAM_ID/questions" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"questions\":[{\"questionId\":\"$Q1_ID\",\"point\":10,\"order\":1},{\"questionId\":\"$Q2_ID\",\"point\":5,\"order\":2}]}")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Add questions to exam" 201 "$STATUS"

# Get exam details
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/exams/$EXAM_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Get exam detail" 200 "$STATUS"

# Publish empty exam should fail (but we already added questions, so test passing)
# Publish exam
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$API_URL/exams/$EXAM_ID/publish" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Publish exam" 200 "$STATUS"
assert_json "Exam status is PUBLISHED" ".data.status" "PUBLISHED" "$BODY"

# Cannot edit published exam
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$API_URL/exams/$EXAM_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Should Fail"}')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Cannot edit PUBLISHED exam (400)" 400 "$STATUS"

# Find by access code
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/exams/code/$ACCESS_CODE")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Find exam by access code" 200 "$STATUS"

echo ""

# ──────────────────────────────────────────
bold "5. Attempt + Grading Flow"
# ──────────────────────────────────────────

# Student login
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"e2e-student-${UNIQUE}@test.com\",\"password\":\"TestPass123\"}")
BODY=$(echo "$RESP" | sed '$d')
STUDENT_TOKEN=$(echo "$BODY" | jq -r '.data.tokens.accessToken')

# Start attempt
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/attempts" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"examId\":\"$EXAM_ID\",\"accessCode\":\"$ACCESS_CODE\"}")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Start exam attempt" 201 "$STATUS"
ATTEMPT_ID=$(echo "$BODY" | jq -r '.data.attempt.id')

# Save answer for Q1 (MC - correct: b)
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/attempts/$ATTEMPT_ID/answers" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":\"$Q1_ID\",\"answer\":\"b\",\"timeSpent\":15}")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Save answer for Q1" 200 "$STATUS"

# Save answer for Q2 (T/F - correct: false)
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/attempts/$ATTEMPT_ID/answers" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":\"$Q2_ID\",\"answer\":false,\"timeSpent\":8}")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Save answer for Q2" 200 "$STATUS"

# Submit attempt
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/attempts/$ATTEMPT_ID/submit" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Submit attempt" 201 "$STATUS"
assert_json "Attempt is GRADED" ".data.status" "GRADED" "$BODY"

TOTAL_SCORE=$(echo "$BODY" | jq -r '.data.totalScore')
TOTAL=$((TOTAL + 1))
if [ "$TOTAL_SCORE" = "15" ]; then
  green "  ✓ Perfect score: 15/15 (both answers correct)"
  PASS=$((PASS + 1))
else
  red "  ✗ Expected score 15, got $TOTAL_SCORE"
  FAIL=$((FAIL + 1))
fi

# Get attempt details
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/attempts/$ATTEMPT_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Get attempt details" 200 "$STATUS"

# List my attempts
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/attempts" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status "List my attempts" 200 "$STATUS"

# Cannot double-submit
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/attempts/$ATTEMPT_ID/submit" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Double-submit returns 400" 400 "$STATUS"

echo ""

# ──────────────────────────────────────────
bold "6. Analytics"
# ──────────────────────────────────────────

# Teacher exam analytics
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/analytics/exams/$EXAM_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Get exam analytics" 200 "$STATUS"

TOTAL_ATTEMPTS=$(echo "$BODY" | jq -r '.data.totalAttempts')
TOTAL=$((TOTAL + 1))
if [ "$TOTAL_ATTEMPTS" = "1" ]; then
  green "  ✓ Analytics shows 1 attempt"
  PASS=$((PASS + 1))
else
  red "  ✗ Expected 1 attempt, got $TOTAL_ATTEMPTS"
  FAIL=$((FAIL + 1))
fi

# Student personal stats
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/analytics/me" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Get student personal stats" 200 "$STATUS"

# Student should not access exam analytics
RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/analytics/exams/$EXAM_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Student blocked from exam analytics (403)" 403 "$STATUS"

echo ""

# ──────────────────────────────────────────
bold "7. Exam Results"
# ──────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/exams/$EXAM_ID/results" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
BODY=$(echo "$RESP" | sed '$d')
STATUS=$(echo "$RESP" | tail -1)
assert_status "Get exam results" 200 "$STATUS"

echo ""

# ──────────────────────────────────────────
bold "8. Logout"
# ──────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $TEACHER_TOKEN")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Logout teacher" 200 "$STATUS"

echo ""

# ──────────────────────────────────────────
bold "9. Swagger Docs"
# ──────────────────────────────────────────

RESP=$(curl -s -w "\n%{http_code}" "$API_URL/api-docs")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Swagger UI accessible" 200 "$STATUS"

RESP=$(curl -s -w "\n%{http_code}" "$API_URL/api-docs-json")
STATUS=$(echo "$RESP" | tail -1)
assert_status "Swagger JSON accessible" 200 "$STATUS"

echo ""
bold "======================================="
if [ "$FAIL" -eq 0 ]; then
  green " ALL $TOTAL TESTS PASSED ✓"
else
  red " $FAIL/$TOTAL TESTS FAILED"
  green " $PASS/$TOTAL tests passed"
fi
bold "======================================="

exit $FAIL

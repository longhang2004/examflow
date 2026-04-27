# Changelog

## [2.0.0] - Phase 2

### Added
- Anti-cheat system with tab-switch detection, fullscreen enforcement, server-side flagging, and auto-submit hooks.
- AI question generation/import from PDF, DOCX, TXT, and pasted text.
- Spaced repetition review system using the SM-2 algorithm.
- Parent monitoring dashboard with link requests, student summaries, recent attempts, review stats, and weak topics.
- Unit tests for grading, attempts, analytics, auth, questions, exams, SM-2, and anti-cheat behavior.
- GitHub Actions test workflow for API and web test suites.
- Database indexes for question, exam, and attempt lookup patterns.

### Changed
- Attempt records now include anti-cheat counters and logs.
- Exam analytics include anti-cheat summaries and suspicious attempt rows.
- Student dashboard includes the review widget.
- Root test scripts now run through pnpm workspace filters.
- Swagger docs now include Phase 2 API tags and authentication/rate-limit guidance.

### Fixed
- Timer sync is server-authoritative through Redis-backed attempt timers.
- AI-generated questions are validated by question type before returning them to the UI.

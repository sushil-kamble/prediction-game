# PredictGame - Implementation Plan

**Goal**: A generalised sports prediction challenge platform where an admin creates MCQ-based prediction challenges, shares them via link, and players submit predictions once — with live leaderboard updates as the admin marks correct answers.
**Stack**: TanStack Start (file-based routing, SSR), Convex (backend + DB + real-time), Tailwind CSS (mobile-first utilities)
**MVP Scope**: In — challenge creation, shareable join link, one-time nickname-based prediction submission, admin answer marking, live leaderboard. Out — auth, push notifications, admin protection, historical stats, team management.
**Execution Model**: Autonomous AI agent. Assume environment is configured. Skip setup.

---

## Architecture Snapshot

Five primary components:

**Convex schema + functions**: Single source of truth. Houses `challenges`, `questions`, `participants`, `predictions` tables. All business logic in Convex mutations/queries. Reactivity via Convex's `useQuery` — no polling, no manual WebSocket management.

**TanStack Start routing**: File-based routes under `routes/`. Use `createServerFn` only where SSR data improves perceived load (OG meta for share previews). Client-side Convex hooks handle all real-time data — don't fight Convex's reactivity model with excessive server rendering.

**Admin flow** (`/admin`, `/admin/$challengeId`): Unprotected in v1. Admin creates challenge, adds questions, publishes, copies share link, marks correct answers post-match.

**Player flow** (`/c/$challengeId`): UUID from localStorage is the player's identity. Player enters nickname, joins, sees questions, submits all at once. Predictions lock immediately on submit.

**Live leaderboard** (`/c/$challengeId/leaderboard`): Reactive Convex query computes scores on every `markCorrectAnswer` write. All connected clients rerender within ~100ms automatically.

**Mobile-first constraint**: All screens designed for 375px first. Touch targets minimum 48px. No hover-dependent interactions. Native share API for link distribution. Bottom-anchored primary CTAs throughout.

---

## Phase 1: Convex Schema + Core Data Layer

**Objective**: All tables, indexes, mutations, and queries exist and are verified working via the Convex dashboard before any UI is built.

### Schema

Define four tables:

`challenges`: title, sport (string tag), status (`draft` | `open` | `scoring` | `closed`), adminSecret (short random token for v1 admin identity), createdAt.

`questions`: challengeId (ref), text, options (array of strings, 2-5 items), pointValue (positive integer), correctOptionIndex (nullable integer — null until marked), order (integer for display ordering).

`participants`: challengeId (ref), uuid (string), nickname (string), joinedAt. Unique index on `[challengeId, uuid]`.

`predictions`: participantId (ref), questionId (ref), challengeId (ref), selectedOptionIndex (integer), submittedAt. Unique index on `[participantId, questionId]`.

### Mutations

`createChallenge(title, sport)` — status defaults to `draft`, generates adminSecret, returns challengeId + adminSecret.

`addQuestion(challengeId, adminSecret, text, options, pointValue)` — validates adminSecret, validates 2-5 options, appends with incremented order.

`updateQuestion(challengeId, questionId, adminSecret, text, options, pointValue)` — validates adminSecret, challenge must be `draft`.

`deleteQuestion(challengeId, questionId, adminSecret)` — validates adminSecret, challenge must be `draft`.

`publishChallenge(challengeId, adminSecret)` — validates adminSecret, requires at least 1 question, sets status to `open`.

`joinChallenge(challengeId, uuid, nickname)` — idempotent on uuid+challengeId. Rejects if status is `draft` or `closed`. Returns participantId.

`submitPredictions(challengeId, participantId, predictions[])` — array of `{ questionId, selectedOptionIndex }`. Validates no existing predictions for this participant. Validates each index is within bounds of that question's options. Writes all atomically.

`markCorrectAnswer(challengeId, questionId, adminSecret, correctOptionIndex)` — validates adminSecret and index bounds. On first call, advances challenge status to `scoring`.

`closeChallenge(challengeId, adminSecret)` — sets status to `closed`.

### Queries

`getChallenge(challengeId)` — returns challenge + questions. When status is `open`, omits `correctOptionIndex` from questions.

`getParticipant(challengeId, uuid)` — returns participant record or null.

`getParticipantPredictions(participantId, challengeId)` — returns picks keyed by questionId.

`getLeaderboard(challengeId)` — returns `{ nickname, uuid, score, correctCount, totalAnswered }` sorted descending by score. Score computed in-query. Ties get same rank, next rank skips.

### Edge Cases to Handle

- `addQuestion` with <2 or >5 options: reject with descriptive error.
- `submitPredictions` when challenge is `draft` or `closed`: reject.
- `submitPredictions` with a questionId not belonging to this challengeId: reject.
- `joinChallenge` called twice with same uuid+challengeId: return existing participantId, no duplicate row.
- `markCorrectAnswer` with out-of-bounds index: reject.
- `getLeaderboard` with no correct answers marked: return all participants at score 0.
- `getChallenge` with non-existent challengeId: return null, not a throw.

### Production Considerations

AdminSecret validated server-side on every admin mutation. It's a v1 mechanism — document as a known limitation. Never use it to gate read queries, only writes.

### Verification

- [ ] Open Convex dashboard -> all four tables and indexes exist
- [ ] Call `createChallenge` via function runner -> returns challengeId + adminSecret, status is `draft`
- [ ] Call `addQuestion` with 1 option -> throws, no record created
- [ ] Call `joinChallenge` twice with same uuid+challengeId -> second call returns same participantId, one row in table
- [ ] Call `submitPredictions` twice for same participant+question -> second call throws, first predictions unchanged
- [ ] Call `markCorrectAnswer` with out-of-bounds index -> throws
- [ ] Call `getLeaderboard` with 3 participants, 0 answers marked -> 3 rows all at score 0

**Gate**: Do not proceed to Phase 2 until all verification items pass.

---

## Phase 2: Admin Dashboard

**Objective**: Admin can create a challenge, add/edit/delete questions, publish, copy a shareable player link, and mark correct answers — from a mobile-first UI.

### Mobile Layout Constraints

Single-column layout, 16px horizontal padding throughout. No sidebars. All primary action buttons full-width. Tap targets minimum 48px height. Form inputs `text-base` (16px) to prevent iOS auto-zoom on focus. Bottom sheets for confirmations, not browser `confirm()` dialogs.

### Route: `/admin`

On load, read `adminChallenges` from localStorage (array of `{ challengeId, adminSecret, title, sport }`). Show as tappable cards with title, sport chip, and status badge. "New Challenge" button sticky at the bottom.

New challenge bottom sheet: title input, sport input with quick-tap suggestion chips (Cricket, Football, F1, Basketball, Other — tappable, not dropdown). On submit, calls `createChallenge`, stores returned data in localStorage, navigates to `/admin/$challengeId`.

### Route: `/admin/$challengeId`

Read adminSecret from localStorage. If missing (different device), show "Admin access is device-specific in this version" — no editor, no crash.

Shows: challenge title, sport chip, status badge. Question list below. Publish button (disabled if 0 questions or status is not `draft`). Share section appears post-publish.

Question form: question text (textarea), options list (2 inputs default, "Add option" button adds up to 5, each removable), point value stepper (min 1, default 1). Submit calls `addQuestion`, form resets, new question appears immediately.

Each question card shows text, option count, point value, and edit/delete icon buttons. Edit pre-fills the form. Delete shows a confirmation bottom sheet before calling `deleteQuestion`.

Post-publish share section: player URL in read-only input. "Share" button — full-width. On mobile, calls `navigator.share({ url, title })`. On desktop, clipboard copy with "Copied!" toast feedback.

### Answer Marking Panel

Visible on same route when status is `open` or `scoring`. Each question is a card with its options as full-width tappable buttons (48px min height). Tapping calls `markCorrectAnswer`. Correct option turns green. Progress indicator: "X of Y answered." Admin can change a marked answer by tapping a different option.

### Edge Cases to Handle

- Publish with 0 questions: button disabled, not just server-rejected.
- `addQuestion` after publish: mutation rejects, error toast at bottom of screen, form stays populated.
- Sport field empty on challenge creation: client-side validation blocks mutation.
- Question text or option text empty/whitespace-only: client-side validation.
- Admin taps delete and confirms: question removed, list reorders without flash.
- Admin marks answer then taps a different option: second `markCorrectAnswer` call overwrites, only new option shows green.

### Production Considerations

All mutation errors surface as toast notifications at screen bottom (mobile-natural). Auto-dismiss after 4 seconds, tappable to dismiss early. Never swallow admin mutation errors silently — admin data entry is the critical path.

### Verification

- [ ] Open `/admin` on 375px -> renders, "New Challenge" button visible without scrolling
- [ ] Create challenge -> stored in localStorage, redirected to `/admin/$challengeId`
- [ ] Add question with empty option text -> client validation blocks, no mutation
- [ ] Add 3 valid questions -> all appear in list, Convex records exist
- [ ] Publish with 0 questions -> button is disabled
- [ ] Publish with 3 questions -> status badge updates to `open`, share section appears
- [ ] Tap Share on mobile -> native system share sheet opens
- [ ] Mark an answer -> option turns green, Convex record updated, progress increments
- [ ] Open `/admin/$challengeId` in a different browser profile -> "admin access device-specific" message, no editor crash

**Gate**: Do not proceed to Phase 3 until all verification items pass.

---

## Phase 3: Player Join + Prediction Flow

**Objective**: Player opens share link on mobile, enters nickname, submits all predictions at once, and lands on a locked confirmation — fully frictionless.

### UUID Initialization

`getOrCreateUUID()` utility runs client-side on mount. Checks `localStorage.getItem('pguid')`. If absent, generates via `crypto.randomUUID()` and stores it. If localStorage is unavailable (some private browsing modes), holds UUID in module-level memory for the session — no error surfaced to user.

### Route: `/c/$challengeId`

On load, fetch `getChallenge(challengeId)`. While loading, show a full-screen skeleton matching the layout shape — no blank white screen.

Status gates:

- `draft`: full-screen "This challenge isn't open yet. Check back soon."
- `closed`: full-screen "This challenge has ended." with leaderboard link.
- `open` or `scoring`: proceed to join/predict flow.

Check `getParticipant(challengeId, uuid)`. If exists, check `getParticipantPredictions`. If predictions submitted, show locked view. If joined but not submitted, restore prediction form with previous state.

### Join Screen

Shown when no participant record exists for this UUID+challengeId. Layout: sport chip top, challenge title large and prominent, single-line instruction ("One shot. No changes."), nickname input, "Let's Go" CTA full-width at bottom.

Nickname: 2-20 chars, trimmed, client-validated. On submit, calls `joinChallenge`, stores participantId in localStorage under `participant_[challengeId]`. Transitions to prediction form.

### Prediction Form

Questions as cards in a scrollable single-column feed. Each card: question text, point value badge ("2 pts"), options as full-width tappable button group (not radio inputs — better mobile tap UX, min 48px each). Selected option shows clear filled/highlighted state.

Sticky bottom bar: "X of Y answered" progress text + "Submit All" button. Button disabled until all questions answered. On tap, confirmation bottom sheet: "Lock in your predictions? You can't change them after this." with "Confirm" and "Go Back." Confirm calls `submitPredictions`. On success, transition to locked view.

### Locked View

Each question card shows selected option with a lock icon. Top banner: "You're locked in! Watch the leaderboard live." Full-width leaderboard CTA button. No edit access.

### Edge Cases to Handle

- `getChallenge` returns null: "Challenge not found" screen, no crash.
- `submitPredictions` fails mid-flight: error toast, form state preserved (selections intact), retry safe via Convex uniqueness constraint.
- Not all questions answered: Submit button stays disabled — partial submission not allowed.
- Nickname whitespace-only: trimmed to empty, fails client validation.
- Challenge flips to `closed` between page load and submission tap: mutation rejects, show "This challenge has ended."
- Player clears localStorage: new UUID, can re-join as new participant. Known re-vote vector — acceptable in v1.
- ParticipantId missing from localStorage but UUID+challengeId participant exists in Convex (partial clear): recover by calling `getParticipant` and restoring participantId. Don't force re-join that hits uniqueness error.

### Production Considerations

The join-to-submit flow must work entirely offline-tolerant in terms of UX feedback. Network errors must show clear retry messaging. Don't drop the player's selections on error.

### Verification

- [ ] Open share link on 375px -> challenge title visible, join screen renders
- [ ] Submit nickname with 1 character -> client validation error, no mutation
- [ ] Submit valid nickname -> participant created in Convex, prediction form renders
- [ ] Reopen link in same browser (not yet submitted) -> join skipped, prediction form shown with previous state
- [ ] Answer all questions, confirm submit -> predictions in Convex, locked view renders
- [ ] Reopen link after submission -> locked view immediately, form not accessible
- [ ] Open `draft` challenge link -> "not open yet" message
- [ ] Open invalid challengeId -> "not found" screen, no JS error
- [ ] Tap Submit with 1 unanswered question -> button disabled, cannot proceed

**Gate**: Do not proceed to Phase 4 until all verification items pass.

---

## Phase 4: Live Leaderboard

**Objective**: A reactive leaderboard at `/c/$challengeId/leaderboard` ranks all participants by score and updates live on all connected mobile clients as the admin marks answers.

### Leaderboard Query

`getLeaderboard(challengeId)` returns ranked array computed entirely server-side. Every `markCorrectAnswer` write triggers automatic recomputation for all subscribed clients via Convex reactivity. No score math in React.

### Route: `/c/$challengeId/leaderboard`

Accessible to anyone with challengeId. No auth. Shows challenge title, sport chip, status badge in a slim collapsible top bar (collapses on scroll to maximise list space).

Status: `open` with no answers marked shows participant count and "Waiting for results..." with subtle animated indicator.

Status: `scoring` or `closed` shows ranked list. Each row: rank number, nickname, score (large, right-aligned), correct count badge ("7/12"). Current player's row (matched by UUID) visually distinguished — highlighted background or accent border.

"Live" badge visible when status is `scoring`. Disappears when `closed`.

If current UUID has not submitted predictions: banner above list "You haven't predicted yet!" with CTA to `/c/$challengeId`. Leaderboard still visible below — don't block it.

### Edge Cases to Handle

- 0 participants: "No players yet." message.
- 0 answers marked: all rows at 0 pts, waiting state shown.
- Rank changes as answers are marked: rows reorder, animate smoothly, no full list flash.
- UUID not in localStorage (first visit on new device): UUID created, no participant row, "you haven't predicted" banner shown.
- Admin marks answers out of order: scores compute correctly regardless.

### Production Considerations

Score computation in Convex query only. Never cache scores client-side in a way that can drift. All clients always read from the same reactive source.

### Verification

- [ ] Open leaderboard with 3 participants, 0 answers marked -> all at 0 pts, "waiting" message
- [ ] Admin marks one answer -> leaderboard updates on all clients within 2 seconds, no refresh
- [ ] Two browser tabs on leaderboard -> both update simultaneously
- [ ] Correct predictor's score increases, others unchanged
- [ ] Current player's row visually distinct from others
- [ ] Player who hasn't submitted sees "you haven't predicted" banner, leaderboard still shown
- [ ] Tied players share same rank, next rank number skips correctly

**Gate**: Do not proceed to Phase 5 until all verification items pass.

---

## Phase 5: Polish, Navigation Glue + OG Meta

**Objective**: All screens connected, every loading/error state handled gracefully, share UX is native-grade on mobile, and OG preview works when the link lands on WhatsApp or Telegram.

### Route Map

`/` — landing. Large headline, sport emoji visuals, "Create a Challenge" full-width CTA. "My Challenges" section below if localStorage has admin challenges.

`/admin` — admin home.

`/admin/$challengeId` — challenge editor + answer marking.

`/c/$challengeId` — player join + predict.

`/c/$challengeId/leaderboard` — live leaderboard.

Slim top bar on all player routes showing challenge title + sport chip. Admin routes show "Admin Mode" label. No bottom nav — single-purpose screens don't need it.

### Loading and Error States

Skeleton screens on all routes while Convex queries resolve — layouts match the shape of loaded content to prevent shift. Root-level error boundary with "Something went wrong" + retry. `getChallenge` returning null renders a not-found screen, not a JS error. Convex disconnected state shows a slim "Reconnecting..." top banner that auto-hides on restore.

### OG Meta

`/c/$challengeId` must serve OG meta for WhatsApp/Telegram previews. Use TanStack Start's `createServerFn` to fetch challenge data server-side and inject via the route's `head` export. Required tags: `og:title`, `og:description`, `og:url`. No image needed in v1.

Format: title = challenge title, description = "[Sport] Prediction Challenge — Can you predict the outcome? Join and lock in your picks."

If server fetch fails, fall back to generic: "PredictGame — Sports Prediction Challenge."

### Mobile UX Finalisation

All interactive elements minimum 48px height — audit every screen. `text-base` on all form inputs to prevent iOS zoom. Bottom sheets for all confirmations (no `confirm()` dialogs). Prediction form scrolls freely with sticky submit bar. Leaderboard top bar collapses on scroll. No hover-only states anywhere.

### Edge Cases to Handle

- `navigator.share` unavailable (desktop): silent fallback to clipboard copy with "Link copied!" toast.
- OG server fetch fails: fall back to generic meta, page still renders.
- localStorage fully unavailable: UUID in memory, app functions for session, no user-visible error.
- Admin loses localStorage: `/admin` shows empty challenges list, no crash.

### Production Considerations

OG meta is the primary distribution mechanism — when the link lands on WhatsApp, the preview must be meaningful. Verify with WhatsApp's link preview debugger before marking this phase done.

### Verification

- [ ] Open `/` on 375px -> renders, CTA reachable without scrolling on common mobile heights (667px, 812px)
- [ ] Full player flow on real mobile device: join -> predict -> submit -> leaderboard, no layout breaks
- [ ] Share button on iOS Safari -> native share sheet with correct URL
- [ ] Share button on desktop -> "Link copied!" toast
- [ ] Paste challenge link into WhatsApp -> preview shows challenge title and sport description
- [ ] Navigate to `/c/invalid-id` -> not-found screen, no console error
- [ ] Kill network -> "Reconnecting..." banner appears, hides when restored
- [ ] Full smoke test: 3 players on real mobile devices + admin on desktop, admin marks all answers, all 3 leaderboards update live

**Gate**: Do not proceed to Production Readiness until all verification items pass.

---

## Production Readiness

These are non-negotiable before the system is considered complete.

### Error Handling

- [ ] All Convex mutation calls have error handling that shows visible feedback — never silent failures
- [ ] Convex connection state handled with visible reconnecting indicator
- [ ] Mutation validation errors return descriptive messages, not raw exception strings to the UI

### Input/Output Safety

- [ ] Nickname trimmed and length-validated client-side (2-20 chars) before mutation
- [ ] Question text and option text trimmed and non-empty validated in Convex mutation
- [ ] `pointValue` validated as positive integer in mutation, not just client-side
- [ ] `selectedOptionIndex` validated within bounds of question options in `submitPredictions`
- [ ] `correctOptionIndex` validated within bounds in `markCorrectAnswer`

### Auth & Access

- [ ] AdminSecret validated server-side in every admin mutation — client cannot bypass
- [ ] `submitPredictions` validates participantId belongs to the correct challengeId
- [ ] `joinChallenge` rejects `draft` and `closed` statuses server-side, not just filtered in UI

### Resilience

- [ ] `joinChallenge` is idempotent — safe to call multiple times
- [ ] `submitPredictions` rejects duplicates at DB level via unique index
- [ ] Score computation is stateless and recomputable from raw data at any time
- [ ] UUID generation falls back to in-memory when localStorage unavailable

### Observability

- [ ] Convex function errors logged with challengeId and input context
- [ ] Client errors (UUID issues, localStorage failures) caught without user-visible crashes

### Final Smoke Test

- [ ] Full flow: create challenge -> 5 questions -> publish -> 3 players join on mobile -> predictions submitted -> admin marks all answers -> leaderboard shows correct ranking
- [ ] Player clears localStorage, reopens link -> can re-join, doesn't crash leaderboard
- [ ] Admin marks answers out of order -> scores compute correctly
- [ ] 3 simultaneous mobile clients on leaderboard, admin marks answer -> all 3 update within 2 seconds

---

**PLAN COMPLETE**

This plan is designed for autonomous execution. Each phase gate must pass before proceeding.
When in doubt on implementation details, apply the principle of least surprise: build the simplest
thing that satisfies the interface contract and passes the verification gate.

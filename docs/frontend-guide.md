# Frontend Guide

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI components and state |
| Vite | 5 | Build tool, dev server, HMR |
| React Router DOM | 6 | Client-side routing |
| Tailwind CSS | 3 | Utility-first styling |
| Framer Motion | 11 | Declarative animations |
| Axios | 1 | HTTP client with interceptors |
| Recharts | 2 | Composable chart components |
| Lucide React | 0.330 | Icon library |

---

## Routing

Defined in [App.jsx](../frontend/src/App.jsx):

```
/            → LandingPage      (upload + role selection)
/processing  → ProcessingPage   (animated loading)
/interview   → InterviewPage    (chat UI)
/summary     → SummaryPage      (analytics dashboard)
*            → redirect to /
```

State is passed between pages via React Router's `useNavigate` + `state` prop.
No global state manager (Redux, Zustand) is used — the session data is small
enough to pass through location state.

### State shape passed through routes

```
Landing → Processing:
  { session_id, role, candidateName, resume_data }

Processing → Interview:
  { session_id, role, candidateName, resume_data, firstQuestion }

Interview → Summary:
  { session_id }   (summary fetched fresh from API)
```

---

## Pages

### `LandingPage.jsx`

Responsibilities:
- Drag-and-drop / click PDF upload with visual feedback
- Candidate name input with validation
- Role selector (three `RoleCard` components)
- Form validation gate (all three fields required before CTA is enabled)
- Calls `uploadResume()` → navigates to `/processing` on success

Key state:
```js
candidateName  string
selectedRole   string | null
file           File | null
dragging       boolean
loading        boolean
error          string
```

### `ProcessingPage.jsx`

Responsibilities:
- Shows an animated 5-step progress list while the backend works
- Calls `startInterview()` in parallel with the visual animation
- Waits for both the animation AND the API to complete before navigating
- Handles API errors with a fallback message

The API call and animation run concurrently using `setTimeout` chains.
Navigation happens only after **both** are done:

```js
// Animation finishes at t = Σ(step durations) = ~4.6s
// API call finishes in ~3–8s (LLM latency)
// Navigation: max(animation, API) + 700ms fade
```

### `InterviewPage.jsx`

The most complex page. Manages the full interview loop.

Key state:
```js
messages          array   // chat history: {role, content, meta, eval}
currentQuestion   object  // { question_id, question, difficulty, topic, ... }
answer            string  // textarea value
loading           boolean // waiting for API
evaluation        object  // last evaluation result
showContext       boolean // RAG chunk toggle
interviewComplete boolean
questionCount     number
scores            number[] // per-question scores for avg display
secondsLeft       number   // 5-min countdown
```

Message types in the `messages` array:

| `role` | Renders as |
|--------|-----------|
| `"ai"` | AI interviewer bubble (dark card, Brain icon) |
| `"user"` | Right-aligned user bubble |
| `"ai-eval"` | Evaluation card with score, strengths, weaknesses |
| `"typing"` | Animated three-dot indicator |
| `"system"` | Error notification |

Submit flow:
1. Push user message + typing indicator to `messages`
2. Call `submitAnswer()`
3. Replace typing indicator with `ai-eval` bubble
4. If `next_question` exists: push new `ai` bubble
5. If `interview_complete`: show completion card

### `SummaryPage.jsx`

Fetches `/summary/<session_id>` on mount and renders:

- **Score ring** — SVG circle with animated stroke-dashoffset
- **4 stat cards** — overall score, hiring recommendation, technical depth, communication
- **3 charts** (Recharts):
  - RadarChart — topic coverage
  - LineChart — score progression per question
  - BarChart (horizontal) — skill heatmap
- **3 list cards** — strengths, improvement areas, recommendations
- **AI summary text** — narrative paragraph
- **Q&A accordion** — expandable per-question review with feedback

---

## Components

### `ChatBubble.jsx`

Polymorphic component — selects the appropriate bubble variant based on `message.role`.

```jsx
<ChatBubble message={{ role: "ai", content: "...", meta: { topic, difficulty } }} />
<ChatBubble message={{ role: "user", content: "..." }} />
<ChatBubble message={{ role: "ai-eval", content: "...", eval: evaluationObj }} />
<ChatBubble message={{ role: "typing" }} />
<ChatBubble message={{ role: "system", content: "Error: ..." }} />
```

### `ProgressBar.jsx`

Animated Framer Motion progress bar.

```jsx
<ProgressBar value={3} max={8} label="Questions" />
```

### `SourceContext.jsx`

Collapsible viewer for the RAG chunks retrieved for a question.

```jsx
<SourceContext chunks={["chunk text 1...", "chunk text 2..."]} />
```

### `RoleCard.jsx`

Selectable role card with gradient icon, topic chips, and active indicator.

```jsx
<RoleCard role={roleObj} active={selectedRole === role.id} onClick={...} />
```

---

## API Service (`services/api.js`)

All API calls go through a single Axios instance configured with:
- `baseURL: "/api"` — proxied to `:5000` by Vite in development
- `timeout: 60000` — LLM calls can take up to ~30s
- Error interceptor — normalises all error shapes to `Error(message)`

```js
import { uploadResume, startInterview, submitAnswer, getSummary } from "./services/api";
```

---

## Styling System (`index.css`)

Tailwind is extended with custom utilities defined in `@layer components`:

| Class | Description |
|-------|-------------|
| `.glass-card` | Glassmorphism: `bg-white/4`, `backdrop-blur`, border |
| `.glass-card-hover` | Glass card + purple glow on hover |
| `.gradient-text` | Purple→Blue→Cyan gradient text |
| `.btn-primary` | Purple gradient button with glow shadow |
| `.btn-secondary` | Ghost button with purple border |
| `.input-field` | Dark input with purple focus ring |
| `.badge` | Small rounded pill |
| `.badge-purple/blue/green/red/yellow` | Coloured badge variants |
| `.typing-dot` | Animated bounce dot for the typing indicator |

### Colour palette

```js
// tailwind.config.js
colors: {
  dark: {
    800: "#1a1a2e",
    850: "#16213e",
    900: "#0f0f1a",   // page background
    950: "#080810",
  },
  accent: {
    purple: "#8b5cf6",
    blue:   "#3b82f6",
    cyan:   "#06b6d4",
    pink:   "#ec4899",
  }
}
```

### Custom animations

| Class | Effect |
|-------|--------|
| `animate-float` | Gentle vertical bob (3s loop) |
| `animate-glow` | Purple box-shadow pulse (2s) |
| `animate-pulse-slow` | Tailwind pulse at 3s |
| `.shimmer` | Skeleton loading shimmer (via CSS background-position) |

---

## Vite Proxy

In development, Vite proxies all `/api/*` requests to `http://localhost:5000`:

```js
// vite.config.js
server: {
  port: 3000,
  proxy: {
    "/api": { target: "http://localhost:5000", changeOrigin: true }
  }
}
```

This means the frontend makes requests to `/api/upload_resume` (no host needed)
and Vite forwards them to Flask. No CORS issues in development.

For production, configure Nginx (or your reverse proxy) to do the same routing.

# CareerPilot AI

A personalized career guidance app: students enter their education, skills, interests, and
career goal, and get an AI-generated roadmap, skill/course recommendations, interview prep,
resume review, and suggested career opportunities — powered by Claude.

## Project structure

```
careerpilot-app/
├── server.js          # Express backend — holds the API key, calls Claude, serves the frontend
├── package.json
├── .env.example        # copy to .env and add your key
└── public/
    └── index.html       # frontend (vanilla HTML/CSS/JS, no build step)
```

The backend is the only thing that talks to Anthropic's API. Your API key never reaches the
browser — the frontend calls your own server (`/api/generate/...`), and the server calls Claude.

## Requirements

- Node.js 18 or later (for built-in `fetch`)
- An Anthropic API key — get one at https://console.anthropic.com/settings/keys

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your API key:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and paste your key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Start the server:
   ```bash
   npm start
   ```
   (or `npm run dev` to auto-restart on file changes)

4. Open **http://localhost:3001** in your browser.

That's it — one server serves both the frontend and the API.

## How it works

- `public/index.html` is the entire frontend: the flight-plan intake form, and five tabs
  (Roadmap, Skills & Courses, Interview Prep, Resume Review, Opportunities). It's plain
  HTML/CSS/JS — no build tools, no framework, so you can open and edit it directly.
- `server.js` exposes one POST route per feature:
  - `POST /api/generate/roadmap`
  - `POST /api/generate/skills`
  - `POST /api/generate/interview`
  - `POST /api/generate/opportunities`
  - `POST /api/generate/resume`
  
  Each one takes the student's profile (and resume text, for the resume route), builds a
  prompt instructing Claude to return structured JSON, calls the Claude API, and returns the
  parsed JSON to the frontend.
- `GET /api/health` — a quick check that returns whether your API key is configured.

## Customizing

- **Model**: change the `MODEL` constant at the top of `server.js` if you want to use a
  different Claude model.
- **Prompts**: each route in `server.js` has its own `system` prompt defining the JSON schema
  Claude should return — tweak these to change what's generated or how many items come back.
- **Styling**: all CSS is in the `<style>` block at the top of `public/index.html`, using CSS
  variables (`--accent`, `--bg`, etc.) for easy re-theming.

## Deploying beyond localhost

This structure (a single Express server serving a static frontend + API routes) will run as-is
on most Node hosts (Render, Railway, Fly.io, a VPS, etc.) — just set the `ANTHROPIC_API_KEY`
environment variable in your host's dashboard instead of a local `.env` file, and make sure the
platform runs `npm install` then `npm start`. If you outgrow the single-file frontend, you can
swap `public/index.html` for a proper React/Vite build without changing the backend at all —
the API contract (`POST /api/generate/*`) stays the same either way.

## Troubleshooting

- **"ANTHROPIC_API_KEY is not set" warning in the console** — you haven't created `.env`, or it's
  missing the key. Copy `.env.example` to `.env` and fill it in, then restart the server.
- **401 / authentication errors** — double check the key was copied correctly and hasn't been
  revoked in the Anthropic Console.
- **Port already in use** — set a different `PORT` in `.env`.

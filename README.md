# Resume Tailor

AI-powered job application pipeline that tailors your resume, researches the company/role, generates interview prep, and logs everything to Google Sheets. Upload once, queue multiple job descriptions, and get ATS-optimized output in seconds.

## Features

- **Resume Upload** — Drag-and-drop .docx parsing with mammoth.js (client-side, no server upload)
- **JD Queue** — Add multiple job descriptions, process them in one click
- **AI Tailoring** — Keywords injection, bullet rewriting, and section reordering via Claude (through OpenRouter). Strictly grounded in your base resume — no hallucinated skills or inflated metrics
- **Company & Job Research** — Automated web search (Perplexity Sonar) for company intel and domain-specific knowledge relevant to the JD
- **Career Coach** — AI-generated interview prep: talking points, gap analysis, and company-specific insights
- **Cover Letter Generation** — Concise (~100 word) cover letters based on the tailored resume + JD
- **Google Sheets Tracker** — Automatically logs each application (role, company, resume link, research, questions, coach advice) to a Google Sheet via Apps Script
- **Google Drive Upload** — Tailored .docx resumes are uploaded to a "Resume Tailorer" folder in your Drive, with clickable links in the sheet
- **Formatted .docx Export** — Professional formatting matching your original resume layout (centered name, right-aligned dates, section headers with underlines, bullet points)
- **Appendix Support** — Attach appendix images (e.g. EP letters) via file upload, drag-and-drop, or clipboard paste. Exported as part of the same .docx
- **Tailoring Notes** — Transparent summary of keywords matched, changes made, and skill gaps identified
- **Privacy-first** — Everything runs client-side. Your resume and API key never leave your browser except for API calls to OpenRouter

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- mammoth.js (docx parsing)
- docx (docx generation)
- OpenRouter API (Claude Sonnet for tailoring/coaching, Perplexity Sonar for web search)
- Google Apps Script (Sheets + Drive integration, no OAuth)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. You'll need an [OpenRouter API key](https://openrouter.ai/keys) to use the AI features.

### Google Sheets Setup (Optional)

1. Create a new Google Sheet
2. Go to **Extensions > Apps Script**
3. Paste the Apps Script code (available in Settings within the app)
4. Run `getOrCreateFolder` from the editor to authorize Drive access
5. Deploy as **Web app** (Execute as: Me, Access: Anyone)
6. Copy the deployment URL into the app's Settings

## How It Works

1. Enter your OpenRouter API key
2. Upload your master resume (.docx)
3. Optionally attach appendix images (screenshots of EP letters, certificates, etc.)
4. Paste one or more job descriptions into the queue
5. Click "Process" — the pipeline runs automatically:
   - **Tailoring** — AI rewrites your resume for the JD
   - **Research** — Web search for company info and domain-specific knowledge
   - **Coaching** — Interview prep and talking points
   - **Export** — Logs to Google Sheets with Drive-hosted resume link (if configured)
6. Review results across 4 tabs: Resume, Notes, Research, Coach
7. Generate a cover letter if needed
8. Download the .docx (includes appendix if attached)

## Project Structure

```
src/
├── api/
│   ├── anthropic.ts        — Resume tailoring + cover letter prompts
│   ├── openrouter.ts       — Shared OpenRouter streaming client
│   ├── research.ts         — Company/job research via Perplexity Sonar
│   ├── careerCoach.ts      — Interview prep generation
│   └── googleSheets.ts     — Google Sheets export (base64 .docx + metadata)
├── components/
│   ├── AppendixUpload.tsx   — Multi-image appendix upload (file/drag/paste)
│   ├── JDQueue.tsx          — Job description queue management
│   ├── ResumeUpload.tsx     — Drag-and-drop .docx upload
│   ├── ResultView.tsx       — Tabbed results (resume, notes, research, coach)
│   └── Settings.tsx         — Google Sheets configuration + Apps Script template
├── hooks/
│   └── usePipeline.ts      — Pipeline orchestrator (tailor → research → coach → export)
├── context/AppContext.tsx   — Global state management
├── utils/export.ts          — Formatted .docx generation with appendix
├── types.ts                 — TypeScript interfaces
└── App.tsx                  — App shell with step routing
```

# Resume Tailor

AI-powered resume tailoring tool that customizes your resume and generates cover letters for each job application. Upload once, queue multiple job descriptions, and get ATS-optimized output in seconds.

## Features

- **Resume Upload** — Drag-and-drop .docx parsing with mammoth.js (client-side, no server upload)
- **JD Queue** — Add multiple job descriptions, process them sequentially
- **AI Tailoring** — Keywords injection, bullet rewriting, and section reordering via Claude (through OpenRouter)
- **Cover Letter Generation** — One-click cover letters based on the tailored resume + JD
- **Formatted .docx Export** — Professional formatting matching your original resume layout (centered name, right-aligned dates, section headers with underlines, bullet points)
- **Appendix Support** — Attach appendix images (e.g. EP letters) via file upload, drag-and-drop, or clipboard paste. Exported as part of the same .docx with an "APPENDIX" title page
- **Tailoring Notes** — Transparent summary of keywords matched, changes made, and skill gaps identified
- **Privacy-first** — Everything runs client-side. Your resume and API key never leave your browser except for API calls to OpenRouter

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- mammoth.js (docx parsing)
- docx (docx generation)
- OpenRouter API (Claude Sonnet)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. You'll need an [OpenRouter API key](https://openrouter.ai/keys) to use the AI features.

## How It Works

1. Enter your OpenRouter API key
2. Upload your master resume (.docx)
3. Optionally attach appendix images (screenshots of EP letters, certificates, etc.)
4. Paste one or more job descriptions into the queue
5. Click "Process Next" — the AI tailors your resume for each JD
6. Review the tailored resume and tailoring notes
7. Generate a cover letter if needed
8. Download the .docx (includes appendix if attached)

## Project Structure

```
src/
├── api/anthropic.ts          — OpenRouter API calls (tailoring + cover letter)
├── components/
│   ├── AppendixUpload.tsx    — Multi-image appendix upload (file/drag/paste)
│   ├── JDQueue.tsx           — Job description queue management
│   ├── ResumeUpload.tsx      — Drag-and-drop .docx upload
│   └── ResultView.tsx        — Results display, export, cover letter
├── context/AppContext.tsx     — Global state management
├── utils/export.ts           — Formatted .docx generation with appendix
├── types.ts                  — TypeScript interfaces
└── App.tsx                   — App shell with step routing
```

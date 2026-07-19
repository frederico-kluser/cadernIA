# cadernIA 🧠📒

**AI-powered notepad with ghost autocomplete.** Write naturally and let the AI suggest completions as you type — like having a co-writer inside your notebook.

## Features

- **Ghost Editor** — AI-powered inline autocomplete (OpenAI API). The suggestion appears as translucent "ghost text" ahead of your cursor; press Tab to accept.
- **Markdown Preview** — Toggle between raw markdown and rendered preview.
- **3D Notepad** — Visual notebook rendered with Three.js for an immersive writing experience.
- **Attachments Panel** — Upload files (code, docs, text) as context for AI suggestions.
- **Voice Transcription** — Record audio and transcribe via Whisper directly into your notes.
- **Local-first** — All notes and attachments stored in IndexedDB. No account needed.
- **API Key Dialog** — Bring your own OpenAI API key; never stored on any server.

## Tech Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS v3** + **shadcn/ui** (50+ components)
- **Three.js** (React Three Fiber) for 3D rendering
- **OpenAI API** — Chat Completions + Whisper
- **IndexedDB** for local persistence
- **React Router 7**, **React Markdown**, **Recharts**

## Getting Started

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Set your OpenAI API key in the app's **API Key** dialog (⚙️ icon).

## Project Structure

```
cadernIA/
├── src/
│   ├── components/   # React components + shadcn/ui
│   ├── hooks/        # Custom hooks
│   ├── lib/          # Database, OpenAI client, utils
│   ├── pages/        # Route pages
│   └── App.tsx       # Root component
├── index.html
├── vite.config.ts
├── package.json
└── README.md
```

## Agent Skills

This project uses a knowledge-skills system. Every task goes through `.agents/skills/project-router`. See `AGENTS.md` for commands and rules.

## License

MIT

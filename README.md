# Transcript Video Viewer

Web application for viewing synchronized deposition transcripts with video playback.

## Features

- 🎥 **Video Playback** - Synchronized video with transcript auto-scroll
- 📝 **Interactive Transcript** - Click any line to jump to that moment in the video
- ✂️ **Clip Creation** - Select ranges and create shareable clips
- 🤖 **AI Search** - Ask Tess to find relevant passages (powered by GPT-4o)
- 🔑 **Key Facts** - Automatically identify important moments
- 💾 **Export Clips** - Download clips as MP4 files

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **AI**: OpenAI GPT-4o
- **Video**: FFmpeg

## Development

### Local Setup

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd viewer
npm install
npm run dev
```

Visit: http://localhost:5173

### Environment Variables

Create `backend/.env`:
```
OPENAI_API_KEY=your-key-here
PORT=3001
```

## Deployment

Configured for Railway deployment with automatic builds.

### Railway Setup

1. Push to GitHub
2. Connect Railway to your repo
3. Add environment variable: `OPENAI_API_KEY`
4. Deploy automatically

## Project Structure

```
transcript-viewer-web/
├── backend/          # Express API server
│   ├── server.js     # Main server file
│   └── exports/      # Temporary clip storage
├── viewer/           # React frontend
│   ├── src/
│   │   ├── App.tsx   # Main application
│   │   └── types.ts  # TypeScript types
│   └── public/
│       ├── project.json       # Synced transcript data
│       └── sample-video.mp4   # Video file
└── railway.json      # Railway deployment config
```

## Usage

1. **View Transcript** - Scroll through synced transcript on the right
2. **Control Video** - Video auto-scrolls transcript as it plays
3. **Jump to Moments** - Click any transcript line to jump there
4. **Create Clips** - Shift+click start/end lines, name, and create
5. **Ask Tess** - Type questions to find relevant testimony
6. **Get Key Facts** - Click button to identify important moments

---

Built for Veritext Legal Solutions

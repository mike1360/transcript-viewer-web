# Transcript Video Viewer

AI-powered legal deposition viewer with video-transcript synchronization, intelligent search, and behavioral analysis.

**Live Demo:** https://transcript-video-sync-production.up.railway.app

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org))
- OpenAI API key ([Get one](https://platform.openai.com/api-keys))

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/mike1360/transcript-viewer-web.git
cd transcript-viewer-web
```

**2. Install dependencies:**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../viewer
npm install
```

**3. Configure environment variables:**

Create `backend/.env` file:
```env
OPENAI_API_KEY=sk-proj-your-key-here
NODE_ENV=development
PORT=3001
```

**4. Run the application:**

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd viewer
npm run dev
```

**5. Open in browser:**
```
http://localhost:5173
```

---

## 🎯 Features

### Core Features
- **Video-Transcript Sync** - Click transcript line → video jumps instantly
- **Auto-scroll** - Video plays → transcript follows automatically
- **Clip Creation** - Shift+click to select range, create clips with thumbnails
- **Clip Export** - Individual or bulk MP4 export with optional burned-in captions

### AI Features (Tess Panel)
- **Smart Search** - Natural language queries with GPT-4 ("Find attorney-client privilege mentions")
- **Key Facts** - AI identifies 5-10 most important testimony moments
- **Behavioral Analysis** ⭐ *NEW* - Video analysis of witness body language, facial expressions, demeanor

### Export Features
- Burn-in captions (transcript text on video)
- Bulk export with real-time progress bar
- Professional MP4 clips ready for trial presentations

---

## 📁 Project Structure

```
transcript-viewer-web/
├── backend/           # Node.js + Express API
│   ├── server.js      # Main server with AI endpoints
│   ├── exports/       # Temporary clip exports (gitignored)
│   └── package.json
│
├── viewer/            # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx    # Main component (1300+ lines)
│   │   └── App.css    # Styling
│   ├── public/
│   │   └── project.json  # Demo deposition data
│   └── package.json
│
├── .gitignore
├── README.md
├── EXEC-SUMMARY.md    # Executive brief
└── ROADMAP.md         # Production roadmap
```

---

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- CSS Grid for responsive layout

**Backend:**
- Node.js + Express 5
- OpenAI API (GPT-4, GPT-4 Vision)
- FFmpeg (video processing)

**Infrastructure:**
- Railway (hosting)
- Cloudinary (video CDN)
- GitHub (version control + CI/CD)

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
```env
# Required
OPENAI_API_KEY=sk-proj-...          # OpenAI API key

# Optional
NODE_ENV=development                # development | production
PORT=3001                           # Server port (default: 3001)
```

**Get an OpenAI API key:** https://platform.openai.com/api-keys

**Cost estimates:**
- AI Search: ~$0.01-0.03 per query
- Key Facts: ~$0.10 per deposition
- Behavioral Analysis: ~$4 per deposition (8 frames)

---

## 🧪 Testing Locally

### Full Workflow Test

1. ✅ Load project (should show STACY KING case with 5 clips)
2. ✅ Click transcript line → video jumps to timestamp
3. ✅ Play video → transcript auto-scrolls
4. ✅ Search "attorney" → highlights matches
5. ✅ Click "Ask Tess" → AI panel opens
6. ✅ Try AI Search: "attorney-client relationship"
7. ✅ Generate Key Facts → shows important moments
8. ✅ Click "Behavior" tab → analyze deposition
9. ✅ Shift+click transcript range → create clip
10. ✅ Export clip → downloads MP4
11. ✅ Select multiple clips → bulk export
12. ✅ Toggle captions → exports with text overlay

---

## 📝 Development Workflow

### Making Changes

**1. Create a feature branch:**
```bash
git checkout -b feature/my-feature-name
```

**2. Make your changes and test locally**

**3. Build frontend to verify no errors:**
```bash
cd viewer
npm run build
```

**4. Commit changes:**
```bash
git add .
git commit -m "Add: description of your changes"
```

**5. Push to GitHub:**
```bash
git push origin feature/my-feature-name
```

**6. Create Pull Request on GitHub for review**

### Deploying to Production

**Automatic deployment:**
- Push to `main` branch → Railway auto-deploys in ~5 minutes
- Monitor deployment: https://railway.app
- Live URL: https://transcript-video-sync-production.up.railway.app

---

## 🐛 Troubleshooting

### "Failed to load project"
**Problem:** Frontend can't fetch project.json
**Fix:** Check `viewer/public/project.json` exists and is valid JSON

### "OpenAI API key not configured"
**Problem:** Backend can't access OpenAI API
**Fix:**
```bash
# Create backend/.env file
cd backend
echo "OPENAI_API_KEY=sk-proj-your-key-here" > .env
```
Then restart backend server

### "FFmpeg not found"
**Problem:** Video clip export fails
**Fix:**
```bash
# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### "Port already in use"
**Problem:** Port 3001 or 5173 is occupied
**Fix:**
```bash
# Kill backend (port 3001)
lsof -ti:3001 | xargs kill

# Kill frontend (port 5173)
lsof -ti:5173 | xargs kill
```

### Video not loading
**Problem:** Cloudinary video URL returns 404
**Fix:** Check URL is accessible:
```bash
curl -I https://res.cloudinary.com/dpunimzip/video/upload/v1771306141/sample-video-compressed_gkmwk9.mp4
```

---

## 📚 Additional Documentation

- **Production Roadmap:** `ROADMAP.md` - Detailed plan for production features
- **Executive Summary:** `EXEC-SUMMARY.md` - One-page project overview
- **OpenAI API:** https://platform.openai.com/docs
- **FFmpeg:** https://ffmpeg.org/documentation.html
- **React:** https://react.dev

---

## 🎯 Demo Quick Reference

**Wow Factor 1:** Video-transcript perfect sync
- Click any line → instant video jump
- Auto-scroll follows playback

**Wow Factor 2:** AI-powered search
- "Find mentions of attorney-client privilege"
- Returns page:line references with video timestamps

**Wow Factor 3:** Behavioral Analysis ⭐
- Analyzes witness body language and demeanor
- Identifies stress, confidence, deception indicators
- **UNIQUE: No competitors have this!**

**Wow Factor 4:** Professional clip export
- Select 5 clips → bulk export with captions
- Real-time progress bar
- Trial-ready MP4 output

---

## 🤝 Getting Help

**For Veritext team members:**
- Slack: #transcript-viewer
- Email: [your-email]
- GitHub Issues: https://github.com/mike1360/transcript-viewer-web/issues

---

## 📄 License

Proprietary - Veritext Legal Solutions

---

**Built in 6 hours. Production-ready in 3 weeks.** 🚀

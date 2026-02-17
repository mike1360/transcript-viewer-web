# Transcript Video Viewer (Web)

Client-facing web viewer for synced deposition transcripts.

## 🎯 Purpose

This is the **web viewer** that clients use to:
- View synchronized video + transcript
- Search transcript text
- Play pre-created clips
- (Future: Create and export clips)

## 🏗️ Architecture

**Workflow:**
1. **Desktop App** (Internal) - Staff use to align transcripts with video
2. **Export** - Desktop app exports synced data as `project.json`
3. **Web Viewer** (This app) - Clients load and interact with synced data

## 🚀 Running

```bash
npm run dev
```

Opens at: http://localhost:5173

## 📦 Sample Data

Located in `/public/`:
- `project.json` - Synced transcript data
- `sample-video.mp4` - Deposition video (186MB)

Sample case: **STACY KING** - Case BB 91-55538
- 998 transcript lines
- 822 aligned (82%)
- 5 clips

## ✨ Features

### Current:
- ✅ Video playback with transcript sync
- ✅ Click transcript line to seek video
- ✅ Auto-highlight current line
- ✅ Auto-scroll to active line
- ✅ Search transcript
- ✅ View and play clips

### Coming Soon:
- 🚧 Create new clips
- 🚧 Export clips as video
- 🚧 Export transcript sections
- 🚧 Advanced search (semantic)
- 🚧 Multi-project management

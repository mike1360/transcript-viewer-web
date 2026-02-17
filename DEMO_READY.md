# 🎬 Transcript Viewer Web - Demo Ready!

**Deployed:** Feb 16, 2026

## 🚀 Live Demo URL
**https://transcript-video-sync-production.up.railway.app**

Share this URL with anyone - no login required!

## ✅ What's Working

### Core Features
- ✅ Video playback with transcript auto-scroll sync
- ✅ Click any transcript line to jump to that moment
- ✅ Shift+click to select ranges for clip creation
- ✅ Create and name clips
- ✅ Export clips as MP4 files (downloads to browser)
- ✅ "Ask Tess" AI search - find relevant testimony instantly
- ✅ Key Facts generation - AI identifies important moments

### Demo Content
- **Deposition:** STACY KING - Case BB 91-55538
- **Video:** Full 33-minute deposition (compressed to 67MB)
- **Transcript:** 822/998 lines synced with timestamps
- **Clips:** 5 sample clips pre-created for demonstration

## 🎯 For Your Demo Tomorrow

### Show These Features:
1. **Click a transcript line** → video jumps to that moment
2. **Video plays** → transcript auto-scrolls
3. **Create a clip** → Shift+click start line, Shift+click end line, name it
4. **Export clip** → Downloads as MP4
5. **Ask Tess** → Type "when did she talk about depositions?"
6. **Key Facts** → Click button to see AI-identified important moments

### Quick Demo Script:
> "This is a legal deposition that's already synced with video timestamps. Watch - when I click any line in the transcript, the video jumps right to that moment. And as the video plays, the transcript automatically scrolls along.
>
> Now say I want to create a clip - I just Shift+click the start line, Shift+click the end line, give it a name, and I can export it as an MP4 file.
>
> The AI assistant 'Tess' can help me find specific moments - if I ask 'when did she talk about subpoenas?' it searches the entire transcript and shows me exactly where, with page and line numbers.
>
> And the Key Facts feature uses AI to automatically identify the most important moments in the deposition."

## 📱 Alternative: Desktop App

If you need to demo without internet:

```bash
cd /Users/mikemurray/transcript-video-sync
npm run dev
```

The Electron desktop app will open with full functionality.

## 🔧 Technical Details

### Hosting
- **Platform:** Railway
- **Project:** capable-dedication
- **GitHub:** https://github.com/mike1360/transcript-viewer-web
- **Video CDN:** Cloudinary (free tier)

### Video Hosting
- **Cloudinary URL:** `https://res.cloudinary.com/dpunimzip/video/upload/v1771306141/sample-video-compressed_gkmwk9.mp4`
- **Original:** 186MB → **Compressed:** 67MB
- **Compression:** `ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 96k -movflags +faststart output.mp4`

### Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **AI:** OpenAI GPT-4o (for search & key facts)
- **Video Processing:** FFmpeg (for clip export)

## 🎓 Key Files

- **Frontend Code:** `viewer/src/App.tsx`
- **Backend API:** `backend/server.js`
- **Demo Data:** `viewer/public/project.json`
- **Deployment Config:** `railway.json`, `nixpacks.toml`

## 📝 Notes for Future

### If Video Needs Updating:
1. Compress video under 100MB: `ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 96k -movflags +faststart output.mp4`
2. Upload to Cloudinary dashboard
3. Update video URL in `viewer/src/App.tsx` (lines ~195 and ~659)
4. Commit and push to GitHub - Railway auto-deploys

### Railway Deployment:
- Pushes to `main` branch automatically trigger deployment
- Build takes ~5-10 minutes
- May show TypeScript errors during build but eventually succeeds

### Cloudinary Free Tier Limits:
- **Max file size:** 100MB per video
- **Total storage:** 25GB
- **Bandwidth:** 25GB/month
- **Transformations:** 25,000/month

---

**Ready to impress!** 🎉

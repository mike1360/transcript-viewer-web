# Transcript Viewer Web - Production Roadmap

**Current Status:** Demo-ready viewer with AI features and export capabilities
**Goal:** Production-ready platform for Veritext legal depositions

---

## 🔴 **CRITICAL - Phase 1: Core Production Features**

### 1. Backend Alignment Tool (Staff Portal)
**Purpose:** Allow Veritext staff to upload transcripts + videos and create synchronized projects

**Features Needed:**
- **Upload Interface:**
  - Drag-and-drop transcript file (TXT/PDF)
  - Drag-and-drop video file (MP4/MOV) → auto-upload to Cloudinary
  - Project metadata form (case name, deponent, date, case number)

- **Alignment Engine:**
  - **Option A (Current):** Use OpenAI Whisper API for speech-to-text
    - Auto-match transcript lines to Whisper segments
    - Show confidence scores per line
    - Manual adjustment interface for low-confidence matches
  - **Option B (Advanced):** Use existing Electron app logic
    - Port the subsequence matching algorithm from `transcript-video-sync`
    - Chunk-based resync for lost alignment
    - Handle non-spoken text (parenthetical annotations)

- **Review & Edit Interface:**
  - Side-by-side: transcript lines (left) + video player (right)
  - Click line → jumps video to that timestamp
  - Click video timestamp → highlights line
  - Drag to adjust start/end times for each line
  - Bulk operations: "Shift all times after this line by +2s"
  - Visual indicators: green (aligned), yellow (low confidence), red (unaligned)

- **Clip Management:**
  - Create clips from aligned transcript
  - Generate thumbnails automatically
  - Edit clip names and metadata

- **Export/Publish:**
  - Save project to database (SQLite → PostgreSQL for production)
  - Generate shareable public URL
  - Option to password-protect projects

**Tech Stack:**
- Backend: Node.js + Express (reuse existing API)
- Frontend: React admin panel (separate from viewer)
- Storage: PostgreSQL database + Cloudinary for media
- Auth: Simple JWT-based login for Veritext staff

**Estimated Time:** 2-3 days

**Files to Create:**
- `/admin/` - New admin portal
- `/admin/src/pages/AlignmentEditor.tsx` - Main alignment UI
- `/backend/routes/admin.js` - Admin API endpoints
- `/backend/alignment/` - Alignment algorithms

---

### 2. Multi-Database Support
**Current:** Single hardcoded project (`project.json`)
**Needed:** Database to store multiple projects

**Schema:**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  case_number VARCHAR(100),
  deponent_name VARCHAR(255),
  video_url TEXT,
  video_cloudinary_id VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by VARCHAR(255), -- staff email
  is_public BOOLEAN DEFAULT false,
  password_hash VARCHAR(255) -- optional
);

CREATE TABLE transcript_lines (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  page INTEGER,
  line_number INTEGER,
  speaker VARCHAR(50),
  text TEXT,
  start_time FLOAT,
  end_time FLOAT,
  confidence FLOAT, -- alignment confidence 0-1
  is_aligned BOOLEAN
);

CREATE TABLE clips (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name VARCHAR(255),
  start_time FLOAT,
  end_time FLOAT,
  thumbnail_url TEXT,
  created_at TIMESTAMP
);
```

**Migration Path:**
1. Install PostgreSQL (Railway has built-in support)
2. Create migration scripts
3. Update API endpoints to query database
4. Keep JSON export option for backwards compatibility

**Estimated Time:** 1 day

---

### 3. User Authentication & Access Control
**Needed for:**
- Staff-only alignment tool access
- Per-project permissions
- Usage tracking and billing

**Implementation:**
- **Staff Portal:** Email/password login (bcrypt hashing)
- **Viewer Access:**
  - Public links (no login required)
  - Optional password protection per project
  - Share by email with expiration dates
- **Roles:**
  - Admin (manage all projects, users)
  - Staff (create/edit own projects)
  - Viewer (read-only link access)

**Tech:**
- JWT tokens for session management
- Refresh tokens for long-lived sessions
- Rate limiting to prevent abuse

**Estimated Time:** 1 day

---

## 🟡 **HIGH PRIORITY - Phase 2: Export & Integration**

### 4. Export to MDB (Microsoft Access Database)
**Purpose:** Compatibility with trial presentation software (TrialDirector, Sanction, etc.)

**MDB Structure for Trial Software:**
```
Table: Depositions
- CaseID (Text)
- DeponentName (Text)
- VideoPath (Text)
- TranscriptPath (Text)

Table: Transcript
- DepositionID (Number, Foreign Key)
- Page (Number)
- Line (Number)
- Speaker (Text)
- Text (Memo)
- VideoTimestamp (Number) -- in seconds

Table: Clips
- ClipID (AutoNumber)
- DepositionID (Number, Foreign Key)
- ClipName (Text)
- StartTime (Number)
- EndTime (Number)
- VideoPath (Text)
```

**Implementation:**
- Use `mdb-tools` (Linux) or `node-mdb` library
- Or simpler: Export as CSV/XML with MDB-compatible schema
- Generate `.mdb` file on backend
- Download button: "💼 Export for Trial Software"

**Alternative Formats to Support:**
- **PTX (E-Transcript)** - Industry standard XML format
- **CSV** - Universal compatibility
- **JSON** - For API integrations

**Estimated Time:** 1-2 days

**Research Needed:**
- What specific trial software does Veritext use?
- Do they have sample .mdb files to reverse-engineer?
- Test imports in actual trial software

---

### 5. Fix PowerPoint Export
**Issues Found:**
- Video embedding not working (shows placeholder)
- pptxgenjs may not support video `addMedia()`

**Solution Options:**

**Option A: Embed Video as Link (Easiest)**
```javascript
// Add thumbnail image
slide.addImage({
  data: clipData.thumbnail,
  x: 0.3, y: 1.2, w: 5.5, h: 4.0
});

// Add clickable link overlay
slide.addText('▶ Click to Play', {
  x: 2.5, y: 3.0, w: 1.5, h: 0.5,
  hyperlink: { url: clipData.videoUrl }
});
```
- Pros: Works reliably, small file size
- Cons: Requires internet connection to play

**Option B: Use python-pptx Instead**
- Node.js calls Python script via child_process
- python-pptx has better video embedding support
- Pros: Can embed actual video files
- Cons: Adds Python dependency

**Option C: Export Video Files Separately**
- PowerPoint has thumbnails + links
- Include ZIP file with actual MP4 clips
- User manually links videos in PowerPoint
- Pros: Guaranteed to work
- Cons: Extra step for user

**Recommended:** Try Option A first (simplest), fallback to Option C

**Estimated Time:** 4-6 hours

---

## 🟢 **MEDIUM PRIORITY - Phase 3: Production Polish**

### 6. Clip Editing & Refinement
**Current Issue:** Sync isn't perfect, users can't adjust clip boundaries

**Features:**
- **Edit Clip Times:**
  - Click "✏️" button on clip
  - Show modal with video preview
  - Input fields for start/end time (MM:SS)
  - +/- buttons to nudge by 1 second
  - Preview button to test range
  - Save updates clip + regenerates thumbnail

- **Trim Controls:**
  - Drag handles on video scrubber
  - Visual waveform for precision
  - Snap to transcript line boundaries

- **Clip Metadata:**
  - Edit clip name
  - Add notes/tags
  - Mark as "Key Testimony" or "Impeachment"

**Estimated Time:** 1 day

---

### 7. Advanced Search & Navigation
**Enhance current search:**
- **Full-text search** across all transcript lines
- **Regex support** for pattern matching
- **Multi-term search:** "attorney AND privilege"
- **Search operators:** "question:" to find all questions
- **Search history** - quick access to recent searches
- **Bookmarks** - save important moments
- **Table of Contents** - auto-generate from speaker changes

**Estimated Time:** 1 day

---

### 8. Video Quality & Performance
**Current:** 67MB compressed video works well
**Optimize Further:**

- **Adaptive Streaming (HLS/DASH):**
  - Generate multiple quality versions (360p, 720p, 1080p)
  - Cloudinary auto-converts on upload
  - Video player switches quality based on bandwidth
  - Faster loading, smoother playback

- **Lazy Loading:**
  - Don't load full transcript on mount
  - Virtual scrolling for 1000+ line transcripts
  - Load clips on-demand

- **Thumbnail Sprite Sheets:**
  - Generate 1 image with all thumbnails
  - CSS background-position for fast rendering
  - Reduces HTTP requests

**Estimated Time:** 1 day

---

### 9. Collaboration Features
**For law firms using the viewer:**

- **Comments & Annotations:**
  - Click any line → add comment
  - @ mention team members
  - Resolve threads

- **Clip Collections:**
  - Group clips by theme ("Liability", "Damages", "Credibility")
  - Share collections with team

- **Activity Log:**
  - Track who viewed what
  - Time spent per section
  - Export viewing analytics

**Estimated Time:** 2-3 days

---

## 🔵 **LOW PRIORITY - Phase 4: Advanced Features**

### 10. Mobile Optimization
**Current:** Desktop-first design
**Needed:** Responsive mobile experience

- Touch-friendly controls
- Swipe to navigate clips
- Mobile-optimized video player
- Simplified layout for small screens

**Estimated Time:** 1-2 days

---

### 11. Multi-Language Support
**For international depositions:**
- Upload transcript in any language
- Whisper API supports 50+ languages
- UI translations (Spanish, French, etc.)

**Estimated Time:** 2-3 days

---

### 12. Live Deposition Viewer
**Future Feature:** Real-time viewer during remote depositions

- Court reporter types transcript live
- Real-time sync with video stream
- Searchable as testimony happens
- Export at end of deposition

**Estimated Time:** 1-2 weeks (complex)

---

## 🛠️ **TECHNICAL DEBT & INFRASTRUCTURE**

### 13. Error Handling & Monitoring
**Production Must-Haves:**

- **Sentry** - Error tracking and alerts
- **LogRocket** - Session replay for debugging
- **Uptime Monitoring** - Railway health checks
- **Graceful Failures:**
  - Video load errors → show retry button
  - API timeouts → retry with exponential backoff
  - Cloudinary failures → fallback to local cache

**Estimated Time:** 1 day

---

### 14. Testing & Quality Assurance
**Current:** Manual testing only
**Add:**

- **Unit Tests:** Jest for utility functions
- **Integration Tests:** API endpoint testing
- **E2E Tests:** Playwright for user flows
- **Visual Regression:** Percy for UI changes
- **Load Testing:** Can it handle 100 concurrent users?

**Estimated Time:** 2-3 days

---

### 15. Documentation
**For Production Launch:**

- **User Guide:** How to use the viewer
- **Staff Manual:** How to create aligned projects
- **API Docs:** For custom integrations
- **Video Tutorials:** Screen recordings of key workflows
- **FAQ:** Common issues and solutions

**Estimated Time:** 1-2 days

---

### 16. Security Hardening
**Before Public Release:**

- **Rate Limiting:** Prevent API abuse
- **CORS Restrictions:** Whitelist allowed domains
- **Input Validation:** Sanitize all user inputs
- **SQL Injection Prevention:** Use parameterized queries
- **XSS Protection:** Escape HTML in transcript text
- **HTTPS Only:** Force secure connections
- **Content Security Policy:** Restrict script sources
- **Video Watermarking:** Optional watermark for confidential cases

**Estimated Time:** 1 day

---

### 17. Scalability & Cost Optimization
**Current Costs (Estimated):**
- Railway: $5-20/month (hobby plan)
- Cloudinary: Free tier (25GB storage, 25GB bandwidth)
- OpenAI: ~$0.10-0.50 per transcript alignment

**Optimization Strategies:**
- **Caching:** Redis for frequently accessed data
- **CDN:** Cloudflare for static assets
- **Video Compression:** Pre-process videos to optimal size
- **Batch Processing:** Queue alignment jobs for off-peak hours
- **Usage Limits:** Cap free tier, paid plans for high volume

**Estimated Time:** 2-3 days

---

## 📋 **RECOMMENDED IMPLEMENTATION ORDER**

### **Week 1: Core Backend (Most Critical)**
1. ✅ Backend Alignment Tool (3 days)
2. ✅ Multi-Database Support (1 day)
3. ✅ User Authentication (1 day)

### **Week 2: Export & Refinement**
4. ✅ Export to MDB (2 days)
5. ✅ Fix PowerPoint Export (1 day)
6. ✅ Clip Editing (1 day)
7. ✅ Error Handling (1 day)

### **Week 3: Production Readiness**
8. ✅ Security Hardening (1 day)
9. ✅ Testing Suite (2 days)
10. ✅ Documentation (2 days)

### **Week 4+: Advanced Features**
11. Video Performance Optimization
12. Advanced Search
13. Collaboration Features
14. Mobile Optimization

---

## 🎯 **SUCCESS METRICS**

**Technical:**
- ✅ 99.9% uptime
- ✅ <2s page load time
- ✅ <5s alignment per transcript page
- ✅ Support 500+ concurrent viewers

**Business:**
- ✅ Reduce manual alignment time by 80%
- ✅ Enable self-service for law firms
- ✅ Export to 3+ trial software formats
- ✅ <5 support tickets per 100 projects

---

## 💰 **COST ESTIMATES**

**Development Time:**
- Phase 1 (Critical): 5 days
- Phase 2 (High Priority): 4 days
- Phase 3 (Medium Priority): 5 days
- **Total MVP:** ~2-3 weeks full-time

**Infrastructure (Monthly):**
- Railway Pro: $20
- Cloudinary: $0-89 (depends on usage)
- PostgreSQL: $0 (Railway included)
- Domain: $12/year
- **Total:** ~$25-110/month

**Optional Services:**
- Sentry (monitoring): $26/month
- LogRocket (session replay): $99/month
- OpenAI API: Pay-per-use (~$50-200/month)

---

## 🚀 **LAUNCH CHECKLIST**

Before going live to Veritext clients:

- [ ] All Phase 1 features complete
- [ ] Database migrations tested
- [ ] Admin portal secured with auth
- [ ] Export to MDB tested in trial software
- [ ] PowerPoint export working reliably
- [ ] Error monitoring setup (Sentry)
- [ ] Backup strategy implemented
- [ ] User documentation written
- [ ] Staff training completed
- [ ] Load testing passed (100+ users)
- [ ] Security audit completed
- [ ] Legal/compliance review (HIPAA, if applicable)
- [ ] Pricing/billing system (if charging)
- [ ] Terms of Service & Privacy Policy
- [ ] Support email/chat setup

---

## 📞 **NEXT STEPS AFTER DEMO**

1. **User Feedback:** What did the demo audience want most?
2. **Priority Review:** Adjust roadmap based on feedback
3. **Start with Alignment Tool:** Most critical path to production
4. **Set Milestones:** Weekly check-ins on progress
5. **Beta Testing:** Get 2-3 Veritext staff using admin portal

---

**Questions to Answer Tomorrow:**
1. What trial software does Veritext use? (Determines MDB export format)
2. How many depositions per month? (Determines infrastructure sizing)
3. Who are the primary users? (Veritext staff vs. law firm clients)
4. Any compliance requirements? (HIPAA, SOC2, etc.)
5. Timeline for production launch? (Helps prioritize features)

---

**Ready to build! 🎉**

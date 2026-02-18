import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Serve static files from viewer build
app.use(express.static(path.join(__dirname, '../viewer/dist')));

// Serve video and project files
app.use('/sample-video.mp4', express.static(path.join(__dirname, '../viewer/public/sample-video.mp4')));
app.use('/project.json', express.static(path.join(__dirname, '../viewer/public/project.json')));

// Load project data
let projectData = null;
try {
  const projectPath = path.join(__dirname, '../viewer/public/project.json');
  projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  console.log('✓ Project data loaded:', projectData.metadata.name);
} catch (err) {
  console.error('Failed to load project data:', err);
}

// Helper to format transcript text for AI
function formatTranscriptForAI(lines) {
  return lines
    .map(line => {
      const speaker = line.speaker ? `${line.speaker}: ` : '';
      const location = `[Page ${line.page}:${line.line_number}]`;
      return `${location} ${speaker}${line.text}`;
    })
    .join('\n');
}

// AI Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !projectData) {
      return res.status(400).json({ error: 'Missing query or project data' });
    }

    console.log('AI Search query:', query);

    // Format transcript for AI
    const transcriptText = formatTranscriptForAI(projectData.transcriptLines);

    // Use OpenAI to find relevant passages
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a legal deposition transcript. The user will ask a question, and you need to find the most relevant passages from the transcript that answer or relate to their question.

For each relevant passage, provide:
1. The page and line number from the [Page X:Y] markers
2. The text of the passage (include 2-3 lines of context)
3. A relevance score (0-100) explaining how well it matches the query
4. The start and end times if available

Return your response as a JSON array of results. Each result should have:
{
  "text": "the relevant passage text with context",
  "match": 85,
  "page": 12,
  "line": 5,
  "explanation": "brief explanation of why this is relevant"
}

Focus on finding 3-5 most relevant passages. Be thorough but concise.`,
        },
        {
          role: 'user',
          content: `Question: ${query}\n\nTranscript:\n${transcriptText}`,
        },
      ],
      temperature: 0.3,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('AI Response:', aiResponse);

    // Parse AI response
    let results = [];
    try {
      // Extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Enhance results with timing data from the transcript
    const enhancedResults = results.map(result => {
      // Find exact line first
      let matchingLine = projectData.transcriptLines.find(
        line => line.page === result.page && line.line_number === result.line
      );

      // If exact line has no timing, search nearby (within ±2 lines) for the closest synced line
      if (!matchingLine || !matchingLine.start_time) {
        const nearbyLines = projectData.transcriptLines.filter(
          line => line.page === result.page
            && Math.abs(line.line_number - result.line) <= 2
            && line.start_time !== undefined
            && line.start_time !== null
        );

        if (nearbyLines.length > 0) {
          // Sort by distance from target line, take closest
          nearbyLines.sort((a, b) =>
            Math.abs(a.line_number - result.line) - Math.abs(b.line_number - result.line)
          );
          matchingLine = nearbyLines[0];
        }
      }

      // If we have a match, find the end line (3-5 lines after for context)
      if (matchingLine && matchingLine.start_time) {
        const contextLines = projectData.transcriptLines.filter(
          line => line.page === result.page
            && line.line_number >= matchingLine.line_number
            && line.line_number <= matchingLine.line_number + 5
            && line.start_time !== undefined
            && line.start_time !== null
        );

        const lastLine = contextLines.length > 0
          ? contextLines[contextLines.length - 1]
          : matchingLine;

        return {
          ...result,
          startTime: matchingLine.start_time,
          endTime: lastLine.end_time || matchingLine.end_time,
        };
      }

      return result;
    });

    res.json({ results: enhancedResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Key Facts endpoint (formerly summary)
app.post('/api/summary', async (req, res) => {
  try {
    if (!projectData) {
      return res.status(400).json({ error: 'Project data not loaded' });
    }

    console.log('Generating key facts...');

    // Format transcript for AI
    const transcriptText = formatTranscriptForAI(projectData.transcriptLines);

    // Use OpenAI to identify key facts
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a legal deposition transcript. Identify the 5-10 most important moments or "key facts" from the testimony.

For each key fact, provide:
1. title: A short, clear description of what's significant (e.g., "Witness Admits Prior Counsel Relationship")
2. quote: The actual testimony verbatim (2-4 lines of Q&A or statement)
3. page: The page number from [Page X:Y] markers
4. line: The line number from [Page X:Y] markers
5. significance: 1-2 sentences explaining why this moment is important for the case

Focus on:
- Admissions or contradictions
- Key evidence or document discussions
- Important timeline or factual revelations
- Credibility issues
- Central legal issues or themes

Return your response as a JSON array. Each key fact should be:
{
  "title": "Brief descriptive title",
  "quote": "Actual testimony quote",
  "page": 12,
  "line": 5,
  "significance": "Why this matters"
}

Order them by importance, most critical first.`,
        },
        {
          role: 'user',
          content: `Identify the key facts from this deposition:\n\n${transcriptText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('Key facts generated');

    // Parse AI response
    let keyFacts = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        keyFacts = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('Failed to parse key facts:', parseErr);
      return res.status(500).json({ error: 'Failed to parse key facts response' });
    }

    // Enhance with timing data
    const enhancedKeyFacts = keyFacts.map(fact => {
      // Find exact line first
      let matchingLine = projectData.transcriptLines.find(
        line => line.page === fact.page && line.line_number === fact.line
      );

      // If exact line has no timing, search nearby (within ±2 lines) for the closest synced line
      if (!matchingLine || !matchingLine.start_time) {
        const nearbyLines = projectData.transcriptLines.filter(
          line => line.page === fact.page
            && Math.abs(line.line_number - fact.line) <= 2
            && line.start_time !== undefined
            && line.start_time !== null
        );

        if (nearbyLines.length > 0) {
          // Sort by distance from target line, take closest
          nearbyLines.sort((a, b) =>
            Math.abs(a.line_number - fact.line) - Math.abs(b.line_number - fact.line)
          );
          matchingLine = nearbyLines[0];
        }
      }

      // If we have a match, find the end line (3-5 lines after for context)
      if (matchingLine && matchingLine.start_time) {
        const contextLines = projectData.transcriptLines.filter(
          line => line.page === fact.page
            && line.line_number >= matchingLine.line_number
            && line.line_number <= matchingLine.line_number + 5
            && line.start_time !== undefined
            && line.start_time !== null
        );

        const lastLine = contextLines.length > 0
          ? contextLines[contextLines.length - 1]
          : matchingLine;

        return {
          ...fact,
          startTime: matchingLine.start_time,
          endTime: lastLine.end_time || matchingLine.end_time,
        };
      }

      return fact;
    });

    res.json({ keyFacts: enhancedKeyFacts });
  } catch (error) {
    console.error('Key facts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate SRT subtitle file
function generateSRT(lines, clipStartTime) {
  let srtContent = '';
  let index = 1;

  for (const line of lines) {
    if (!line.start_time || !line.end_time) continue;

    // Adjust times relative to clip start
    const startSec = line.start_time - clipStartTime;
    const endSec = line.end_time - clipStartTime;

    // Skip lines outside clip range
    if (startSec < 0 || endSec < 0) continue;

    // Format times as SRT format (HH:MM:SS,mmm)
    const formatTime = (sec) => {
      const hours = Math.floor(sec / 3600);
      const minutes = Math.floor((sec % 3600) / 60);
      const seconds = Math.floor(sec % 60);
      const milliseconds = Math.floor((sec % 1) * 1000);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    };

    const speaker = line.speaker ? `${line.speaker}: ` : '';
    const text = `${speaker}${line.text}`;

    srtContent += `${index}\n`;
    srtContent += `${formatTime(startSec)} --> ${formatTime(endSec)}\n`;
    srtContent += `${text}\n\n`;
    index++;
  }

  return srtContent;
}

// Export video clip endpoint
app.post('/api/export-clip', async (req, res) => {
  try {
    const { startTime, endTime, clipName, withCaptions } = req.body;

    if (!startTime || !endTime || !clipName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log(`Exporting clip: ${clipName} (${startTime}s - ${endTime}s)${withCaptions ? ' with captions' : ''}`);

    // Use Cloudinary URL in production, local file in development
    const sourceVideo = process.env.NODE_ENV === 'production'
      ? 'https://res.cloudinary.com/dpunimzip/video/upload/v1771306141/sample-video-compressed_gkmwk9.mp4'
      : path.join(__dirname, '../viewer/public/sample-video.mp4');

    // For local files, check if they exist
    if (!sourceVideo.startsWith('http') && !fs.existsSync(sourceVideo)) {
      return res.status(404).json({ error: 'Source video not found' });
    }

    // Create temp directory for exports if it doesn't exist
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const duration = endTime - startTime;
    const sanitizedName = clipName.replace(/[^a-z0-9]/gi, '_');
    const outputPath = path.join(exportsDir, `${sanitizedName}_${Date.now()}.mp4`);

    let srtPath = null;

    // Generate SRT file if captions requested
    if (withCaptions && projectData) {
      const clipLines = projectData.transcriptLines.filter(
        line => line.start_time >= startTime && line.end_time <= endTime
      );
      const srtContent = generateSRT(clipLines, startTime);
      srtPath = path.join(exportsDir, `${sanitizedName}_${Date.now()}.srt`);
      fs.writeFileSync(srtPath, srtContent, 'utf8');
      console.log(`✓ SRT file generated: ${srtPath}`);
    }

    // Extract video segment using ffmpeg (works with URLs or local files)
    await new Promise((resolve, reject) => {
      const command = ffmpeg(sourceVideo)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23'
        ]);

      // Burn in subtitles if SRT file exists
      if (srtPath) {
        // Escape path for Windows compatibility
        const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        command.videoFilters({
          filter: 'subtitles',
          options: {
            filename: escapedSrtPath,
            force_style: 'FontName=Arial,FontSize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Shadow=1,MarginV=30'
          }
        });
      }

      command
        .on('end', () => {
          console.log(`✓ Clip exported: ${outputPath}`);
          // Clean up SRT file
          if (srtPath && fs.existsSync(srtPath)) {
            fs.unlinkSync(srtPath);
          }
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          // Clean up SRT file on error
          if (srtPath && fs.existsSync(srtPath)) {
            fs.unlinkSync(srtPath);
          }
          reject(err);
        })
        .run();
    });

    // Send the file for download
    res.download(outputPath, `${sanitizedName}.mp4`, (err) => {
      // Clean up temp file after download
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Behavioral Analysis endpoint - Deposition-focused
app.post('/api/analyze-behavior', async (req, res) => {
  try {
    const { timestamps } = req.body;

    if (!timestamps || !Array.isArray(timestamps) || timestamps.length === 0) {
      return res.status(400).json({ error: 'Missing timestamps array' });
    }

    console.log(`Analyzing deposition behavior at ${timestamps.length} timestamps...`);

    const analyses = [];
    let frameIndex = 0;

    for (const timestamp of timestamps) {
      frameIndex++;

      // Create a frame URL (Cloudinary can generate video thumbnails)
      const frameUrl = `https://res.cloudinary.com/dpunimzip/video/upload/so_${Math.floor(timestamp)}.0/sample-video-compressed_gkmwk9.jpg`;

      try {
        // Use GPT-4 Vision to analyze the frame
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert behavioral analyst specializing in legal depositions. Analyze witness body language and demeanor from this deposition video frame.

FOCUS ON:
- Credibility indicators (eye contact, facial expressions)
- Stress markers (tension, fidgeting, defensive postures)
- Confidence vs. uncertainty (posture, gestures)
- Evasiveness or discomfort (avoiding gaze, closed body language)

Return a JSON object:
{
  "summary": "1-2 sentence concise observation focusing on credibility and demeanor",
  "indicators": [
    {"type": "positive/negative/neutral", "description": "Specific observable behavior"},
    {"type": "positive/negative/neutral", "description": "Another specific behavior"},
    {"type": "positive/negative/neutral", "description": "At least 3 observations"}
  ],
  "confidence": "high/medium/low"
}

Type meanings:
- positive = Credibility indicators (eye contact, confidence, openness)
- negative = Concern markers (evasiveness, stress, defensiveness)
- neutral = Observable but ambiguous behaviors`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this deposition witness at ${Math.floor(timestamp / 60)}:${(timestamp % 60).toFixed(0).padStart(2, '0')}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: frameUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 400,
          temperature: 0.2
        });

        const aiResponse = completion.choices[0].message.content;

        // Try to parse JSON response
        let analysis = null;
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
          }
        } catch (parseErr) {
          console.error('Failed to parse behavior analysis:', parseErr);
          continue; // Skip this frame if parsing fails
        }

        // Always include first 5 results, then be selective
        if (analysis && (analyses.length < 5 || analysis.notable !== false)) {
          analyses.push({
            timestamp,
            summary: analysis.summary || 'Notable behavior observed',
            indicators: analysis.indicators || [],
            confidence: analysis.confidence || 'medium',
            frameUrl
          });
          console.log(`✓ Analyzed timestamp ${timestamp}s (${analyses.length})`);
        } else {
          console.log(`- Skipped ${timestamp}s (not notable, already have 5+)`);
        }

      } catch (frameError) {
        console.error(`Failed to analyze frame at ${timestamp}:`, frameError.message);
        // Continue with other frames even if one fails
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✓ Analysis complete: ${analyses.length}/${timestamps.length} notable moments`);
    res.json({ analyses });
  } catch (error) {
    console.error('Behavioral analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    projectLoaded: !!projectData,
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    ffmpegAvailable: true
  });
});

// Serve React app for all other routes (must be last)
// Express 5 compatible: use middleware instead of wildcard route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../viewer/dist/index.html'));
});

app.listen(port, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${port}`);
  console.log(`✓ OpenAI API key configured`);
  console.log(`✓ CORS enabled for frontend\n`);
});

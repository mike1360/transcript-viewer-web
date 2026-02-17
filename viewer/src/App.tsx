import { useState, useEffect, useRef } from 'react';
import './App.css';

interface TranscriptLine {
  line_id: number;
  page: number;
  line_number: number;
  speaker: string | null;
  text: string;
  start_time: number | null;
  end_time: number | null;
}

interface Clip {
  clip_id: string;
  name: string;
  start_page: number;
  end_page: number;
  start_line: number;
  end_line: number;
  start_time: number;
  end_time: number;
  text: string | null;
  created_at: string;
}

interface ProjectData {
  metadata: {
    name: string;
    caseNumber: string;
    deponentName: string;
    isAligned: boolean;
    createdAt: string;
    alignmentDate?: string;
  };
  stats: {
    totalLines: number;
    alignedLines: number;
    totalClips: number;
  };
  transcriptLines: TranscriptLine[];
  clips: Clip[];
}

function App() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [playingClip, setPlayingClip] = useState<Clip | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiMode, setAIMode] = useState<'search' | 'summary' | null>(null);
  const [aiQuery, setAIQuery] = useState('');
  const [aiResults, setAIResults] = useState<any[]>([]);
  const [aiKeyFacts, setAIKeyFacts] = useState<any[]>([]);
  const [aiLoading, setAILoading] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [showClipDialog, setShowClipDialog] = useState(false);
  const [clipName, setClipName] = useState('');
  const [editingClip, setEditingClip] = useState<Clip | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [clipThumbnails, setClipThumbnails] = useState<Record<string, string>>({});
  const [selectionInfo, setSelectionInfo] = useState<{
    lineIds: number[];
    startTime: number;
    endTime: number;
  } | null>(null);
  const [savedSelectionInfo, setSavedSelectionInfo] = useState<{
    lineIds: number[];
    startTime: number;
    endTime: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const searchMatchRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load project data
  useEffect(() => {
    fetch('/project.json')
      .then(res => res.json())
      .then(data => {
        setProject(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load project:', err);
        setLoading(false);
      });
  }, []);

  // Update current time and active line as video plays
  const handleTimeUpdate = () => {
    if (!videoRef.current || !project) return;
    const time = videoRef.current.currentTime;

    // If playing a clip, stop when reaching end time
    if (playingClip && time >= playingClip.end_time) {
      videoRef.current.pause();
      setPlayingClip(null);
      return;
    }

    // Find the active line based on current video time
    const active = project.transcriptLines.find(
      (line) =>
        line.start_time !== null &&
        line.end_time !== null &&
        time >= line.start_time &&
        time < line.end_time
    );

    if (active && active.line_id !== activeLine) {
      setActiveLine(active.line_id);
    }
  };

  // Seek video when clicking transcript line
  const handleLineClick = (line: TranscriptLine) => {
    if (line.start_time !== null && videoRef.current) {
      videoRef.current.currentTime = line.start_time;
      videoRef.current.play();
    }
  };

  // Check for text selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !project) {
        setSelectionInfo(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!range || range.collapsed) {
        setSelectionInfo(null);
        return;
      }

      // Find all transcript lines within the selection
      const container = transcriptRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setSelectionInfo(null);
        return;
      }

      // Get all line elements
      const lineElements = Array.from(container.querySelectorAll('.transcript-line'));
      const selectedLineIds: number[] = [];

      lineElements.forEach((element) => {
        const lineId = parseInt(element.getAttribute('data-line-id') || '0');
        if (lineId && selection.containsNode(element, true)) {
          selectedLineIds.push(lineId);
        }
      });

      if (selectedLineIds.length === 0) {
        setSelectionInfo(null);
        return;
      }

      // Get time range
      const selectedLines = project.transcriptLines.filter(l => selectedLineIds.includes(l.line_id));
      const firstLine = selectedLines[0];
      const lastLine = selectedLines[selectedLines.length - 1];

      if (firstLine && lastLine && firstLine.start_time !== null && lastLine.end_time !== null) {
        setSelectionInfo({
          lineIds: selectedLineIds,
          startTime: firstLine.start_time,
          endTime: lastLine.end_time,
        });
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [project]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelectionInfo(null);
  };

  // Generate thumbnail for a clip
  const generateThumbnail = async (clip: Clip): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = 'https://res.cloudinary.com/dpunimzip/video/upload/v1771306141/sample-video-compressed_gkmwk9.mp4';
      video.crossOrigin = 'anonymous';

      video.addEventListener('loadeddata', () => {
        video.currentTime = clip.start_time;
      });

      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        }
      });
    });
  };

  // Generate thumbnails for all clips
  useEffect(() => {
    if (!project) return;

    const generateAllThumbnails = async () => {
      const thumbnails: Record<string, string> = {};

      for (const clip of project.clips) {
        if (!clipThumbnails[clip.clip_id]) {
          try {
            thumbnails[clip.clip_id] = await generateThumbnail(clip);
          } catch (err) {
            console.error('Failed to generate thumbnail:', err);
          }
        }
      }

      if (Object.keys(thumbnails).length > 0) {
        setClipThumbnails(prev => ({ ...prev, ...thumbnails }));
      }
    };

    generateAllThumbnails();
  }, [project?.clips.length]);

  // Create clip from text selection
  const handleCreateClip = () => {
    if (!selectionInfo || !project) return;
    setSavedSelectionInfo(selectionInfo); // Preserve selection info
    setShowClipDialog(true);
  };

  const handleSaveClip = () => {
    if (!clipName.trim() || !project || !savedSelectionInfo) return;

    const selectedLines = project.transcriptLines.filter(l => savedSelectionInfo.lineIds.includes(l.line_id));
    const firstLine = selectedLines[0];
    const lastLine = selectedLines[selectedLines.length - 1];

    if (!firstLine || !lastLine) return;

    // Get all text from selected lines
    const clipText = selectedLines.map(l => l.text).join(' ');

    const newClip: Clip = {
      clip_id: `clip_${Date.now()}`,
      name: clipName.trim(),
      start_page: firstLine.page,
      end_page: lastLine.page,
      start_line: firstLine.line_number,
      end_line: lastLine.line_number,
      start_time: savedSelectionInfo.startTime,
      end_time: savedSelectionInfo.endTime,
      text: clipText,
      created_at: new Date().toISOString(),
    };

    // Add to project clips
    setProject({
      ...project,
      clips: [...project.clips, newClip],
      stats: {
        ...project.stats,
        totalClips: project.stats.totalClips + 1,
      },
    });

    // Reset
    setShowClipDialog(false);
    setClipName('');
    setSavedSelectionInfo(null);
    clearSelection();
  };

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLine && activeLineRef.current && transcriptRef.current) {
      const lineElement = activeLineRef.current;
      const container = transcriptRef.current;

      const lineTop = lineElement.offsetTop;
      const lineHeight = lineElement.offsetHeight;
      const containerHeight = container.clientHeight;
      const scrollTop = container.scrollTop;

      // Scroll if line is not visible
      if (lineTop < scrollTop || lineTop + lineHeight > scrollTop + containerHeight) {
        container.scrollTo({
          top: lineTop - containerHeight / 2 + lineHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeLine]);

  // Don't filter - show all lines but highlight matches
  const filteredLines = project?.transcriptLines || [];

  // Find all lines that match the search
  const searchMatches = filteredLines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) =>
      searchQuery && line.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Reset search index when query changes
  useEffect(() => {
    setCurrentSearchIndex(0);
  }, [searchQuery]);

  // Scroll to current search match
  useEffect(() => {
    if (searchMatches.length > 0 && searchMatchRefs.current[currentSearchIndex]) {
      const element = searchMatchRefs.current[currentSearchIndex];
      if (element && transcriptRef.current) {
        const container = transcriptRef.current;
        const elementTop = element.offsetTop;
        const elementHeight = element.offsetHeight;
        const containerHeight = container.clientHeight;

        container.scrollTo({
          top: elementTop - containerHeight / 2 + elementHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [currentSearchIndex, searchMatches.length]);

  // Navigate search results
  const goToNextMatch = () => {
    if (searchMatches.length > 0) {
      setCurrentSearchIndex((prev) => (prev + 1) % searchMatches.length);
    }
  };

  const goToPrevMatch = () => {
    if (searchMatches.length > 0) {
      setCurrentSearchIndex((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
    }
  };

  // Keyboard shortcuts for search navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (searchQuery && (e.metaKey || e.ctrlKey)) {
        if (e.key === 'g' && !e.shiftKey) {
          e.preventDefault();
          goToNextMatch();
        } else if (e.key === 'g' && e.shiftKey) {
          e.preventDefault();
          goToPrevMatch();
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchQuery, searchMatches.length, currentSearchIndex]);

  // Helper to highlight search matches in text
  const highlightText = (text: string) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, _i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? `<mark>${part}</mark>`
        : part
    ).join('');
  };

  // Play clip
  const handlePlayClip = (clip: Clip) => {
    if (videoRef.current) {
      setSelectedClip(clip);
      setPlayingClip(clip);
      videoRef.current.currentTime = clip.start_time;
      videoRef.current.play();
      videoRef.current.muted = false;
    }
  };

  // AI Search
  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;

    setAIMode('search');
    setShowAIPanel(true);
    setAIResults([]); // Clear previous results
    setAILoading(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: aiQuery }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setAIResults(data.results || []);
    } catch (error) {
      console.error('AI search error:', error);
      alert('Failed to perform AI search. Please try again.');
    } finally {
      setAILoading(false);
    }
  };

  // AI Key Facts
  const handleGenerateSummary = async () => {
    setAIMode('summary');
    setShowAIPanel(true);
    setAIKeyFacts([]); // Clear previous key facts
    setAILoading(true);

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Key facts generation failed');
      }

      const data = await response.json();
      setAIKeyFacts(data.keyFacts || []);
    } catch (error) {
      console.error('AI key facts error:', error);
      alert('Failed to generate key facts. Please try again.');
    } finally {
      setAILoading(false);
    }
  };

  // Create clip from AI result
  const handleCreateClipFromAI = (result: any) => {
    if (!project) return;

    const lines = project.transcriptLines.filter(
      l => l.start_time && l.start_time >= result.startTime && l.end_time && l.end_time <= result.endTime
    );

    if (lines.length === 0) return;

    const firstLine = lines[0];
    const lastLine = lines[lines.length - 1];

    const newClip: Clip = {
      clip_id: `clip_${Date.now()}`,
      name: `AI Result - ${result.match}% match`,
      start_page: firstLine.page,
      end_page: lastLine.page,
      start_line: firstLine.line_number,
      end_line: lastLine.line_number,
      start_time: result.startTime,
      end_time: result.endTime,
      text: result.text,
      created_at: new Date().toISOString(),
    };

    setProject({
      ...project,
      clips: [...project.clips, newClip],
      stats: {
        ...project.stats,
        totalClips: project.stats.totalClips + 1,
      },
    });
  };

  // Stop clip playback
  const handleStopClip = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setPlayingClip(null);
    }
  };

  // Delete clip
  const handleDeleteClip = (clipId: string) => {
    if (!project) return;

    setProject({
      ...project,
      clips: project.clips.filter(c => c.clip_id !== clipId),
      stats: {
        ...project.stats,
        totalClips: project.stats.totalClips - 1,
      },
    });

    if (selectedClip?.clip_id === clipId) setSelectedClip(null);
    if (playingClip?.clip_id === clipId) setPlayingClip(null);
    setShowDeleteConfirm(null);
  };

  // Rename clip
  const handleStartRename = (clip: Clip, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClip(clip);
    setClipName(clip.name);
    setShowClipDialog(true);
  };

  const handleRenameClip = () => {
    if (!clipName.trim() || !project || !editingClip) return;

    setProject({
      ...project,
      clips: project.clips.map(c =>
        c.clip_id === editingClip.clip_id
          ? { ...c, name: clipName.trim() }
          : c
      ),
    });

    setShowClipDialog(false);
    setClipName('');
    setEditingClip(null);
  };

  // Export clip as video file
  const handleExportClip = async (clip: Clip, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch('/api/export-clip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: clip.start_time,
          endTime: clip.end_time,
          clipName: clip.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the video file as a blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${clip.name.replace(/[^a-z0-9]/gi, '_')}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export clip. Please try again.');
    }
  };

  // Handle panel resizing
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const container = document.querySelector('.main-content') as HTMLElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const position = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 20% and 80%
      setSplitPosition(Math.min(Math.max(position, 20), 80));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading transcript...</h2>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="error">
        <h2>Failed to load project</h2>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left-section">
          <img src="/veritext-logo.png" alt="Veritext" className="veritext-logo" />
          <div>
            <h1>Transcript Video Viewer</h1>
            <p className="case-info">
              {project.metadata.deponentName} - Case {project.metadata.caseNumber}
            </p>
          </div>
        </div>
        <div className="stats">
          <span>{project.stats.alignedLines}/{project.stats.totalLines} lines synced</span>
          <span>{project.stats.totalClips} clips</span>
        </div>
      </header>

      <div className={`main-content ${showAIPanel ? 'with-tess' : ''}`} style={{
        gridTemplateColumns: showAIPanel
          ? `${splitPosition * 0.7}% ${(100 - splitPosition) * 0.7}% 30%`
          : `${splitPosition}% ${100 - splitPosition}%`
      }}>
        {/* Video Panel */}
        <div className="video-panel">
          <video
            ref={videoRef}
            controls
            onTimeUpdate={handleTimeUpdate}
            src="https://res.cloudinary.com/dpunimzip/video/upload/v1771306141/sample-video-compressed_gkmwk9.mp4"
          >
            Your browser does not support video playback.
          </video>

          {/* Clips Section */}
          {project.clips.length > 0 && (
            <div className="clips-section">
              <div className="clips-header">
                <h3>Clips ({project.clips.length})</h3>
                {playingClip && (
                  <button onClick={handleStopClip} className="btn-stop-clip">
                    Stop Clip
                  </button>
                )}
              </div>
              <div className="clips-list">
                {project.clips.map(clip => (
                  <div
                    key={clip.clip_id}
                    className={`clip-card ${selectedClip?.clip_id === clip.clip_id ? 'active' : ''} ${
                      playingClip?.clip_id === clip.clip_id ? 'playing' : ''
                    }`}
                  >
                    <div className="clip-main">
                      {clipThumbnails[clip.clip_id] && (
                        <div
                          className="clip-thumbnail"
                          onClick={() => handlePlayClip(clip)}
                        >
                          <img src={clipThumbnails[clip.clip_id]} alt={clip.name} />
                          {playingClip?.clip_id === clip.clip_id && (
                            <div className="thumbnail-playing-indicator">▶</div>
                          )}
                        </div>
                      )}
                      <div className="clip-info" onClick={() => handlePlayClip(clip)}>
                        <div className="clip-name">
                          {clip.name}
                        </div>
                        <div className="clip-pages">
                          Pages {clip.start_page}:{clip.start_line} - {clip.end_page}:{clip.end_line}
                          <span className="clip-duration"> ({Math.round(clip.end_time - clip.start_time)}s)</span>
                        </div>
                      </div>
                    </div>
                    <div className="clip-actions">
                      <button
                        onClick={(e) => handleStartRename(clip, e)}
                        className="clip-action-btn"
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => handleExportClip(clip, e)}
                        className="clip-action-btn"
                        title="Export"
                      >
                        ↓
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(clip.clip_id);
                        }}
                        className="clip-action-btn clip-delete-btn"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                    {showDeleteConfirm === clip.clip_id && (
                      <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
                        <span>Delete?</span>
                        <div className="delete-confirm-buttons">
                          <button onClick={() => handleDeleteClip(clip.clip_id)} className="btn-confirm-delete">
                            Delete
                          </button>
                          <button onClick={() => setShowDeleteConfirm(null)} className="btn-cancel-delete">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transcript Panel */}
        <div className="transcript-panel">
          <div className="transcript-header">
            <h3>Transcript</h3>
            <button
              onClick={() => {
                setShowAIPanel(!showAIPanel);
                setAIMode(null);
              }}
              className={`ai-toggle-btn ${showAIPanel ? 'active' : ''}`}
            >
              <img src="/tess-logo.png" alt="Tess" className="tess-logo-icon" />
              <span>Ask Tess</span>
            </button>
            <div className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchMatches.length > 0 && (
                <div className="search-nav">
                  <span className="search-count">
                    {currentSearchIndex + 1} of {searchMatches.length}
                  </span>
                  <button onClick={goToPrevMatch} className="search-btn">↑</button>
                  <button onClick={goToNextMatch} className="search-btn">↓</button>
                </div>
              )}
            </div>
          </div>

          <div className="transcript-lines" ref={transcriptRef}>
            {filteredLines.map((line, index) => {
              const matchIndex = searchMatches.findIndex(m => m.index === index);
              const isSearchMatch = matchIndex !== -1;
              const isCurrentMatch = isSearchMatch && matchIndex === currentSearchIndex;

              return (
                <div
                  key={line.line_id}
                  ref={(el) => {
                    if (line.line_id === activeLine) activeLineRef.current = el;
                    if (isSearchMatch) searchMatchRefs.current[matchIndex] = el;
                  }}
                  data-line-id={line.line_id}
                  className={`transcript-line ${line.start_time !== null ? 'aligned' : 'unaligned'} ${
                    line.line_id === activeLine ? 'active' : ''
                  } ${isSearchMatch ? 'highlighted' : ''} ${isCurrentMatch ? 'current-match' : ''}`}
                  onClick={() => handleLineClick(line)}
                >
                  <span className="page-line">{line.page}:{line.line_number}</span>
                  {line.speaker && (
                    <span className="speaker">{line.speaker}.</span>
                  )}
                  <span
                    className="line-text"
                    dangerouslySetInnerHTML={{ __html: highlightText(line.text) }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tess Panel */}
        {showAIPanel && (
          <div className="tess-panel">
              <div className="ai-panel-header">
                <div className="tess-header">
                  <img src="/tess-logo.png" alt="Tess" className="tess-logo-header" />
                  <h3>Tess</h3>
                </div>
                <button onClick={() => setShowAIPanel(false)} className="ai-close-btn">×</button>
              </div>

              <div className="ai-controls">
                <div className="ai-search-box">
                  <input
                    type="text"
                    placeholder="Ask a question..."
                    value={aiQuery}
                    onChange={(e) => setAIQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !aiLoading && handleAISearch()}
                    className="ai-search-input"
                    disabled={aiLoading}
                  />
                  <button onClick={handleAISearch} className="ai-search-btn" disabled={aiLoading}>
                    {aiLoading && aiMode === 'search' ? 'Searching...' : 'Search'}
                  </button>
                </div>
                <button onClick={handleGenerateSummary} className="ai-summary-btn" disabled={aiLoading}>
                  {aiLoading && aiMode === 'summary' ? 'Analyzing...' : 'Generate Key Facts'}
                </button>
              </div>

              {aiLoading && (
                <div className="ai-loading">
                  <div className="loading-spinner"></div>
                  <p>{aiMode === 'search' ? 'Searching with AI...' : 'Generating summary...'}</p>
                </div>
              )}

              {!aiLoading && aiMode === 'search' && aiResults.length > 0 && (
                <div className="ai-results">
                  <h4>Search Results</h4>
                  {aiResults.map((result, i) => (
                    <div key={i} className="ai-result-card">
                      <div className="ai-result-header">
                        <span className="ai-match">{result.match}% match</span>
                        <button
                          className="ai-location-link"
                          onClick={() => {
                            // Find the line and scroll to it
                            const targetLine = project?.transcriptLines.find(
                              line => line.page === result.page && Math.abs(line.line_number - result.line) <= 2
                            );
                            if (targetLine && transcriptRef.current) {
                              const lineElement = transcriptRef.current.querySelector(`[data-line-id="${targetLine.line_id}"]`);
                              if (lineElement) {
                                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                // Highlight briefly
                                lineElement.classList.add('ai-highlight');
                                setTimeout(() => lineElement.classList.remove('ai-highlight'), 2000);
                              }
                            }
                          }}
                          title="Jump to transcript location"
                        >
                          Page {result.page}:{result.line}
                        </button>
                      </div>
                      <p className="ai-result-text">{result.text}</p>
                      {result.explanation && (
                        <p className="ai-result-explanation">{result.explanation}</p>
                      )}
                      <div className="ai-result-actions">
                        <button
                          onClick={() => {
                            if (videoRef.current && result.startTime) {
                              videoRef.current.currentTime = result.startTime;
                              videoRef.current.play();
                            }
                          }}
                          className="ai-action-btn"
                          disabled={!result.startTime}
                        >
                          Play Clip
                        </button>
                        <button
                          onClick={() => handleCreateClipFromAI(result)}
                          className="ai-action-btn"
                          disabled={!result.startTime}
                        >
                          Save as Clip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!aiLoading && aiMode === 'summary' && aiKeyFacts.length > 0 && (
                <div className="ai-results">
                  <h4>Key Facts ({aiKeyFacts.length})</h4>
                  <p className="ai-disclaimer">
                    ⚠️ AI-generated analysis. Please verify with transcript references.
                  </p>
                  {aiKeyFacts.map((fact, i) => (
                    <div key={i} className="ai-key-fact-card">
                      <div className="key-fact-header">
                        <span className="key-fact-badge">KEY FACT</span>
                        <button
                          className="ai-location-link"
                          onClick={() => {
                            // Find the line and scroll to it
                            const targetLine = project?.transcriptLines.find(
                              line => line.page === fact.page && Math.abs(line.line_number - fact.line) <= 2
                            );
                            if (targetLine && transcriptRef.current) {
                              const lineElement = transcriptRef.current.querySelector(`[data-line-id="${targetLine.line_id}"]`);
                              if (lineElement) {
                                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                lineElement.classList.add('ai-highlight');
                                setTimeout(() => lineElement.classList.remove('ai-highlight'), 2000);
                              }
                            }
                          }}
                          title="Jump to transcript location"
                        >
                          Page {fact.page}:{fact.line}
                        </button>
                      </div>
                      <h5 className="key-fact-title">{fact.title}</h5>
                      <p className="key-fact-quote">"{fact.quote}"</p>
                      <p className="key-fact-significance">{fact.significance}</p>
                      <div className="ai-result-actions">
                        <button
                          onClick={() => {
                            if (videoRef.current && fact.startTime) {
                              videoRef.current.currentTime = fact.startTime;
                              videoRef.current.play();
                            }
                          }}
                          className="ai-action-btn"
                          disabled={!fact.startTime}
                        >
                          Play Clip
                        </button>
                        <button
                          onClick={() => handleCreateClipFromAI(fact)}
                          className="ai-action-btn"
                          disabled={!fact.startTime}
                        >
                          Save as Clip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Resize Handle - Video/Transcript */}
        <div
          className="resize-handle"
          style={{ left: `${splitPosition}%` }}
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Selection Toolbar */}
      {selectionInfo && (
        <div className="selection-toolbar">
          <span className="selection-info">
            {selectionInfo.lineIds.length} lines selected — {formatTime(selectionInfo.startTime)} to {formatTime(selectionInfo.endTime)}
          </span>
          <div className="toolbar-actions">
            <button onClick={clearSelection} className="btn-clear">
              Clear
            </button>
            <button onClick={handleCreateClip} className="btn-create-clip">
              Create Clip
            </button>
          </div>
        </div>
      )}

      {/* Clip Creation/Rename Dialog */}
      {showClipDialog && (
        <div className="modal-overlay" onClick={() => {
          setShowClipDialog(false);
          setEditingClip(null);
          setClipName('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingClip ? 'Rename Clip' : 'Create Clip'}</h2>
            {!editingClip && (
              <p className="modal-subtitle">
                {savedSelectionInfo?.lineIds.length || 0} lines selected
              </p>
            )}
            <input
              type="text"
              className="clip-name-input"
              placeholder="Enter clip name..."
              value={clipName}
              onChange={(e) => setClipName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (editingClip ? handleRenameClip() : handleSaveClip())}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => {
                setShowClipDialog(false);
                setEditingClip(null);
                setClipName('');
              }} className="btn-cancel">
                Cancel
              </button>
              <button
                onClick={editingClip ? handleRenameClip : handleSaveClip}
                className="btn-primary"
                disabled={!clipName.trim()}
              >
                {editingClip ? 'Rename' : 'Create Clip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default App;


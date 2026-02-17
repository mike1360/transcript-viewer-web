export interface TranscriptLine {
  line_id: number;
  page: number;
  line_number: number;
  speaker: string | null;
  text: string;
  start_time: number | null;
  end_time: number | null;
}

export interface Clip {
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

export interface ProjectData {
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

const fs = require('fs');

const metadata = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));
const lines = JSON.parse(fs.readFileSync('transcript-lines.json', 'utf8'));
const clips = JSON.parse(fs.readFileSync('clips.json', 'utf8'));

// Convert metadata array to object
const metaObj = {};
metadata.forEach(item => {
  metaObj[item.key] = item.value;
});

const project = {
  metadata: {
    name: metaObj.name,
    caseNumber: metaObj.caseNumber,
    deponentName: metaObj.deponentName,
    isAligned: metaObj.isAligned === 'true',
    createdAt: metaObj.createdAt,
    alignmentDate: metaObj.alignmentDate
  },
  stats: {
    totalLines: lines.length,
    alignedLines: lines.filter(l => l.start_time !== null).length,
    totalClips: clips.length
  },
  transcriptLines: lines,
  clips: clips
};

fs.writeFileSync('project.json', JSON.stringify(project, null, 2));
console.log('✓ Created project.json');

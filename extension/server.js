#!/usr/bin/env node

/**
 * UI/UX Design Collector - Local Host Server
 * Receives design data from Chrome extension, analyzes with Claude, saves to skill CSVs
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3847;
const SKILL_PATH = path.join(process.env.HOME, '.claude/skills/ui-ux-pro-max');
const DATA_PATH = path.join(SKILL_PATH, 'data');

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
      return;
    }

    if (url.pathname === '/analyze' && req.method === 'POST') {
      const body = await readBody(req);
      const designData = JSON.parse(body);

      console.log(`[${new Date().toISOString()}] Analyzing: ${designData.url}`);

      const result = await analyzeWithClaude(designData);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result));
      return;
    }

    if (url.pathname === '/data' && req.method === 'GET') {
      const stats = getDataStats();
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(stats));
      return;
    }

    if (url.pathname === '/list' && req.method === 'GET') {
      const designs = listCollectedDesigns();
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, designs }));
      return;
    }

    if (url.pathname === '/delete' && req.method === 'POST') {
      const body = await readBody(req);
      const { id } = JSON.parse(body);
      const result = deleteDesign(id);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function analyzeWithClaude(designData) {
  const prompt = buildAnalysisPrompt(designData);

  try {
    // Call Claude CLI with the analysis prompt
    const claudeResult = await callClaudeCLI(prompt);

    // Parse Claude's response and save to CSVs
    const savedTo = await saveToCSVs(designData, claudeResult);

    return {
      success: true,
      analysis: claudeResult,
      savedTo
    };
  } catch (error) {
    console.error('Claude analysis error:', error);

    // Fallback: save raw data without Claude analysis
    const savedTo = await saveRawData(designData);

    return {
      success: true,
      analysis: null,
      savedTo,
      note: 'Saved raw data (Claude analysis skipped)'
    };
  }
}

function buildAnalysisPrompt(data) {
  const topColors = data.colors.slice(0, 8).map(c => c.hex).join(', ');
  const fonts = data.typography.fonts.map(f => f.font).join(', ');

  const visualEffects = [
    data.effects.blur ? 'backdrop-blur/glassmorphism' : '',
    data.effects.gradients.length > 0 ? `gradients(${data.effects.gradients.length})` : '',
    data.effects.shadows.length > 0 ? 'box-shadows' : '',
    data.effects.borderRadius.length > 0 ? `rounded(${data.effects.borderRadius[0]})` : ''
  ].filter(Boolean).join(', ');

  const motionEffects = [
    data.effects.animations?.length > 0 ? `animations: ${data.effects.animations.slice(0,3).join(', ')}` : '',
    data.effects.transitions?.length > 0 ? `transitions: ${data.effects.transitions.slice(0,3).join('; ')}` : '',
    data.effects.transforms?.length > 0 ? `transforms: ${Array.from(data.effects.transforms || []).join(', ')}` : ''
  ].filter(Boolean).join(' | ');

  const interactions = data.effects.interactions?.join(', ') || 'basic';

  return `Analyze this webpage design with focus on UX interactions and motion. Output EXACTLY in this format:

URL: ${data.url}
Title: ${data.title}
Colors: ${topColors}
Fonts: ${fonts}
Visual: ${visualEffects || 'minimal'}
Motion: ${motionEffects || 'minimal transitions'}
Interactions: ${interactions}
Layout: ${data.layout.usesGrid ? 'Grid' : ''} ${data.layout.usesFlexbox ? 'Flexbox' : ''}

---OUTPUT (one line each, no markdown):---
STYLE_CATEGORY: [e.g., "Dark Mode SaaS", "Glassmorphism Dashboard"]
TYPE: [General, Landing Page, Dashboard, E-commerce, Portfolio]
KEYWORDS: [8-12 keywords]
PRIMARY_COLORS: [2-3 main colors with hex]
SECONDARY_COLORS: [1-2 accent colors with hex]
EFFECTS_ANIMATION: [DETAILED UX: button hover (scale/shadow/color), card interactions, scroll-triggered animations, page transitions, loading states, micro-interactions. Be specific: "buttons: scale 1.05 + lift shadow", "cards: stagger fade-in on scroll", "nav: sticky blur header"]
BEST_FOR: [3-5 use cases]
DO_NOT_USE_FOR: [2-3 anti-cases]
LIGHT_MODE: [Full, Partial, No]
DARK_MODE: [Full, Partial, No]
PERFORMANCE: [Excellent, Good, Moderate, Poor]
ACCESSIBILITY: [WCAG AAA, WCAG AA, Low contrast, Needs review]
MOBILE_FRIENDLY: [High, Good, Medium, Low]
FRAMEWORK_COMPAT: [e.g., "Tailwind 10/10, React 9/10"]
COMPLEXITY: [Low, Medium, High]
NOTES: [1 sentence focusing on unique UX/interaction pattern]`;
}

async function callClaudeCLI(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p'], {
      timeout: 60000,
      shell: false,
      env: { ...process.env, NO_COLOR: '1' }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Claude CLI failed (code ${code}): ${stderr || 'No output'}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

async function saveToCSVs(designData, claudeResult) {
  const savedTo = [];
  const timestamp = new Date().toISOString().split('T')[0];

  const parse = (key) => {
    if (!claudeResult) return '';
    const match = claudeResult.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
    return match ? match[1].trim() : '';
  };

  // Enhanced keyword generation for better searchability
  function generateEnhancedKeywords(designData, claudeResult, parsedFields) {
    const keywords = new Set();

    // 1. Original AI keywords
    if (parsedFields.keywords) {
      parsedFields.keywords.split(',').forEach(k => keywords.add(k.trim()));
    }

    // 2. Style category as searchable keywords
    if (parsedFields.styleCategory) {
      keywords.add(parsedFields.styleCategory);
      // Add style variants
      const style = parsedFields.styleCategory.toLowerCase();
      if (style.includes('minimal')) keywords.add('minimalism');
      if (style.includes('clean')) keywords.add('clean');
      if (style.includes('modern')) keywords.add('modern');
      if (style.includes('professional')) keywords.add('professional');
    }

    // 3. Type as keyword
    if (parsedFields.type) {
      keywords.add(parsedFields.type);
      const type = parsedFields.type.toLowerCase();
      if (type.includes('landing')) keywords.add('landing page');
      if (type.includes('dashboard')) keywords.add('dashboard');
    }

    // 4. Color family keywords
    const primaryColors = parsedFields.primaryColors || '';
    if (primaryColors.toLowerCase().includes('white')) keywords.add('white background');
    if (primaryColors.toLowerCase().includes('#fff')) keywords.add('white');
    if (primaryColors.toLowerCase().includes('black')) keywords.add('black');
    if (primaryColors.toLowerCase().includes('#000')) keywords.add('black');
    if (primaryColors.toLowerCase().includes('gray') || primaryColors.toLowerCase().includes('grey')) {
      keywords.add('neutral');
      keywords.add('grayscale');
    }
    if (primaryColors.toLowerCase().includes('green')) keywords.add('green accent');
    if (primaryColors.toLowerCase().includes('blue')) keywords.add('blue accent');
    if (primaryColors.toLowerCase().includes('red')) keywords.add('red accent');
    if (primaryColors.toLowerCase().includes('orange')) keywords.add('orange accent');

    // 5. Effect/Technique keywords
    const effects = parsedFields.effectsAnimation || '';
    if (effects.toLowerCase().includes('blur')) {
      keywords.add('glassmorphism');
      keywords.add('frosted');
    }
    if (effects.toLowerCase().includes('gradient')) keywords.add('gradient');
    if (effects.toLowerCase().includes('animation')) keywords.add('animated');
    if (effects.toLowerCase().includes('hover')) keywords.add('hover effects');
    if (effects.toLowerCase().includes('sticky')) keywords.add('sticky header');
    if (effects.toLowerCase().includes('grid')) keywords.add('grid layout');
    if (effects.toLowerCase().includes('flex')) keywords.add('flexbox');

    // 6. Industry/Domain from URL or content
    try {
      const hostname = new URL(designData.url).hostname.replace('www.', '');
      if (hostname.includes('bio') || hostname.includes('tech') || hostname.includes('science')) {
        keywords.add('biotech');
        keywords.add('science');
        keywords.add('healthcare');
        keywords.add('pharmaceutical');
      }
      if (hostname.includes('saas') || hostname.includes('app')) keywords.add('saas');
      if (hostname.includes('shop') || hostname.includes('store')) keywords.add('ecommerce');
      if (hostname.includes('portfolio') || hostname.includes('design')) keywords.add('portfolio');
    } catch (e) {}

    // 7. Common synonyms for better discoverability
    keywords.add('design');
    keywords.add('ui');
    keywords.add('ux');
    keywords.add('inspiration');
    keywords.add('reference');

    return Array.from(keywords).join(', ');
  }

  const parsedFields = {
    styleCategory: parse('STYLE_CATEGORY') || 'Custom',
    type: parse('TYPE') || 'General',
    keywords: parse('KEYWORDS') || designData.styleCategories.join(', '),
    primaryColors: parse('PRIMARY_COLORS') || designData.colors.slice(0, 3).map(c => c.hex).join(', '),
    secondaryColors: parse('SECONDARY_COLORS') || '',
    effectsAnimation: parse('EFFECTS_ANIMATION') || [
      designData.effects.blur ? 'backdrop-blur' : '',
      designData.effects.gradients.length > 0 ? 'gradients' : '',
      designData.effects.animations.length > 0 ? 'animations' : ''
    ].filter(Boolean).join(', ') || 'minimal',
    bestFor: parse('BEST_FOR') || '',
    doNotUseFor: parse('DO_NOT_USE_FOR') || '',
    lightMode: parse('LIGHT_MODE') || '?',
    darkMode: parse('DARK_MODE') || '?',
    performance: parse('PERFORMANCE') || 'Good',
    accessibility: parse('ACCESSIBILITY') || 'Needs review',
    mobileFriendly: parse('MOBILE_FRIENDLY') || 'Good',
    frameworkCompat: parse('FRAMEWORK_COMPAT') || 'Tailwind 9/10',
    complexity: parse('COMPLEXITY') || 'Medium',
    notes: parse('NOTES') || ''
  };

  // Generate enhanced keywords
  const enhancedKeywords = generateEnhancedKeywords(designData, claudeResult, parsedFields);

  const fields = {
    ...parsedFields,
    keywords: enhancedKeywords // Replace with enhanced version
  };

  const collectedPath = path.join(DATA_PATH, 'collected-designs.csv');
  if (!fs.existsSync(collectedPath)) {
    const header = 'ID,Date,Style Category,Type,Source,Keywords,Primary Colors,Secondary Colors,Effects & Animation,Best For,Do Not Use For,Light Mode,Dark Mode,Performance,Accessibility,Mobile-Friendly,Framework Compatibility,Complexity,Notes\n';
    fs.writeFileSync(collectedPath, header);
  }

  const existingLines = fs.readFileSync(collectedPath, 'utf8').split('\n').filter(l => l.trim());

  // Check if URL already exists (skip duplicates)
  const urlExists = existingLines.some(line => {
    const fields = line.split(',').map(f => f.replace(/^"|"$/g, '').replace(/""/g, '"'));
    return fields[4] === designData.url; // Source is at index 4
  });

  if (urlExists) {
    console.log(`[${timestamp}] Skipped duplicate URL: ${designData.url}`);
    return savedTo; // Skip saving, return empty array
  }

  const nextId = existingLines.length;
  const esc = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

  const newRow = [
    nextId, timestamp, esc(fields.styleCategory), esc(fields.type), esc(designData.url),
    esc(fields.keywords), esc(fields.primaryColors), esc(fields.secondaryColors),
    esc(fields.effectsAnimation), esc(fields.bestFor), esc(fields.doNotUseFor),
    esc(fields.lightMode), esc(fields.darkMode), esc(fields.performance),
    esc(fields.accessibility), esc(fields.mobileFriendly), esc(fields.frameworkCompat),
    esc(fields.complexity), esc(fields.notes)
  ].join(',');

  fs.appendFileSync(collectedPath, newRow + '\n');
  savedTo.push('collected-designs.csv');

  console.log(`[${timestamp}] Saved: ${fields.styleCategory} from ${designData.url}`);
  return savedTo;
}

async function saveRawData(designData) {
  return saveToCSVs(designData, null);
}

function getDataStats() {
  const stats = {};
  const files = ['styles.csv', 'colors.csv', 'typography.csv', 'collected-designs.csv'];
  files.forEach(file => {
    const filePath = path.join(DATA_PATH, file);
    if (fs.existsSync(filePath)) {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
      stats[file.replace('.csv', '')] = lines.length - 1;
    } else {
      stats[file.replace('.csv', '')] = 0;
    }
  });
  return stats;
}

function listCollectedDesigns() {
  const filePath = path.join(DATA_PATH, 'collected-designs.csv');
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  if (lines.length <= 1) return [];

  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  }).reverse();
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function deleteDesign(id) {
  const filePath = path.join(DATA_PATH, 'collected-designs.csv');
  if (!fs.existsSync(filePath)) return { success: false, error: 'No data file' };

  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  const header = lines[0];
  const dataLines = lines.slice(1).filter(line => {
    const firstComma = line.indexOf(',');
    const lineId = line.substring(0, firstComma);
    return lineId !== String(id);
  });

  fs.writeFileSync(filePath, header + '\n' + dataLines.join('\n') + '\n');
  console.log(`[DELETE] Removed design ID: ${id}`);
  return { success: true };
}

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  UI/UX Design Collector - Host Server                     ║
║  Running on http://localhost:${PORT}                        ║
║                                                           ║
║  Endpoints:                                               ║
║    GET  /health  - Check server status                    ║
║    POST /analyze - Analyze design data                    ║
║    GET  /data    - Get collection stats                   ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close();
  process.exit(0);
});

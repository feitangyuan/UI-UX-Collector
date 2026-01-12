// UI/UX Design Collector - Popup Script

const HOST_URL = 'http://localhost:3847';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await checkConnection();
  setupEventListeners();
}

async function checkConnection() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const analyzeBtn = document.getElementById('analyzeBtn');

  try {
    const response = await fetch(`${HOST_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });

    if (response.ok) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected to Claude Code';
      analyzeBtn.disabled = false;
    } else {
      throw new Error('Server not ready');
    }
  } catch (error) {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Host not running. Run: node ~/.claude/skills/ui-ux-pro-max/host/server.js';
    analyzeBtn.disabled = true;
  }
}

function setupEventListeners() {
  document.getElementById('analyzeBtn').addEventListener('click', analyzeCurrentPage);
  document.getElementById('viewDataBtn').addEventListener('click', viewCollectedData);
}

async function analyzeCurrentPage() {
  const btn = document.getElementById('analyzeBtn');
  const btnText = document.getElementById('btnText');
  const result = document.getElementById('result');

  // Disable button and show loading
  btn.disabled = true;
  btnText.innerHTML = '<span class="spinner"></span> Analyzing...';
  result.classList.remove('show');

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script if needed and extract design
    let extractedData;
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractDesign' });
      if (response.success) {
        extractedData = response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (e) {
      // Content script might not be injected, try injecting it
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 100));
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractDesign' });
      if (response.success) {
        extractedData = response.data;
      } else {
        throw new Error(response.error);
      }
    }

    // Send to local host for Claude analysis
    btnText.innerHTML = '<span class="spinner"></span> Claude analyzing...';

    const analysisResponse = await fetch(`${HOST_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extractedData)
    });

    const analysisResult = await analysisResponse.json();

    if (analysisResult.success) {
      displayResult(extractedData, analysisResult);
      btnText.textContent = '✓ Saved to Skill';
      setTimeout(() => {
        btnText.textContent = 'Analyze This Page';
        btn.disabled = false;
      }, 2000);
    } else {
      throw new Error(analysisResult.error);
    }

  } catch (error) {
    console.error('Analysis error:', error);
    result.innerHTML = `<div class="error-msg">Error: ${error.message}</div>`;
    result.classList.add('show');
    btnText.textContent = 'Analyze This Page';
    btn.disabled = false;
  }
}

function displayResult(extractedData, analysisResult) {
  const result = document.getElementById('result');

  // Extract search trigger keyword
  const styleMatch = analysisResult?.match(/STYLE_CATEGORY:\s*(.+?)(?=\n|TYPE:|$)/i);
  const searchKeyword = styleMatch ? styleMatch[1].trim() : extractedData.styleCategories[0] || 'Design';

  const colorsHtml = extractedData.colors.slice(0, 10).map(c =>
    `<div class="color-swatch" style="background:${c.hex}" data-color="${c.hex}"></div>`
  ).join('');

  const fontsHtml = extractedData.typography.fonts.slice(0, 3).map(f =>
    `<div class="font-item"><span class="font-name">${f.font}</span><span class="font-count">${f.count}×</span></div>`
  ).join('');

  const stylesHtml = extractedData.styleCategories.map(s =>
    `<span class="tag">${s}</span>`
  ).join('');

  const layoutItems = [
    extractedData.layout.usesGrid ? 'CSS Grid' : '',
    extractedData.layout.usesFlexbox ? 'Flexbox' : '',
    extractedData.effects.blur ? 'Blur Effects' : '',
    extractedData.effects.gradients.length > 0 ? 'Gradients' : ''
  ].filter(Boolean);

  const layoutHtml = layoutItems.map(item =>
    `<div class="layout-item"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>${item}</div>`
  ).join('');

  result.innerHTML = `
    <div class="result-card">
      <div class="message success">Design captured and saved</div>

      <div class="result-section" style="margin-top:14px">
        <div class="result-title">Search Trigger</div>
        <div class="search-trigger" id="searchTrigger" title="Click to copy">
          <code id="triggerKeyword">${searchKeyword}</code>
          <span class="copy-hint">📋 Click to copy</span>
        </div>
      </div>

      <div class="result-section">
        <div class="result-title">Detected Style</div>
        <div>${stylesHtml}</div>
      </div>

      <div class="result-section">
        <div class="result-title">Color Palette</div>
        <div class="color-palette">${colorsHtml}</div>
      </div>

      <div class="result-section">
        <div class="result-title">Typography</div>
        ${fontsHtml}
      </div>

      <div class="result-section">
        <div class="result-title">Layout & Effects</div>
        <div class="layout-grid">${layoutHtml}</div>
      </div>
    </div>
  `;

  // Add click-to-copy for search trigger
  const triggerEl = document.getElementById('searchTrigger');
  const keywordEl = document.getElementById('triggerKeyword');
  const hintEl = triggerEl.querySelector('.copy-hint');

  triggerEl.addEventListener('click', () => {
    navigator.clipboard.writeText(searchKeyword);
    hintEl.textContent = '✓ Copied!';
    setTimeout(() => {
      hintEl.textContent = '📋 Click to copy';
    }, 2000);
  });

  result.classList.add('show');

  result.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      navigator.clipboard.writeText(swatch.dataset.color);
      swatch.style.transform = 'scale(1.15)';
      setTimeout(() => { swatch.style.transform = ''; }, 150);
    });
  });
}

async function viewCollectedData() {
  const result = document.getElementById('result');
  result.innerHTML = '<div class="result-card" style="text-align:center;padding:24px;"><span class="spinner"></span></div>';
  result.classList.add('show');

  try {
    const response = await fetch(`${HOST_URL}/list`);
    const data = await response.json();

    if (!data.success || !data.designs.length) {
      result.innerHTML = `
        <div class="result-card empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <p>No designs collected yet</p>
        </div>
      `;
      return;
    }

    result.innerHTML = `
      <div class="result-section">
        <div class="result-title">Collected Designs (${data.designs.length})</div>
      </div>
      <div class="design-list">
        ${data.designs.map(d => `
          <div class="design-item" data-id="${d.ID}">
            <div class="design-header">
              <span class="design-style">${d['Style Category'] || 'Custom'}</span>
              <button class="delete-btn" data-id="${d.ID}" title="Delete">×</button>
            </div>
            <div class="design-type">${d.Type || 'General'}</div>
            <div class="design-url">${truncateUrl(d.Source)}</div>
            <div class="design-keywords">${d.Keywords || ''}</div>
            ${d['Primary Colors'] ? `<div class="design-colors">${renderColorDots(d['Primary Colors'])}${renderColorDots(d['Secondary Colors'])}</div>` : ''}
            <div class="design-meta">
              <span>${d.Date}</span>
              ${d['Best For'] ? `<span class="design-bestfor">→ ${d['Best For'].split(',')[0]}</span>` : ''}
            </div>
            <div class="design-details">
              ${d['Effects & Animation'] ? `<div><b>Effects:</b> ${d['Effects & Animation']}</div>` : ''}
              <div class="design-badges">
                ${d['Light Mode'] ? `<span class="badge">☀️${d['Light Mode']}</span>` : ''}
                ${d['Dark Mode'] ? `<span class="badge">🌙${d['Dark Mode']}</span>` : ''}
                ${d.Performance ? `<span class="badge">⚡${d.Performance}</span>` : ''}
                ${d.Accessibility ? `<span class="badge">♿${d.Accessibility}</span>` : ''}
                ${d['Mobile-Friendly'] ? `<span class="badge">📱${d['Mobile-Friendly']}</span>` : ''}
              </div>
              ${d['Do Not Use For'] ? `<div><b>Avoid:</b> ${d['Do Not Use For']}</div>` : ''}
            </div>
            ${d.Notes ? `<div class="design-notes">${d.Notes}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    result.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Delete this design?')) {
          await deleteDesign(id);
          viewCollectedData();
        }
      });
    });

    result.querySelectorAll('.design-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't toggle if clicking delete button
        if (e.target.closest('.delete-btn')) return;

        // Don't toggle if text is selected
        const selection = window.getSelection();
        if (selection.toString().trim().length > 0) return;

        item.classList.toggle('expanded');
      });
    });

  } catch (error) {
    result.innerHTML = `<div class="error-msg">Cannot connect to host</div>`;
  }
}

function truncateUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname.length > 20 ? u.pathname.slice(0, 20) + '...' : u.pathname);
  } catch { return url.slice(0, 40); }
}

function renderColorDots(colors) {
  const hexes = colors.match(/#[0-9A-Fa-f]{6}/g) || [];
  return hexes.slice(0, 5).map(h => `<span class="color-dot" style="background:${h}" title="${h}"></span>`).join('');
}

async function deleteDesign(id) {
  try {
    await fetch(`${HOST_URL}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  } catch (e) { console.error(e); }
}

'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const INPUT_EXT = ['.jpg', '.jpeg', '.jfif', '.png', '.bmp', '.gif', '.tif', '.tiff', '.avif', '.heic', '.heif', '.webp'];
  const MODE_INPUTS = { 'webp-jpg': ['.webp'], 'webp-png': ['.webp'] };

  let settings = {};
  let modes = {};
  let items = [];
  let nextId = 1;
  let running = false;
  let lastOutDir = '';
  let saveTimer = null;

  // ---------- helpers ----------
  function fmt(bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(bytes < 10240 ? 1 : 0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }
  function extOf(p) { const i = p.lastIndexOf('.'); return i < 0 ? '' : p.slice(i).toLowerCase(); }
  function baseName(p) { return p.split(/[\\/]/).pop(); }
  function dirName(p) { const i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/')); return i < 0 ? '' : p.slice(0, i); }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function supported(file) {
    const e = extOf(file);
    if (!INPUT_EXT.includes(e)) return false;
    const only = MODE_INPUTS[settings.mode];
    return !only || only.includes(e);
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => window.vra.saveSettings(settings), 200);
  }

  // ---------- message dialog ----------
  function showMessage(title, text, okLabel, withCancel) {
    return new Promise((resolve) => {
      $('msgTitle').textContent = title;
      $('msgText').textContent = text;
      $('msgOk').textContent = okLabel || 'OK';
      $('msgCancel').hidden = !withCancel;
      $('modalMsg').hidden = false;
      $('msgOk').focus();
      const done = (v) => {
        $('modalMsg').hidden = true;
        $('msgOk').onclick = null; $('msgCancel').onclick = null;
        resolve(v);
      };
      $('msgOk').onclick = () => done(true);
      $('msgCancel').onclick = () => done(false);
      $('modalMsg')._dismiss = () => done(false);
    });
  }

  // ---------- controls ----------
  function updateHint() {
    const q = settings.quality;
    $('qOut').textContent = q + '%';
    $('qSlider').value = q;
    $('segAuto').classList.toggle('on', settings.smart);
    $('segManual').classList.toggle('on', !settings.smart);
    $('qLabel').textContent = settings.smart ? 'Starting quality' : 'Quality';
    const png = settings.mode.endsWith('png');
    $('qSlider').disabled = png;
    $('segAuto').disabled = png; $('segManual').disabled = png;
    if (png) {
      $('qHint').textContent = 'PNG is lossless, so there is no quality setting.';
    } else if (settings.smart) {
      $('qHint').textContent = settings.targetOn
        ? `Starts at ${q}% and lowers the quality only if needed to fit under ${settings.targetKB} KB, never below ${settings.minQuality}%.`
        : `Target size is off, so images are saved at ${q}%. Sharp graphics keep higher quality.`;
    } else {
      $('qHint').textContent = `Every image is saved at exactly ${q}%. A lower number gives a smaller file.`;
    }
  }

  function fillModes() {
    const sel = $('modeSel');
    sel.innerHTML = '';
    for (const [k, label] of Object.entries(modes)) {
      const o = document.createElement('option');
      o.value = k; o.textContent = label; sel.appendChild(o);
    }
    sel.value = settings.mode;
  }

  // ---------- list ----------
  function showList() {
    const has = items.length > 0;
    $('dropZone').hidden = has;
    $('listWrap').hidden = !has;
    $('btnClear').disabled = !has || running;
  }

  function rowHtml(it) {
    const thumb = it.thumb
      ? `<div class="thumb" style="background-image:url('${it.thumb}')"></div>`
      : `<div class="thumb">${esc(extOf(it.file).replace('.', '').toUpperCase())}</div>`;
    return `${thumb}
      <div class="c-name"><div class="nm" title="${esc(it.file)}">${esc(baseName(it.file))}</div><div class="sub">${esc(it.rel || dirName(it.file))}</div></div>
      <div class="c-size">${fmt(it.size)}</div>
      <div class="c-size" data-f="new"></div>
      <div class="c-saved" data-f="saved"></div>
      <div class="c-status status" data-f="status"></div>
      <div class="c-x"><button class="rm" title="Remove from list" aria-label="Remove">&times;</button></div>`;
  }

  function paintRow(it) {
    const el = document.querySelector(`[data-id="${it.id}"]`);
    if (!el) return;
    const q = (f) => el.querySelector(`[data-f="${f}"]`);
    const r = it.result;
    let cls = 'st-wait', head = 'Waiting', msg = '';
    if (it.state === 'work') { cls = 'st-work'; head = 'Working...'; }
    else if (it.state === 'unsupported') { cls = 'st-skip'; head = 'Not supported in this mode'; }
    else if (r) {
      if (r.status === 'done') { cls = 'st-done'; head = 'Done'; msg = r.message || ''; }
      else if (r.status === 'above') { cls = 'st-above'; head = 'Larger than target'; msg = r.message || ''; }
      else if (r.status === 'skipped') { cls = 'st-skip'; head = r.message || 'Skipped'; }
      else { cls = 'st-error'; head = 'Failed'; msg = r.message || ''; }
    }
    q('status').className = 'c-status status ' + cls;
    q('status').innerHTML = `<b>${esc(head)}</b>${msg ? esc(msg) : ''}`;
    if (r && (r.status === 'done' || r.status === 'above')) {
      q('new').textContent = fmt(r.outBytes);
      const pct = Math.round((1 - r.outBytes / r.inBytes) * 100);
      q('saved').innerHTML = pct > 0 ? `<span class="saved-good">${pct}%</span>` : '0%';
    } else { q('new').textContent = ''; q('saved').textContent = ''; }
  }

  function renderAll() {
    const body = $('listBody');
    body.innerHTML = '';
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'row-item';
      row.dataset.id = it.id;
      row.innerHTML = rowHtml(it);
      row.querySelector('.rm').onclick = () => {
        if (running) return;
        items = items.filter((x) => x.id !== it.id);
        row.remove(); showList(); updateConvertState();
      };
      body.appendChild(row);
      paintRow(it);
    }
    showList();
    updateConvertState();
  }

  function markSupport() {
    for (const it of items) {
      if (!supported(it.file)) it.state = 'unsupported';
      else if (it.state === 'unsupported') it.state = 'wait';
      paintRow(it);
    }
  }

  function updateConvertState() {
    $('convertLabel').textContent = running ? 'Stop' : 'Optimize';
    $('btnConvert').classList.toggle('stop', running);
    for (const id of ['btnAdd', 'btnFolder', 'btnOptions', 'modeSel']) $(id).disabled = running;
    $('btnClear').disabled = running || items.length === 0;
  }

  async function addPaths(paths) {
    if (running || !paths || !paths.length) return;
    const found = await window.vra.expand(paths, settings.mode);
    const have = new Set(items.map((i) => i.file.toLowerCase()));
    let added = 0;
    for (const f of found) {
      if (have.has(f.file.toLowerCase())) continue;
      have.add(f.file.toLowerCase());
      items.push({ id: nextId++, file: f.file, rel: f.rel, size: f.size, thumb: f.thumb, state: 'wait', result: null });
      added++;
    }
    if (!added && found.length === 0) {
      await showMessage('No images added', 'No supported images were found for the selected Convert mode. Supported types: JPG, PNG, HEIC, BMP, GIF, TIFF, AVIF and WebP.');
    }
    $('summary').hidden = true;
    renderAll();
  }

  // ---------- run ----------
  async function ensureOutDir() {
    if (settings.outDir) return true;
    await showMessage('Choose a folder', 'Choose the folder where the optimized images will be saved. You are asked only once. You can change it later in Options.', 'Choose folder');
    const dir = await window.vra.chooseOutDir();
    if (!dir) return false;
    settings.outDir = dir;
    await window.vra.saveSettings(settings);
    return true;
  }

  async function run() {
    if (running) { window.vra.cancel(); $('convertLabel').textContent = 'Stopping...'; return; }
    if (!items.length) {
      await showMessage('Nothing to optimize', 'Add some images first: drag them into the window, or use Add Images or Add Folder.');
      return;
    }
    let todo = items.filter((i) => i.state !== 'unsupported' && !(i.result && (i.result.status === 'done' || i.result.status === 'above' || i.result.status === 'skipped')));
    if (!todo.length) {
      const supportedItems = items.filter((i) => i.state !== 'unsupported');
      if (!supportedItems.length) {
        await showMessage('Nothing to optimize', 'None of the images in the list can be used with the selected Convert mode.');
        return;
      }
      const again = await showMessage('Already done', 'These images are already optimized. Optimize them again with the current settings? Earlier files are not overwritten; new files get a number in the name.', 'Optimize again', true);
      if (!again) return;
      supportedItems.forEach((i) => { i.result = null; i.state = 'wait'; });
      todo = supportedItems;
    }
    if (!(await ensureOutDir())) return;

    running = true; updateConvertState();
    todo.forEach((i) => { i.state = 'wait'; i.result = null; paintRow(i); });
    $('summary').hidden = false;
    $('progressWrap').hidden = false;
    $('progressBar').style.width = '0%';
    $('btnOpenOut').hidden = true;
    $('summaryText').textContent = `Working on ${todo.length} image${todo.length > 1 ? 's' : ''}...`;

    const payload = todo.map((i) => ({ id: i.id, file: i.file, rel: i.rel }));
    const s = Object.assign({}, settings);
    const res = await window.vra.run(payload, s);

    running = false; updateConvertState();
    $('progressWrap').hidden = true;

    const okItems = items.filter((i) => i.result && (i.result.status === 'done' || i.result.status === 'above'));
    const above = items.filter((i) => i.result && i.result.status === 'above').length;
    const failed = items.filter((i) => i.result && i.result.status === 'error').length;
    const skipped = items.filter((i) => i.result && i.result.status === 'skipped').length;
    const pct = res.inSum > 0 ? Math.round((1 - res.outSum / res.inSum) * 100) : 0;
    let text = '';
    if (okItems.length) {
      text = `${okItems.length} image${okItems.length > 1 ? 's' : ''} saved: ${fmt(res.inSum)} became ${fmt(res.outSum)}, saved ${pct}%.`;
    } else {
      text = 'No new images were saved.';
    }
    const extra = [];
    if (above) extra.push(`${above} larger than target`);
    if (skipped) extra.push(`${skipped} left as they are`);
    if (failed) extra.push(`${failed} failed`);
    if (res.cancelled) extra.push('stopped before the end');
    if (extra.length) text += ' (' + extra.join(', ') + ')';
    $('summaryText').textContent = text;
    lastOutDir = settings.outDir;
    $('btnOpenOut').hidden = !okItems.length;
    if (okItems.length && settings.openWhenDone && !res.cancelled) window.vra.openFolder(settings.outDir);
  }

  window.vra.onProgress((d) => {
    const it = items.find((x) => x.id === d.id);
    if (!it) return;
    if (d.state === 'working') it.state = 'work';
    else { it.state = 'result'; it.result = d.result; }
    paintRow(it);
    $('progressBar').style.width = Math.round((d.done / d.total) * 100) + '%';
    if (d.state === 'result') $('summaryText').textContent = `Working... ${d.done} of ${d.total} done`;
  });

  // ---------- modals ----------
  function openModal(id) { $(id).hidden = false; }
  function closeModal(el) { if (el._dismiss) el._dismiss(); else el.hidden = true; }
  document.querySelectorAll('.modal').forEach((m) => {
    m.addEventListener('mousedown', (e) => { if (e.target === m && m.id !== 'modalMsg') closeModal(m); });
    m.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => closeModal(m)));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.modal')].filter((m) => !m.hidden);
    if (open.length) closeModal(open[open.length - 1]);
  });

  // Options
  function fillOptions() {
    $('optOut').value = settings.outDir || '';
    $('optWidthOn').checked = settings.maxWidthOn;
    $('optWidth').value = settings.maxWidth;
    $('optTargetOn').checked = settings.targetOn;
    $('optTarget').value = settings.targetKB;
    $('optMinQ').value = settings.minQuality;
    $('optMinQOut').textContent = settings.minQuality + '%';
    $('optStrip').checked = settings.stripMeta;
    $('optClean').checked = settings.cleanNames;
    $('optOpenDone').checked = settings.openWhenDone;
    syncOptionEnable();
  }
  function syncOptionEnable() {
    $('optWidth').disabled = !$('optWidthOn').checked;
    $('optTarget').disabled = !$('optTargetOn').checked;
  }
  $('optWidthOn').onchange = syncOptionEnable;
  $('optTargetOn').onchange = syncOptionEnable;
  $('optMinQ').oninput = () => ($('optMinQOut').textContent = $('optMinQ').value + '%');
  $('optBrowse').onclick = async () => {
    const d = await window.vra.chooseOutDir();
    if (d) $('optOut').value = d;
  };
  $('optOpen').onclick = () => { if ($('optOut').value) window.vra.openFolder($('optOut').value); };
  $('optSave').onclick = async () => {
    const w = Math.max(200, Math.min(8000, parseInt($('optWidth').value, 10) || 1900));
    const t = Math.max(20, Math.min(5000, parseInt($('optTarget').value, 10) || 200));
    settings.outDir = $('optOut').value;
    settings.maxWidthOn = $('optWidthOn').checked;
    settings.maxWidth = w;
    settings.targetOn = $('optTargetOn').checked;
    settings.targetKB = t;
    settings.minQuality = parseInt($('optMinQ').value, 10);
    settings.stripMeta = $('optStrip').checked;
    settings.cleanNames = $('optClean').checked;
    settings.openWhenDone = $('optOpenDone').checked;
    if (settings.quality < settings.minQuality && settings.smart) { /* start is allowed to be below floor; engine handles it */ }
    await window.vra.saveSettings(settings);
    updateHint();
    $('modalOptions').hidden = true;
  };

  // Help
  function stripTags(h) { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; }
  function renderHelp(query) {
    const body = $('helpBody');
    const q = (query || '').trim().toLowerCase();
    body.innerHTML = '';
    let shown = 0, matches = 0;
    for (const sec of window.HELP_SECTIONS) {
      const text = (sec.title + ' ' + stripTags(sec.html)).toLowerCase();
      if (q && !text.includes(q)) continue;
      shown++;
      const div = document.createElement('section');
      div.className = 'help-sec';
      div.innerHTML = `<h3>${esc(sec.title)}</h3>${sec.html}`;
      body.appendChild(div);
      if (q) matches += highlight(div, q);
    }
    if (!shown) body.innerHTML = '<div class="help-empty">Nothing found. Try another word, for example <b>quality</b>, <b>folder</b> or <b>200 KB</b>.</div>';
    $('helpCount').textContent = q ? (shown ? `${shown} topic${shown > 1 ? 's' : ''} found` : '0 topics') : `${shown} topics`;
  }
  function highlight(root, q) {
    let count = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const lower = n.nodeValue.toLowerCase();
      let idx = lower.indexOf(q);
      if (idx < 0) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      while (idx >= 0) {
        frag.appendChild(document.createTextNode(n.nodeValue.slice(last, idx)));
        const m = document.createElement('mark');
        m.textContent = n.nodeValue.slice(idx, idx + q.length);
        frag.appendChild(m);
        count++;
        last = idx + q.length;
        idx = lower.indexOf(q, last);
      }
      frag.appendChild(document.createTextNode(n.nodeValue.slice(last)));
      n.parentNode.replaceChild(frag, n);
    }
    return count;
  }
  $('helpSearch').addEventListener('input', (e) => renderHelp(e.target.value));

  // ---------- wire up ----------
  $('btnAdd').onclick = async () => addPaths(await window.vra.addImages(settings.mode));
  $('btnFolder').onclick = async () => { const d = await window.vra.addFolder(); if (d) addPaths([d]); };
  $('btnClear').onclick = () => { if (running) return; items = []; $('summary').hidden = true; renderAll(); };
  $('btnOptions').onclick = () => { fillOptions(); openModal('modalOptions'); };
  $('btnHelp').onclick = () => { $('helpSearch').value = ''; renderHelp(''); openModal('modalHelp'); $('helpSearch').focus(); };
  $('btnAbout').onclick = () => openModal('modalAbout');
  $('aboutSite').onclick = (e) => { e.preventDefault(); window.vra.openExternal('https://vsa.edu.in/'); };
  $('btnOpenOut').onclick = () => window.vra.openFolder(lastOutDir || settings.outDir);
  $('btnConvert').onclick = run;

  $('modeSel').onchange = () => {
    settings.mode = $('modeSel').value;
    persist(); updateHint(); markSupport();
  };
  $('segAuto').onclick = () => { settings.smart = true; persist(); updateHint(); };
  $('segManual').onclick = () => { settings.smart = false; persist(); updateHint(); };
  $('qSlider').oninput = () => { settings.quality = parseInt($('qSlider').value, 10); persist(); updateHint(); };

  // drag and drop
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; if (!running) $('dropVeil').classList.add('show'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', (e) => { e.preventDefault(); dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('dropVeil').classList.remove('show'); });
  window.addEventListener('drop', (e) => {
    e.preventDefault(); dragDepth = 0; $('dropVeil').classList.remove('show');
    const paths = [];
    for (const f of e.dataTransfer.files) {
      try { const p = window.vra.pathForFile(f); if (p) paths.push(p); } catch (err) { /* ignore */ }
    }
    addPaths(paths);
  });

  // ---------- start ----------
  (async function init() {
    const info = await window.vra.info();
    settings = info.settings; modes = info.modes;
    const logo = await window.vra.logo();
    $('brandLogo').src = logo; $('aboutLogo').src = logo;
    $('aboutVer').textContent = info.version;
    fillModes(); updateHint(); showList(); updateConvertState();
  })();
})();

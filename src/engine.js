'use strict';
// VRA Intelligent Image Optimizer - image engine
// Converts images, resizes, searches for the best quality that fits a target size.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

sharp.cache(false);
sharp.concurrency(2);

const INPUT_EXT = new Set([
  '.jpg', '.jpeg', '.jfif', '.png', '.bmp', '.gif', '.tif', '.tiff',
  '.avif', '.heic', '.heif', '.webp'
]);

const MODES = {
  'any-webp': { label: 'Any image \u2192 WebP (recommended)', out: 'webp', inputs: null },
  'webp-jpg': { label: 'WebP \u2192 JPG', out: 'jpg', inputs: ['.webp'] },
  'webp-png': { label: 'WebP \u2192 PNG', out: 'png', inputs: ['.webp'] },
  'any-jpg': { label: 'Any image \u2192 JPG', out: 'jpg', inputs: null },
  'any-png': { label: 'Any image \u2192 PNG', out: 'png', inputs: null }
};

function isSupportedInput(file, mode) {
  const ext = path.extname(file).toLowerCase();
  if (!INPUT_EXT.has(ext)) return false;
  const m = MODES[mode] || MODES['any-webp'];
  if (m.inputs && !m.inputs.includes(ext)) return false;
  return true;
}

// Recursively list supported images in a folder
function scanFolder(dir, mode, base) {
  const found = [];
  base = base || dir;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return found; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      found.push(...scanFolder(full, mode, base));
    } else if (ent.isFile() && isSupportedInput(full, mode)) {
      found.push({ file: full, rel: path.relative(base, path.dirname(full)) });
    }
  }
  return found;
}

// Website-friendly name: lowercase, hyphens, no strange characters
function cleanName(name) {
  let n = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  n = n.replace(/[^a-z0-9._-]+/g, '-').replace(/-{2,}/g, '-').replace(/\.{2,}/g, '.');
  n = n.replace(/^[-.]+|[-.]+$/g, '');
  return n || 'image';
}

function uniquePath(dir, base, ext, reserved) {
  let candidate = path.join(dir, base + ext);
  let i = 1;
  while (fs.existsSync(candidate) || reserved.has(candidate.toLowerCase())) {
    candidate = path.join(dir, `${base}-${i}${ext}`);
    i++;
  }
  reserved.add(candidate.toLowerCase());
  return candidate;
}

// Quick check: is this image "graphic-like" (text, logo, sharp lines, few colours)?
async function looksLikeGraphic(buf) {
  try {
    const { data, info } = await sharp(buf, { animated: false })
      .rotate()
      .resize({ width: 320, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height, ch = info.channels;
    // colour variety (4 bits per channel)
    const seen = new Set();
    for (let i = 0; i < data.length; i += ch) {
      seen.add(((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4));
    }
    // share of pixels that sit on a strong edge
    let strong = 0, total = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * ch;
        const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const r = (data[i + ch] + data[i + ch + 1] + data[i + ch + 2]) / 3;
        const d = (data[i + w * ch] + data[i + w * ch + 1] + data[i + w * ch + 2]) / 3;
        if (Math.abs(l - r) + Math.abs(l - d) > 90) strong++;
        total++;
      }
    }
    const edgeShare = total ? strong / total : 0;
    const colours = seen.size;
    return colours < 260 || (edgeShare > 0.08 && colours < 1200);
  } catch (e) {
    return false;
  }
}

async function loadInput(file) {
  const ext = path.extname(file).toLowerCase();
  const raw = await fs.promises.readFile(file);
  if (ext === '.heic' || ext === '.heif') {
    const convert = require('heic-convert');
    const jpeg = await convert({ buffer: raw, format: 'JPEG', quality: 0.95 });
    return { buf: Buffer.from(jpeg), animated: false, ext };
  }
  return { buf: raw, animated: ext === '.gif', ext };
}

function buildEncoder(format, pipeline, opts) {
  if (format === 'webp') {
    const o = { quality: opts.quality, effort: 5, smartSubsample: true };
    if (opts.lossless) { o.lossless = true; delete o.quality; }
    return pipeline.clone().webp(o);
  }
  if (format === 'jpg') {
    return pipeline.clone().jpeg({ quality: opts.quality, mozjpeg: true, chromaSubsampling: '4:4:4' });
  }
  return pipeline.clone().png({ compressionLevel: 9, effort: 8 });
}

/**
 * Process one image.
 * settings: { mode, smart, quality, maxWidthOn, maxWidth, targetOn, targetKB,
 *             minQuality, stripMeta, cleanNames, outDir }
 * Returns { status, message, outFile, inBytes, outBytes, width, height, note }
 */
async function processOne(item, settings, reserved) {
  const mode = MODES[settings.mode] || MODES['any-webp'];
  const outFormat = mode.out;
  const inStat = await fs.promises.stat(item.file);
  const inBytes = inStat.size;
  const result = { inBytes, outBytes: 0, status: 'error', note: '' };

  let loaded;
  try {
    loaded = await loadInput(item.file);
  } catch (e) {
    result.message = 'Could not open this file (damaged or unsupported).';
    return result;
  }

  try {
    const meta = await sharp(loaded.buf, { animated: loaded.animated }).metadata();
    const srcWidth = meta.width || 0;
    const targetBytes = settings.targetOn ? Math.round(settings.targetKB * 1024) : 0;
    const needResize = settings.maxWidthOn && srcWidth > settings.maxWidth;

    // Already optimized WebP: nothing to gain
    if (settings.mode === 'any-webp' && loaded.ext === '.webp' && settings.smart &&
        !needResize && (!targetBytes || inBytes <= targetBytes)) {
      result.status = 'skipped';
      result.message = 'Already optimized - left as it is';
      result.width = srcWidth;
      result.height = meta.height;
      return result;
    }

    let pipeline = sharp(loaded.buf, { animated: loaded.animated }).rotate();
    if (needResize) {
      pipeline = pipeline.resize({ width: settings.maxWidth, withoutEnlargement: true });
    }
    if (outFormat === 'jpg') pipeline = pipeline.flatten({ background: '#ffffff' });
    if (!settings.stripMeta) pipeline = pipeline.keepMetadata();

    let quality = Math.max(1, Math.min(100, Math.round(settings.quality)));
    let buffer;
    let used = quality;
    let flag = '';
    let graphic = false;

    if (outFormat === 'png') {
      buffer = await buildEncoder('png', pipeline, {}).toBuffer();
      used = 100;
    } else if (!settings.smart) {
      // Manual: exactly the slider value
      buffer = await buildEncoder(outFormat, pipeline, { quality }).toBuffer();
    } else {
      // Intelligent: find the highest quality that fits the target, never below the floor
      graphic = await looksLikeGraphic(loaded.buf);
      const floor = Math.min(quality, graphic ? Math.max(settings.minQuality, 80) : settings.minQuality);
      buffer = await buildEncoder(outFormat, pipeline, { quality }).toBuffer();
      used = quality;
      if (targetBytes && buffer.length > targetBytes) {
        let lo = floor, hi = quality - 1;
        let best = null, bestQ = floor;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const b = await buildEncoder(outFormat, pipeline, { quality: mid }).toBuffer();
          if (b.length <= targetBytes) { best = b; bestQ = mid; lo = mid + 1; }
          else { hi = mid - 1; }
        }
        if (best) { buffer = best; used = bestQ; }
        else {
          buffer = await buildEncoder(outFormat, pipeline, { quality: floor }).toBuffer();
          used = floor;
          flag = 'above';
        }
      }
      // Logos, text and sharp graphics: lossless can be smaller and perfect
      if (graphic && outFormat === 'webp' && !loaded.animated) {
        const ll = await buildEncoder('webp', pipeline, { lossless: true }).toBuffer();
        const fits = !targetBytes || ll.length <= targetBytes;
        if (ll.length < buffer.length || (fits && flag === 'above')) {
          buffer = ll; used = 100; flag = fits ? '' : flag;
        }
      }
    }

    // Never make a file bigger than the original in WebP/JPG smart mode
    if (settings.smart && settings.mode === 'any-webp' && buffer.length >= inBytes && loaded.ext === '.webp') {
      result.status = 'skipped';
      result.message = 'Already smaller than the new version - left as it is';
      return result;
    }

    const outMeta = await sharp(buffer, { animated: loaded.animated }).metadata();
    const extOut = outFormat === 'jpg' ? '.jpg' : '.' + outFormat;
    const baseName = path.basename(item.file, path.extname(item.file));
    const finalBase = settings.cleanNames ? cleanName(baseName) : baseName;
    const outDir = item.rel ? path.join(settings.outDir, item.rel) : settings.outDir;
    await fs.promises.mkdir(outDir, { recursive: true });
    const outFile = uniquePath(outDir, finalBase, extOut, reserved);
    await fs.promises.writeFile(outFile, buffer);

    result.status = flag === 'above' ? 'above' : 'done';
    result.outFile = outFile;
    result.outBytes = buffer.length;
    result.width = outMeta.width;
    result.height = outMeta.pageHeight || outMeta.height;
    result.quality = used;
    result.graphic = graphic;
    if (flag === 'above') {
      result.message = `Kept at quality ${used}% to protect the look`;
    } else if (graphic && used === 100) {
      result.message = 'Sharp graphic - saved lossless';
    } else {
      result.message = outFormat === 'png' ? 'Converted' : `Optimized at quality ${used}%`;
    }
    if (needResize) result.message += ` (resized to ${outMeta.width} px wide)`;
    return result;
  } catch (e) {
    result.message = 'Conversion failed: ' + (e && e.message ? e.message : e);
    return result;
  }
}

async function makeThumb(file) {
  try {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.heic' || ext === '.heif') return null;
    const buf = await sharp(file, { failOn: 'none' })
      .rotate()
      .resize(72, 72, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();
    return 'data:image/jpeg;base64,' + buf.toString('base64');
  } catch (e) {
    return null;
  }
}

module.exports = { MODES, INPUT_EXT, isSupportedInput, scanFolder, processOne, makeThumb, cleanName };

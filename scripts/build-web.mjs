#!/usr/bin/env node
/**
 * Builds the installable web app into ./dist:
 *   1. `expo export -p web` (copies ./public into ./dist)
 *   2. points the HTML's manifest/icon links at the base path
 *   3. stamps dist/sw.js with a content hash and the list of every built file,
 *      so the service worker can store the whole app for offline use
 *   4. adds GitHub Pages helpers: 404.html (single-page-app fallback) and
 *      .nojekyll (so the `_expo/` folder is served)
 *
 * Hosting under a sub-path (GitHub Pages project sites live at /<repo>/):
 *   WEB_BASE_URL=/<repo> npm run build:web
 * Left unset, the app is built for a domain root (Netlify, Cloudflare Pages…).
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const BASE = (process.env.WEB_BASE_URL ?? '').replace(/\/+$/, '');
// Hosting config and build metadata are never requested by the app.
const SKIP = new Set(['sw.js', '_redirects', 'metadata.json', '404.html', '.nojekyll']);

console.log(`Building web app for ${BASE ? `base path ${BASE}/` : 'the domain root'}…`);
execSync('npx expo export -p web --output-dir dist', { stdio: 'inherit', env: { ...process.env, WEB_BASE_URL: BASE } });

// Manifest + home-screen icon links are absolute in public/index.html.
const indexPath = join(DIST, 'index.html');
const html = readFileSync(indexPath, 'utf8')
  .replaceAll('href="/manifest.json"', `href="${BASE}/manifest.json"`)
  .replaceAll('href="/icons/', `href="${BASE}/icons/`);
writeFileSync(indexPath, html);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(DIST)
  .map((path) => relative(DIST, path).split(sep).join('/'))
  .filter((path) => !SKIP.has(path))
  .sort();

const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(join(DIST, file)));
const version = hash.digest('hex').slice(0, 12);

// Relative to sw.js, which lives at the base path — so this works at any base.
const urls = ['./', ...files];
const swPath = join(DIST, 'sw.js');
const sw = readFileSync(swPath, 'utf8')
  .replace('__BUILD_VERSION__', version)
  .replace('__PRECACHE_MANIFEST__', JSON.stringify(urls, null, 2));
writeFileSync(swPath, sw);

// GitHub Pages: unknown paths serve 404.html, so make it the app too; and
// disable Jekyll, which would otherwise hide the `_expo/` folder.
copyFileSync(indexPath, join(DIST, '404.html'));
writeFileSync(join(DIST, '.nojekyll'), '');

const bytes = files.reduce((sum, f) => sum + statSync(join(DIST, f)).size, 0);
console.log(
  `\n✔ Web app ready in ./${DIST} — version ${version}, ${urls.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB) cached for offline use.`,
);

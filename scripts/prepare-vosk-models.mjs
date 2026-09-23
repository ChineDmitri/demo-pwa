#!/usr/bin/env node
// Downloads the official Vosk "small" language models and repackages them into the
// gzipped-tar format expected by vosk-browser, then drops them under public/vosk-models/
// so the app can fetch them from its own origin (alphacephei.com does not send CORS
// headers, so the browser can never fetch the models directly at runtime - see the
// component's install flow in src/app/pages/sensors.ts).
//
// Usage:
//   node scripts/prepare-vosk-models.mjs            # prepares en, fr, es, it
//   node scripts/prepare-vosk-models.mjs fr it       # prepares only the given languages
//   node scripts/prepare-vosk-models.mjs --force     # re-downloads even if already present
//
// Requires `unzip` and `tar` on PATH (both ship with Git Bash / WSL / macOS / most Linux
// distros; on Windows outside Git Bash, run this from a Git Bash or WSL shell).

import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'public', 'vosk-models');

const MODEL_SOURCES = {
  en: 'vosk-model-small-en-us-0.15',
  fr: 'vosk-model-small-fr-0.22',
  es: 'vosk-model-small-es-0.42',
  it: 'vosk-model-small-it-0.22',
};

const BASE_URL = 'https://alphacephei.com/vosk/models/';

function toPosixPath(p) {
  // GNU tar (as bundled with Git Bash on Windows) misparses a leading "C:\..." as a
  // remote "host:path" rsh spec. Forward slashes avoid the ambiguity.
  return p.replace(/\\/g, '/');
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (result.error) {
    throw new Error(`Failed to run "${cmd}": ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`"${cmd} ${args.join(' ')}" exited with code ${result.status}`);
  }
}

function downloadFile(url, destPath) {
  // Shells out to curl rather than using Node's fetch: on machines behind a TLS-inspecting
  // network proxy, Node's bundled CA store often doesn't trust the proxy's root certificate
  // even though the OS-wide certificate store (which curl uses) does.
  run('curl', ['-sSL', '--fail', '--max-time', '300', '-o', destPath, url]);
}

async function prepareLanguage(lang, { force }) {
  const modelName = MODEL_SOURCES[lang];
  if (!modelName) {
    console.warn(`Unknown language "${lang}", skipping.`);
    return;
  }

  const outputPath = join(OUTPUT_DIR, `${lang}.tar.gz`);
  if (existsSync(outputPath) && !force) {
    console.log(`[${lang}] already present at ${outputPath} (use --force to redo)`);
    return;
  }

  const zipUrl = `${BASE_URL}${modelName}.zip`;
  const workDir = await mkdtemp(join(tmpdir(), 'vosk-model-'));
  const zipPath = join(workDir, `${modelName}.zip`);

  try {
    console.log(`[${lang}] downloading ${zipUrl} ...`);
    downloadFile(zipUrl, zipPath);

    console.log(`[${lang}] extracting ...`);
    run('unzip', ['-q', '-o', zipPath, '-d', workDir]);

    const extractedDir = join(workDir, modelName);
    if (!existsSync(extractedDir)) {
      const entries = await readdir(workDir);
      throw new Error(
        `Expected extracted folder "${modelName}" not found in ${workDir} (found: ${entries.join(', ')})`,
      );
    }

    const entries = await readdir(extractedDir);
    mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`[${lang}] repackaging as gzipped tar ...`);
    // --force-local: without it, GNU tar reads a "C:/..." path as a remote "host:path" rsh
    // spec (the drive letter looks like a hostname before the colon).
    run('tar', [
      '--force-local',
      '-czf',
      toPosixPath(outputPath),
      '-C',
      toPosixPath(extractedDir),
      ...entries,
    ]);

    const { size } = statSync(outputPath);
    console.log(
      `[${lang}] done -> public/vosk-models/${lang}.tar.gz (${(size / 1024 / 1024).toFixed(1)} MiB)`,
    );
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const langs = args.filter((a) => !a.startsWith('--'));
  const targets = langs.length ? langs : Object.keys(MODEL_SOURCES);

  for (const lang of targets) {
    await prepareLanguage(lang, { force });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});

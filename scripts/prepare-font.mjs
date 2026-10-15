import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const file = path.join(process.cwd(), 'assets', 'NanumGothic.ttf');
const source = 'https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Regular.ttf';
await mkdir(path.dirname(file), { recursive: true });
try {
  const existing = await readFile(file);
  if (existing.byteLength > 10000) {
    console.log('Korean PDF font already available.');
    process.exit(0);
  }
} catch {}
const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error('Korean font download failed: HTTP ' + response.status);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.byteLength < 10000 || bytes.toString('ascii',0,4) !== String.fromCharCode(0,1,0,0)) throw new Error('Downloaded Korean font is not a valid TTF');
await writeFile(file, bytes);
console.log('Korean PDF font prepared: ' + bytes.length + ' bytes.');

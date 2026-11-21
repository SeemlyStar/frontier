// Bundle the game into one self-contained page: dist/index.html.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const result = await build({
  entryPoints: ['game/ui/main.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: false,
  write: false,
  legalComments: 'none',
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const template = await readFile('game/ui/index.html', 'utf8');
const html = template.replace('/*SCRIPT*/', () => `{\n${js}\n}`);

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log(`dist/index.html: ${(html.length / 1024).toFixed(1)} KB`);

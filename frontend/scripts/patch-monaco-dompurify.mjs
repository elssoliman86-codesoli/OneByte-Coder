import { access, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Monaco bundles an older DOMPurify copy. Redirect its internal module to the
// separately pinned DOMPurify package before Vite creates the production bundle.
const require = createRequire(import.meta.url);
let monacoRoot = dirname(require.resolve('monaco-editor'));

while (monacoRoot !== dirname(monacoRoot)) {
  try {
    const packageJson = JSON.parse(await readFile(join(monacoRoot, 'package.json'), 'utf8'));
    if (packageJson.name === 'monaco-editor') break;
  } catch {
    // Keep walking toward node_modules.
  }
  monacoRoot = dirname(monacoRoot);
}

const packageJson = JSON.parse(await readFile(join(monacoRoot, 'package.json'), 'utf8'));
if (packageJson.name !== 'monaco-editor') {
  throw new Error('Could not locate the installed monaco-editor package root');
}
const target = join(monacoRoot, 'esm/vs/base/browser/dompurify/dompurify.js');

try {
  await access(target);
  await writeFile(target, "export { default } from 'dompurify';\n", 'utf8');
  const { default: patched } = await import(pathToFileURL(target).href);
  if (patched.version !== '3.4.17') {
    throw new Error(`Expected DOMPurify 3.4.17, loaded ${patched.version || 'unknown'}`);
  }
  console.info(`Verified Monaco DOMPurify module: ${patched.version}`);
} catch (error) {
  console.error('Could not patch Monaco DOMPurify module:', { target, error });
  process.exitCode = 1;
}

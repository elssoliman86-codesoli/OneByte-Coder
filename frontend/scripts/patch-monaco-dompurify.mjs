import { access, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Monaco's bundled DOMPurify is older than the separately pinned patched package.
// Replace the internal module before Vite bundles Monaco into the application.
const require = createRequire(import.meta.url);
const monacoEntry = require.resolve('monaco-editor');
const monacoRoot = resolve(dirname(monacoEntry), '../../..');
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

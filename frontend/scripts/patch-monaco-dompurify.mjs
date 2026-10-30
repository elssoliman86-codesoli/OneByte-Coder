import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Monaco 0.56.0 bundles an older DOMPurify copy. Replace the exact ESM
// vendor module consumed by Monaco with the separately pinned patched package.
const target = resolve(
  process.cwd(),
  'node_modules/monaco-editor/esm/vs/base/browser/dompurify/dompurify.js'
);

try {
  await writeFile(target, "export { default } from 'dompurify';\n", 'utf8');
  const { default: patched } = await import(pathToFileURL(target).href);
  if (patched.version !== '3.4.17') {
    throw new Error(`Expected DOMPurify 3.4.17, loaded ${patched.version || 'unknown'}`);
  }
  console.info(`Verified Monaco DOMPurify module: ${patched.version}`);
} catch (error) {
  console.error('Could not patch Monaco DOMPurify module:', error);
  process.exitCode = 1;
}

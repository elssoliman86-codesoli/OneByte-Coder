import { access, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';

// Monaco 0.57.0 ships an older DOMPurify copy inside this module.
// Redirect that module to the separately pinned, patched DOMPurify release.
const require = createRequire(import.meta.url);
const monacoEntry = require.resolve('monaco-editor');
const monacoRoot = resolve(dirname(monacoEntry), '../../..');
const target = join(monacoRoot, 'esm/vs/base/browser/dompurify/dompurify.js');

try {
  await access(target);
  await writeFile(target, "export { default } from 'dompurify';\n", 'utf8');
  console.info('Patched Monaco DOMPurify module to use dompurify@3.4.17');
} catch (error) {
  console.error('Could not patch Monaco DOMPurify module:', { target, error });
  process.exitCode = 1;
}

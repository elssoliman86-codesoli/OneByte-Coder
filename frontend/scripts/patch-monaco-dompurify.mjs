import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Monaco 0.57.0 ships an older DOMPurify copy inside this module.
// Redirect that module to the separately pinned, patched DOMPurify release.
const specifier = 'monaco-editor/esm/vs/base/browser/dompurify/dompurify.js';

try {
  const target = fileURLToPath(import.meta.resolve(specifier));
  await writeFile(target, "export { default } from 'dompurify';\n", 'utf8');
  console.info('Patched Monaco DOMPurify module to use dompurify@3.4.17');
} catch (error) {
  console.error('Could not patch Monaco DOMPurify module:', error);
  process.exitCode = 1;
}

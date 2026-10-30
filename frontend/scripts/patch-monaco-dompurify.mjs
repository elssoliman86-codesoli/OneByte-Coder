import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, parse } from 'node:path';
import { pathToFileURL } from 'node:url';

// Monaco 0.56.0 bundles an older DOMPurify copy. Replace the ESM vendor
// module actually consumed by Monaco with the separately pinned patched package.
const require = createRequire(import.meta.url);

try {
  let directory = dirname(require.resolve('monaco-editor'));
  let monacoRoot = null;
  while (directory !== parse(directory).root) {
    try {
      const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
      if (metadata.name === 'monaco-editor') {
        monacoRoot = directory;
        break;
      }
    } catch {
      // Continue walking toward the package root.
    }
    directory = dirname(directory);
  }
  if (!monacoRoot) throw new Error('Could not locate the monaco-editor package root');

  const target = join(monacoRoot, 'esm/vs/base/browser/dompurify/dompurify.js');
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

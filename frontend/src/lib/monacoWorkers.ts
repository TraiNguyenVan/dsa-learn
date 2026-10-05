/**
 * Monaco web-worker wiring.
 *
 * Without this, Monaco tries to spawn its workers with
 * `new URL('../../../base/common/worker/webWorkerBootstrap.js', import.meta.url)`,
 * which no bundler can resolve. The editor then logs
 * "Failed to load worker script for label: editorWorkerService" and quietly
 * degrades - tokenization, diffing and the TypeScript/JSON language services all
 * move onto the main thread.
 *
 * Monaco 0.57's `exports` map resolves `monaco-editor/<path>` to
 * `esm/vs/<path>.js`, so the specifiers below intentionally omit the `esm/vs`
 * prefix that older integration guides use.
 */

import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

declare global {
  // Monaco already declares `MonacoEnvironment` as `Environment | undefined`;
  // augmenting it here (rather than redeclaring) keeps its declared type.
  interface Environment {
    getWorker?(workerId: string, label: string): Worker;
  }
}

if (typeof self !== 'undefined' && !self.MonacoEnvironment) {
  self.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      switch (label) {
        case 'json':
          return new jsonWorker();
        case 'css':
        case 'scss':
        case 'less':
          return new cssWorker();
        case 'html':
        case 'handlebars':
        case 'razor':
          return new htmlWorker();
        case 'typescript':
        case 'javascript':
          return new tsWorker();
        default:
          return new editorWorker();
      }
    },
  };
}

export {};
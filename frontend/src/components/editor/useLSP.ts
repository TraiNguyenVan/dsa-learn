import { useEffect, useRef, useState, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import type { LanguageServiceStatus } from '../../lib/types';

interface UseLSPOptions {
  exerciseId: string | null;
  code: string;
  monaco: typeof Monaco | null;
  editor: Monaco.editor.IStandaloneCodeEditor | null;
}

function mapLspKindToMonaco(kind: number | undefined, m: typeof Monaco): Monaco.languages.CompletionItemKind {
  if (!kind) return m.languages.CompletionItemKind.Text;
  switch (kind) {
    case 1:
      return m.languages.CompletionItemKind.Text;
    case 2:
      return m.languages.CompletionItemKind.Method;
    case 3:
      return m.languages.CompletionItemKind.Function;
    case 4:
      return m.languages.CompletionItemKind.Constructor;
    case 5:
      return m.languages.CompletionItemKind.Field;
    case 6:
      return m.languages.CompletionItemKind.Variable;
    case 7:
      return m.languages.CompletionItemKind.Class;
    case 8:
      return m.languages.CompletionItemKind.Interface;
    case 9:
      return m.languages.CompletionItemKind.Module;
    case 10:
      return m.languages.CompletionItemKind.Property;
    case 11:
      return m.languages.CompletionItemKind.Unit;
    case 12:
      return m.languages.CompletionItemKind.Value;
    case 13:
      return m.languages.CompletionItemKind.Enum;
    case 14:
      return m.languages.CompletionItemKind.Keyword;
    case 15:
      return m.languages.CompletionItemKind.Snippet;
    case 16:
      return m.languages.CompletionItemKind.Color;
    case 17:
      return m.languages.CompletionItemKind.File;
    case 18:
      return m.languages.CompletionItemKind.Reference;
    case 19:
      return m.languages.CompletionItemKind.Folder;
    case 20:
      return m.languages.CompletionItemKind.EnumMember;
    case 21:
      return m.languages.CompletionItemKind.Constant;
    case 22:
      return m.languages.CompletionItemKind.Struct;
    case 23:
      return m.languages.CompletionItemKind.Event;
    case 24:
      return m.languages.CompletionItemKind.Operator;
    case 25:
      return m.languages.CompletionItemKind.TypeParameter;
    default:
      return m.languages.CompletionItemKind.Text;
  }
}

export function useLSP({ exerciseId, code, monaco, editor }: UseLSPOptions) {
  const [lspStatus, setLspStatus] = useState<LanguageServiceStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reqIdRef = useRef<number>(1);
  const pendingRequestsRef = useRef<Map<number, (res: any) => void>>(new Map());

  const docUri = exerciseId
    ? `file:///workspace/exercises/${exerciseId}/solution.cpp`
    : 'file:///workspace/solution.cpp';

  // Send JSON-RPC request and await response with a 3s safety timeout
  const sendRequest = useCallback((method: string, params: any): Promise<any> => {
    return new Promise((resolve) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        resolve(null);
        return;
      }
      const id = reqIdRef.current++;
      const timer = setTimeout(() => {
        if (pendingRequestsRef.current.has(id)) {
          pendingRequestsRef.current.delete(id);
          resolve(null);
        }
      }, 3000);

      pendingRequestsRef.current.set(id, (res) => {
        clearTimeout(timer);
        resolve(res);
      });

      try {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        pendingRequestsRef.current.delete(id);
        resolve(null);
      }
    });
  }, []);

  // Send JSON-RPC notification (no response expected)
  const sendNotification = useCallback((method: string, params: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ jsonrpc: '2.0', method, params }));
      } catch (err) {
        console.error('Failed to send notification to LSP:', err);
      }
    }
  }, []);

  // Connect to /ws/lsp
  useEffect(() => {
    if (!exerciseId || !monaco || !editor) {
      setLspStatus('fallback');
      return;
    }

    setLspStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/lsp?exercise_id=${exerciseId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      // 1. Initialize LSP
      const initResult = await sendRequest('initialize', {
        processId: null,
        rootUri: 'file:///workspace',
        capabilities: {
          textDocument: {
            completion: {
              dynamicRegistration: true,
              completionItem: {
                snippetSupport: true,
                documentationFormat: ['markdown', 'plaintext'],
              },
            },
            hover: {
              dynamicRegistration: true,
              contentFormat: ['markdown', 'plaintext'],
            },
            signatureHelp: {
              dynamicRegistration: true,
              signatureInformation: {
                documentationFormat: ['markdown', 'plaintext'],
                parameterInformation: { labelOffsetSupport: true },
              },
            },
            publishDiagnostics: { relatedInformation: true },
          },
        },
      });

      if (initResult) {
        sendNotification('initialized', {});

        // 2. Open document
        sendNotification('textDocument/didOpen', {
          textDocument: {
            uri: docUri,
            languageId: 'cpp',
            version: 1,
            text: code,
          },
        });

        setLspStatus('active');
      } else {
        setLspStatus('fallback');
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Handle request response
        if (msg.id && pendingRequestsRef.current.has(msg.id)) {
          const resolve = pendingRequestsRef.current.get(msg.id)!;
          pendingRequestsRef.current.delete(msg.id);
          resolve(msg.result);
          return;
        }

        // Handle notifications
        if (msg.method === 'window/showMessage') {
          if (msg.params?.message?.includes('clangd binary not found')) {
            setLspStatus('fallback');
          }
        }

        // Handle diagnostics
        if (msg.method === 'textDocument/publishDiagnostics') {
          const model = editor.getModel();
          if (model) {
            const diagnostics = msg.params.diagnostics || [];
            const markers: Monaco.editor.IMarkerData[] = diagnostics.map((d: any) => ({
              startLineNumber: (d.range?.start?.line ?? 0) + 1,
              startColumn: (d.range?.start?.character ?? 0) + 1,
              endLineNumber: (d.range?.end?.line ?? 0) + 1,
              endColumn: (d.range?.end?.character ?? 0) + 1,
              message: d.message || 'Diagnostic',
              severity:
                d.severity === 1
                  ? monaco.MarkerSeverity.Error
                  : d.severity === 2
                  ? monaco.MarkerSeverity.Warning
                  : monaco.MarkerSeverity.Info,
              source: 'clangd',
            }));
            monaco.editor.setModelMarkers(model, 'clangd', markers);
          }
        }
      } catch (err) {
        console.error('Error parsing LSP message:', err);
      }
    };

    ws.onerror = () => {
      setLspStatus('fallback');
    };

    ws.onclose = () => {
      setLspStatus('fallback');
    };

    return () => {
      sendNotification('textDocument/didClose', {
        textDocument: { uri: docUri },
      });
      ws.close();
      wsRef.current = null;
    };
  }, [exerciseId, monaco, editor, docUri, sendNotification, sendRequest]);

  // Synchronize document changes
  const notifyChange = useCallback(
    (newText: string) => {
      sendNotification('textDocument/didChange', {
        textDocument: {
          uri: docUri,
          version: Date.now(),
        },
        contentChanges: [{ text: newText }],
      });
    },
    [docUri, sendNotification]
  );

  // Fetch autocompletion proposals from clangd
  const getCompletions = useCallback(
    async (
      model: Monaco.editor.ITextModel,
      position: Monaco.Position
    ): Promise<Monaco.languages.CompletionList | null> => {
      if (lspStatus !== 'active' || !monaco) return null;

      const res = await sendRequest('textDocument/completion', {
        textDocument: { uri: docUri },
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
      });

      if (!res) return null;

      const items = Array.isArray(res) ? res : res.items || [];
      const word = model.getWordUntilPosition(position);
      const defaultRange: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: Monaco.languages.CompletionItem[] = items.map((item: any) => {
        let documentation: string | Monaco.IMarkdownString | undefined;
        if (typeof item.documentation === 'string') {
          documentation = { value: item.documentation };
        } else if (item.documentation?.value) {
          documentation = { value: item.documentation.value };
        }

        const isSnippet = item.insertTextFormat === 2;

        return {
          label: item.label,
          kind: mapLspKindToMonaco(item.kind, monaco),
          detail: item.detail,
          documentation,
          insertText: item.insertText || item.label,
          insertTextRules: isSnippet
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          range: defaultRange,
          sortText: item.sortText,
        };
      });

      return {
        suggestions,
        incomplete: res.isIncomplete ?? false,
      };
    },
    [docUri, lspStatus, monaco, sendRequest]
  );

  // Fetch symbol hover documentation from clangd
  const getHover = useCallback(
    async (
      _model: Monaco.editor.ITextModel,
      position: Monaco.Position
    ): Promise<Monaco.languages.Hover | null> => {
      if (lspStatus !== 'active' || !monaco) return null;

      const res = await sendRequest('textDocument/hover', {
        textDocument: { uri: docUri },
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
      });

      if (!res || !res.contents) return null;

      const contents: Monaco.IMarkdownString[] = [];
      if (Array.isArray(res.contents)) {
        for (const c of res.contents) {
          if (typeof c === 'string') {
            contents.push({ value: c });
          } else if (c?.value) {
            contents.push({ value: c.value });
          }
        }
      } else if (typeof res.contents === 'string') {
        contents.push({ value: res.contents });
      } else if (res.contents?.value) {
        contents.push({ value: res.contents.value });
      }

      if (contents.length === 0) return null;

      let range: Monaco.IRange | undefined;
      if (res.range) {
        range = new monaco.Range(
          res.range.start.line + 1,
          res.range.start.character + 1,
          res.range.end.line + 1,
          res.range.end.character + 1
        );
      }

      return { contents, range };
    },
    [docUri, lspStatus, monaco, sendRequest]
  );

  // Fetch parameter signature assistance from clangd
  const getSignatureHelp = useCallback(
    async (
      _model: Monaco.editor.ITextModel,
      position: Monaco.Position
    ): Promise<Monaco.languages.SignatureHelpResult | null> => {
      if (lspStatus !== 'active' || !monaco) return null;

      const res = await sendRequest('textDocument/signatureHelp', {
        textDocument: { uri: docUri },
        position: {
          line: position.lineNumber - 1,
          character: position.column - 1,
        },
      });

      if (!res || !res.signatures || res.signatures.length === 0) return null;

      const signatures: Monaco.languages.SignatureInformation[] = res.signatures.map((s: any) => ({
        label: s.label,
        documentation: typeof s.documentation === 'string' ? { value: s.documentation } : s.documentation,
        parameters: (s.parameters || []).map((p: any) => ({
          label: p.label,
          documentation: typeof p.documentation === 'string' ? { value: p.documentation } : p.documentation,
        })),
        activeParameter: s.activeParameter,
      }));

      return {
        value: {
          signatures,
          activeSignature: res.activeSignature ?? 0,
          activeParameter: res.activeParameter ?? 0,
        },
        dispose: () => {},
      };
    },
    [docUri, lspStatus, monaco, sendRequest]
  );

  return {
    lspStatus,
    lspReady: lspStatus === 'active',
    notifyChange,
    sendRequest,
    getCompletions,
    getHover,
    getSignatureHelp,
  };
}

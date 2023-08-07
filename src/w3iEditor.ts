import * as vscode from 'vscode';
import { W3W3i, parse } from 'w3-format-w3i-js/dist';

type Content = {
	bytes: Uint8Array;
	w3i: W3W3i;
}

class W3IDocument extends vscode.Disposable implements vscode.CustomDocument {
	static async create(
		uri: vscode.Uri,
		backupId: string | undefined,
	): Promise<W3IDocument | PromiseLike<W3IDocument>> {
		// If we have a backup, read that. Otherwise read the resource from the workspace
		const dataFile = typeof backupId === 'string' ? vscode.Uri.parse(backupId) : uri;
		const fileData = await W3IDocument.readFile(dataFile);
		return new W3IDocument(uri, fileData);
	}

	private static async readFile(uri: vscode.Uri): Promise<Content> {
		if (uri.scheme === 'untitled') {
			return {
				bytes: new Uint8Array(),
				w3i: new W3W3i()
			};
		}
		const bytes = new Uint8Array(await vscode.workspace.fs.readFile(uri))
		const arrayBuffer = bytes.buffer;
		return {
			bytes,
			w3i: parse(arrayBuffer)
		};
	}

	uri: vscode.Uri;
	documentData: Content;

	private constructor(
		uri: vscode.Uri,
		initialContent: Content,
	) {
		super(() => {});
		this.uri = uri;
		this.documentData = initialContent;
	}
}

export class W3IEditorProvider implements vscode.CustomEditorProvider {

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new W3IEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(W3IEditorProvider.viewType, provider);
		return providerRegistration;
	}

	private static readonly viewType = 'w3-format-w3i.preview';

	constructor(
		private readonly context: vscode.ExtensionContext
	) { }
	onDidChangeCustomDocument: vscode.Event<vscode.CustomDocumentEditEvent<vscode.CustomDocument>> | vscode.Event<vscode.CustomDocumentContentChangeEvent<vscode.CustomDocument>> = () => {
		console.log('change');
		return {
			'dispose': () => {

			}
		};
	};
	saveCustomDocument(document: vscode.CustomDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		console.log('save');
		return new Promise(() => {

		});
	}
	saveCustomDocumentAs(document: vscode.CustomDocument, destination: vscode.Uri, cancellation: vscode.CancellationToken): Thenable<void> {
		console.log('saveas');
		return new Promise(() => {
			
		});
	}
	revertCustomDocument(document: vscode.CustomDocument, cancellation: vscode.CancellationToken): Thenable<void> {
		console.log('revert');
		return new Promise(() => {
			
		});
	}
	backupCustomDocument(document: vscode.CustomDocument, context: vscode.CustomDocumentBackupContext, cancellation: vscode.CancellationToken): Thenable<vscode.CustomDocumentBackup> {
		console.log('backup');
		return new Promise(() => {
			
		});
	}
	async openCustomDocument(uri: vscode.Uri, openContext: vscode.CustomDocumentOpenContext, token: vscode.CancellationToken):Promise<W3IDocument> {
		console.log('open', uri, openContext);
		return await W3IDocument.create(uri, openContext.backupId);
	}
	resolveCustomEditor(document: W3IDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void> {
		console.log('resolve');
		// Add the webview to our internal set of active webviews
		//this.webviews.add(document.uri, webviewPanel);

		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		const content = document.documentData;
		const w3i = decycle(content.w3i);
		const hljs = require('highlight.js');
		const code = JSON.stringify(w3i, undefined, 2);
		//const highlightedCode = hljs.highlight(code, { language: 'json' }).value;
		webviewPanel.webview.html = `<html>
			<div>${convertUint8_to_hexStr(content.bytes)}</div>
			<div><pre>${code}</pre></div>
		</html>`;

		//webviewPanel.webview.onDidReceiveMessage(e => this.onMessage(document, e));

		// Wait for the webview to be properly ready before we init
		webviewPanel.webview.onDidReceiveMessage(e => {
			if (e.type === 'ready') {
				if (document.uri.scheme === 'untitled') {
					webviewPanel.webview.postMessage({
						type: 'init',
						body: {
							untitled: true,
							editable: true,
						}
					});
				} else {
					webviewPanel.webview.postMessage({
						type: 'init',
						body: {
							untitled: true,
							editable: true,
						}
					});
				}
			}
		});
	}
}

const decycle = (dataRaw: object) => {
	return JSON.parse(JSON.stringify(dataRaw, (key, value) => {
	  if (key.startsWith('_')) {
		return undefined;
	  }
	  return value;
	}));
}

function convertUint8_to_hexStr(uint8: Uint8Array) {
	return Array.from(uint8)
	  .map((i) => i.toString(16).padStart(2, '0'))
	  .join(' ');
}
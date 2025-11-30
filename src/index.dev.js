import React from 'react';
import { createRoot } from 'react-dom/client';
import Library from './library/library';
import Reader from './common/reader';
import pdf from '../demo/pdf';
import epub from '../demo/epub';
import snapshot from '../demo/snapshot';
import TagPopup from './library/tag-popup';

window.dev = true;

async function createReader() {
	if (window._reader) {
		throw new Error('Reader is already initialized');
	}
	let queryString = window.location.search;
	let urlParams = new URLSearchParams(queryString);
	let view = urlParams.get('view');

	if (view === 'library') {
		// Clear existing content if any
		document.body.innerHTML = '<div id="root"></div>';
		const root = createRoot(document.getElementById('root'));
		root.render(<Library onOpenDocument={(id) => {
			window.location.href = `/dev/reader.html?type=snapshot&id=${id}`;
		}} />);
		return;
	}

	let type = urlParams.get('type') || 'pdf';
	let id = urlParams.get('id');

	let demo;
	let initialData = {};
	let initialAnnotations = [];

	// Create a container for the tag popup
	const popupContainer = document.createElement('div');
	popupContainer.id = 'tag-popup-container';
	document.body.appendChild(popupContainer);
	const popupRoot = createRoot(popupContainer);

	if (id && type === 'snapshot') {
		// Load from local library
		const htmlRes = await fetch(`/library/${id}/index.html`);
		const htmlBuf = await htmlRes.arrayBuffer();

		const metadataRes = await fetch(`/api/library/${id}/metadata`);
		const metadata = await metadataRes.json();

		const annotationsRes = await fetch(`/api/library/${id}/annotations`);
		initialAnnotations = await annotationsRes.json();

		initialData = {
			buf: new Uint8Array(htmlBuf),
			url: metadata.url,
			importedFromURL: metadata.url
		};
		console.log('Loading snapshot with data:', {
			bufSize: initialData.buf.byteLength,
			url: initialData.url
		});
		demo = { state: {} }; // Default state
	} else {
		// Load demo
		if (type === 'pdf') {
			demo = pdf;
		}
		else if (type === 'epub') {
			demo = epub;
		}
		else if (type === 'snapshot') {
			demo = snapshot;
		}
		let res = await fetch(demo.fileName);
		initialData = {
			buf: new Uint8Array(await res.arrayBuffer()),
			url: new URL('/', window.location).toString()
		};
		initialAnnotations = demo.annotations;
	}

	let reader = new Reader({
		type,
		readOnly: false,
		data: initialData,
		// rtl: true,
		annotations: initialAnnotations,
		primaryViewState: demo.state,
		sidebarWidth: 240,
		sidebarView: 'annotations', //thumbnails, outline
		bottomPlaceholderHeight: null,
		toolbarPlaceholderWidth: 0,
		authorName: 'John',
		showAnnotations: true,
		// platform: 'web',
		// password: 'test',
		onOpenContextMenu(params) {
			reader.openContextMenu(params);
		},
		onAddToNote() {
			alert('Add annotations to the current note');
		},
		onSaveAnnotations: async function (annotations) {
			console.log('Save annotations', annotations);
			if (id) {
				try {
					await fetch(`/api/library/${id}/annotations`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(annotations)
					});
					console.log('Annotations saved to library');
				} catch (err) {
					console.error('Failed to save annotations', err);
				}
			}
		},
		onDeleteAnnotations: async function (ids) {
			console.log('Delete annotations', JSON.stringify(ids));
			if (id) {
				try {
					await fetch(`/api/library/${id}/annotations`, {
						method: 'DELETE',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(ids)
					});
					console.log('Annotations deleted from library');
				} catch (err) {
					console.error('Failed to delete annotations', err);
				}
			}
		},
		onChangeViewState: function (state, primary) {
			console.log('Set state', state, primary);
		},
		onOpenTagsPopup(annotationID, left, top) {
			const annotation = reader._annotationManager._getAnnotationByID(annotationID);
			if (!annotation) return;

			popupRoot.render(
				<TagPopup
					annotationID={annotationID}
					tags={annotation.tags}
					position={{ left, top }}
					onSave={(newTags) => {
						annotation.tags = newTags;
						reader._annotationManager.updateAnnotations([annotation]);
					}}
					onClose={() => {
						popupRoot.render(null);
						reader.focus();
					}}
				/>
			);
		},
		onClosePopup() {
			popupRoot.render(null);
		},
		// ... (existing options)
		onOpenLink(url) {
			alert('Navigating to an external link: ' + url);
		},
		onToggleSidebar: (open) => {
			console.log('Sidebar toggled', open);
		},
		onChangeSidebarWidth(width) {
			console.log('Sidebar width changed', width);
		},
		onChangeSidebarView(view) {
			console.log('Sidebar view changed', view);
		},
		onSetDataTransferAnnotations(dataTransfer, annotations, fromText) {
			console.log('Set formatted dataTransfer annotations', dataTransfer, annotations, fromText);
		},
		onConfirm(title, text, confirmationButtonTitle) {
			return window.confirm(text);
		},
		onRotatePages(pageIndexes, degrees) {
			console.log('Rotating pages', pageIndexes, degrees);
		},
		onDeletePages(pageIndexes, degrees) {
			console.log('Deleting pages', pageIndexes, degrees);
		},
		onToggleContextPane() {
			console.log('Toggle context pane');
		},
		onTextSelectionAnnotationModeChange(mode) {
			console.log(`Change text selection annotation mode to '${mode}'`);
		},
		onSaveCustomThemes(customThemes) {
			console.log('Save custom themes', customThemes);
		}
	});
	reader.enableAddToNote(true);
	window._reader = reader;
	await reader.initializedPromise;

	// Add Back to Library button
	if (id) {
		const backBtn = document.createElement('button');
		backBtn.textContent = '← Library';
		backBtn.style.cssText = `
			position: fixed;
			top: 10px;
			left: 80px; /* Right of the sidebar toggle if present, or just offset */
			z-index: 10000;
			padding: 6px 12px;
			background: var(--color-background-primary, #fff);
			border: 1px solid var(--color-border-primary, #ccc);
			border-radius: 4px;
			cursor: pointer;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		`;
		backBtn.onclick = () => {
			window.location.href = '/dev/reader.html?view=library';
		};
		document.body.appendChild(backBtn);
	}
}

createReader();

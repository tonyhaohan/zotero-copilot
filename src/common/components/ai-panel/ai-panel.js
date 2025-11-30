import React, { useState, useRef, useEffect } from 'react';

// List of supported AI providers
const AI_PROVIDERS = [
	{ id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com/' },
	{ id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/' },
	{ id: 'claude', name: 'Claude', url: 'https://claude.ai/' },
	{ id: 'custom', name: 'Custom URL', url: '' }
];

function AIPanel({ isOpen, width, selectedText, onClose, onResize, onSendToAI }) {
	const [provider, setProvider] = useState('chatgpt');
	const [customUrl, setCustomUrl] = useState('');
	const [inputText, setInputText] = useState('');
	const iframeRef = useRef(null);
	const resizerRef = useRef(null);
	const isResizing = useRef(false);

	// Update input text when selected text changes
	useEffect(() => {
		if (selectedText) {
			setInputText(selectedText);
		}
	}, [selectedText]);

	const getCurrentUrl = () => {
		const selectedProvider = AI_PROVIDERS.find(p => p.id === provider);
		if (provider === 'custom') {
			return customUrl;
		}
		return selectedProvider ? selectedProvider.url : '';
	};

	const handleProviderChange = (e) => {
		setProvider(e.target.value);
	};

	const handleCustomUrlChange = (e) => {
		setCustomUrl(e.target.value);
	};

	const handleInputChange = (e) => {
		setInputText(e.target.value);
	};

	const handleSendToAI = () => {
		if (inputText.trim() && onSendToAI) {
			onSendToAI(inputText);
		}
	};

	const handleCopyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(inputText);
		} catch (err) {
			console.error('Failed to copy text:', err);
		}
	};

	const handleMouseDown = (e) => {
		isResizing.current = true;
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		e.preventDefault();
	};

	const handleMouseMove = (e) => {
		if (!isResizing.current) return;
		const newWidth = window.innerWidth - e.clientX;
		if (newWidth >= 300 && newWidth <= window.innerWidth * 0.6) {
			onResize(newWidth);
		}
	};

	const handleMouseUp = () => {
		isResizing.current = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	};

	if (!isOpen) return null;

	return (
		<div className="ai-panel" style={{ width: `${width}px` }}>
			<div
				className="ai-panel-resizer"
				ref={resizerRef}
				onMouseDown={handleMouseDown}
			/>
			<div className="ai-panel-header">
				<div className="ai-panel-title">AI Assistant</div>
				<button className="ai-panel-close" onClick={onClose} title="Close AI Panel">
					×
				</button>
			</div>
			<div className="ai-panel-controls">
				<select
					value={provider}
					onChange={handleProviderChange}
					className="ai-provider-select"
				>
					{AI_PROVIDERS.map(p => (
						<option key={p.id} value={p.id}>{p.name}</option>
					))}
				</select>
				{provider === 'custom' && (
					<input
						type="text"
						value={customUrl}
						onChange={handleCustomUrlChange}
						placeholder="Enter custom AI URL..."
						className="ai-custom-url-input"
					/>
				)}
			</div>
			<div className="ai-panel-input-area">
				<textarea
					value={inputText}
					onChange={handleInputChange}
					placeholder="Selected text will appear here. You can edit and send to AI."
					className="ai-input-textarea"
					rows={4}
				/>
				<div className="ai-input-actions">
					<button onClick={handleCopyToClipboard} className="ai-action-btn" title="Copy to clipboard">
						📋 Copy
					</button>
					<button onClick={handleSendToAI} className="ai-action-btn ai-send-btn" title="Send to AI (paste in chat)">
						📤 Ready to Paste
					</button>
				</div>
			</div>
			<div className="ai-panel-content">
				{getCurrentUrl() ? (
					<iframe
						ref={iframeRef}
						src={getCurrentUrl()}
						title="AI Assistant"
						className="ai-iframe"
						sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
					/>
				) : (
					<div className="ai-panel-placeholder">
						<p>Please select an AI provider or enter a custom URL above.</p>
						<p className="ai-hint">
							<strong>Tip:</strong> Use <kbd>Ctrl+Shift+L</kbd> (or <kbd>Cmd+Shift+L</kbd> on Mac) 
							to send selected text from the document to this panel.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

export default AIPanel;

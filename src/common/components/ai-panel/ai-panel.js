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
	const [copyStatus, setCopyStatus] = useState(''); // 'success' | 'error' | ''
	const iframeRef = useRef(null);
	const resizerRef = useRef(null);
	const isResizing = useRef(false);

	// Update input text when selected text changes
	useEffect(() => {
		if (selectedText) {
			setInputText(selectedText);
		}
	}, [selectedText]);

	// Clear copy status after a delay
	useEffect(() => {
		if (copyStatus) {
			const timer = setTimeout(() => setCopyStatus(''), 2000);
			return () => clearTimeout(timer);
		}
	}, [copyStatus]);

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
		if (!inputText.trim()) {
			setCopyStatus('error');
			return;
		}
		try {
			await navigator.clipboard.writeText(inputText);
			setCopyStatus('success');
		} catch (err) {
			console.error('Failed to copy text:', err);
			setCopyStatus('error');
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

	const getCopyButtonText = () => {
		if (copyStatus === 'success') return 'Copied!';
		if (copyStatus === 'error') return 'Failed';
		return 'Copy';
	};

	if (!isOpen) return null;

	return (
		<div className="ai-panel" style={{ width: `${width}px` }}>
			<div
				className="ai-panel-resizer"
				ref={resizerRef}
				onMouseDown={handleMouseDown}
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize AI panel"
			/>
			<div className="ai-panel-header">
				<div className="ai-panel-title">AI Assistant</div>
				<button 
					className="ai-panel-close" 
					onClick={onClose} 
					title="Close AI Panel"
					aria-label="Close AI Panel"
				>
					×
				</button>
			</div>
			<div className="ai-panel-controls">
				<label htmlFor="ai-provider-select" className="visually-hidden">
					Select AI Provider
				</label>
				<select
					id="ai-provider-select"
					value={provider}
					onChange={handleProviderChange}
					className="ai-provider-select"
					aria-label="Select AI provider"
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
						aria-label="Custom AI URL"
					/>
				)}
			</div>
			<div className="ai-panel-input-area">
				<label htmlFor="ai-input-textarea" className="visually-hidden">
					Text to send to AI
				</label>
				<textarea
					id="ai-input-textarea"
					value={inputText}
					onChange={handleInputChange}
					placeholder="Selected text will appear here. You can edit and send to AI."
					className="ai-input-textarea"
					rows={4}
					aria-label="Text to send to AI"
				/>
				<div className="ai-input-actions">
					<button 
						onClick={handleCopyToClipboard} 
						className={`ai-action-btn ${copyStatus ? `ai-copy-${copyStatus}` : ''}`}
						title="Copy to clipboard"
						aria-label="Copy text to clipboard"
					>
						{getCopyButtonText()}
					</button>
					<button 
						onClick={handleSendToAI} 
						className="ai-action-btn ai-send-btn" 
						title="Copy and paste into AI chat"
						aria-label="Ready to paste into AI chat"
					>
						Ready to Paste
					</button>
				</div>
			</div>
			<div className="ai-panel-content">
				{getCurrentUrl() ? (
					<iframe
						ref={iframeRef}
						src={getCurrentUrl()}
						title="AI Assistant Chat Interface"
						className="ai-iframe"
						sandbox="allow-scripts allow-forms allow-popups"
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

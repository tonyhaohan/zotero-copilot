import React, { useState, useEffect, useRef } from 'react';

const TagPopup = ({ annotationID, tags = [], onSave, onClose, position }) => {
    const [currentTags, setCurrentTags] = useState(tags);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleAddTag = (e) => {
        e.preventDefault();
        const newTag = inputValue.trim();
        if (newTag && !currentTags.some(t => t.name === newTag)) {
            const updatedTags = [...currentTags, { name: newTag, type: 1 }]; // Type 1 is generic tag
            setCurrentTags(updatedTags);
            setInputValue('');
            onSave(updatedTags);
        }
    };

    const handleRemoveTag = (tagName) => {
        const updatedTags = currentTags.filter(t => t.name !== tagName);
        setCurrentTags(updatedTags);
        onSave(updatedTags);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleAddTag(e);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed',
            left: position.left,
            top: position.top,
            background: 'var(--color-background-primary, #fff)',
            border: '1px solid var(--color-border-primary, #ccc)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '12px',
            zIndex: 10001,
            width: '240px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
        }}>
            <div style={{ marginBottom: '8px', fontWeight: 600, fontSize: '12px', color: 'var(--color-text-secondary, #666)' }}>
                Edit Tags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {currentTags.map(tag => (
                    <span key={tag.name} style={{
                        background: 'var(--color-accent-bg, #e6f3ff)',
                        color: 'var(--color-accent-fg, #0066cc)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {tag.name}
                        <span
                            onClick={() => handleRemoveTag(tag.name)}
                            style={{ cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ×
                        </span>
                    </span>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add tag..."
                    style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border-primary, #ccc)',
                        fontSize: '12px'
                    }}
                />
                <button
                    onClick={handleAddTag}
                    style={{
                        padding: '4px 8px',
                        background: 'var(--color-accent-fg, #0066cc)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Add
                </button>
            </div>
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary, #999)'
                }}
            >
                ✕
            </div>
        </div>
    );
};

export default TagPopup;

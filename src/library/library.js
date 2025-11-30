import React, { useState, useEffect } from 'react';

export default function Library({ onOpenDocument }) {
    const [items, setItems] = useState([]);
    const [importUrl, setImportUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedTag, setSelectedTag] = useState(null);
    const [editingItem, setEditingItem] = useState(null); // Item being edited for tags

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        try {
            const res = await fetch('/api/library');
            const data = await res.json();
            setItems(data);
        } catch (err) {
            console.error('Failed to fetch library', err);
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!importUrl) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: importUrl })
            });

            if (!res.ok) throw new Error('Import failed');

            const newItem = await res.json();
            setItems(prev => [...prev, newItem]);
            setImportUrl('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMetadata = async (id, updates) => {
        try {
            const res = await fetch(`/api/library/${id}/metadata`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updatedMeta = await res.json();
                setItems(prev => prev.map(item => item.id === id ? { ...item, ...updatedMeta } : item));
            }
        } catch (err) {
            console.error('Failed to update metadata', err);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            await fetch(`/api/library/${id}`, { method: 'DELETE' });
            setItems(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error('Failed to delete', err);
        }
    };

    // Extract all unique tags
    const allTags = Array.from(new Set(items.flatMap(item => item.tags || []))).sort();

    // Filter items
    const filteredItems = selectedTag
        ? items.filter(item => item.tags && item.tags.includes(selectedTag))
        : items;

    return (
        <div className="library-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{
                width: '200px',
                borderRight: '1px solid #ccc',
                padding: '20px',
                background: '#f5f5f5',
                overflowY: 'auto'
            }}>
                <h2 style={{ fontSize: '1.2em', marginTop: 0 }}>Tags</h2>
                <div
                    onClick={() => setSelectedTag(null)}
                    style={{
                        padding: '8px',
                        cursor: 'pointer',
                        background: selectedTag === null ? '#e0e0e0' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '4px'
                    }}
                >
                    All Documents
                </div>
                {allTags.map(tag => (
                    <div
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        style={{
                            padding: '8px',
                            cursor: 'pointer',
                            background: selectedTag === tag ? '#e0e0e0' : 'transparent',
                            borderRadius: '4px',
                            marginBottom: '4px'
                        }}
                    >
                        {tag}
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                <h1 style={{ marginTop: 0 }}>Local Library</h1>

                <form onSubmit={handleImport} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <input
                        type="url"
                        value={importUrl}
                        onChange={e => setImportUrl(e.target.value)}
                        placeholder="Enter URL to import (e.g. arXiv HTML)"
                        style={{ flex: 1, padding: '8px' }}
                        required
                    />
                    <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
                        {loading ? 'Importing...' : 'Import'}
                    </button>
                </form>

                {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

                <div className="document-list">
                    {filteredItems.length === 0 ? (
                        <p>No documents found.</p>
                    ) : (
                        filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => onOpenDocument(item.id)}
                                style={{
                                    border: '1px solid #ccc',
                                    padding: '15px',
                                    marginBottom: '10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: '#fff'
                                }}
                            >
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{item.title || item.url}</h3>
                                    <div style={{ fontSize: '0.85em', color: '#666' }}>
                                        {new Date(item.importedDate).toLocaleString()} - {item.url}
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: '#888', marginTop: '5px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {item.tags && item.tags.map(tag => (
                                            <span key={tag} style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newTitle = prompt('Enter new title:', item.title);
                                            if (newTitle) handleUpdateMetadata(item.id, { title: newTitle });
                                        }}
                                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                                    >
                                        Rename
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingItem(item);
                                        }}
                                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                                    >
                                        Tags
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(item.id, e)}
                                        style={{
                                            background: '#ff4444',
                                            color: 'white',
                                            border: 'none',
                                            padding: '5px 10px',
                                            borderRadius: '3px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Tag Editor Modal */}
            {editingItem && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '400px',
                        maxWidth: '90%'
                    }}>
                        <h3>Edit Tags for "{editingItem.title || editingItem.url}"</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
                            {(editingItem.tags || []).map(tag => (
                                <span key={tag} style={{
                                    background: '#e6f3ff',
                                    color: '#0066cc',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {tag}
                                    <span
                                        onClick={() => {
                                            const newTags = editingItem.tags.filter(t => t !== tag);
                                            setEditingItem({ ...editingItem, tags: newTags });
                                        }}
                                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                    >×</span>
                                </span>
                            ))}
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.target.elements.tagInput;
                            const newTag = input.value.trim();
                            if (newTag && !(editingItem.tags || []).includes(newTag)) {
                                setEditingItem({
                                    ...editingItem,
                                    tags: [...(editingItem.tags || []), newTag]
                                });
                                input.value = '';
                            }
                        }} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <input name="tagInput" placeholder="Add new tag..." style={{ flex: 1, padding: '8px' }} />
                            <button type="submit" style={{ padding: '8px 16px' }}>Add</button>
                        </form>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setEditingItem(null)} style={{ padding: '8px 16px' }}>Cancel</button>
                            <button
                                onClick={() => {
                                    handleUpdateMetadata(editingItem.id, { tags: editingItem.tags });
                                    setEditingItem(null);
                                }}
                                style={{ padding: '8px 16px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px' }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

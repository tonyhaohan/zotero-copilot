import React, { useState, useEffect } from 'react';

export default function Library({ onOpenDocument }) {
    const [items, setItems] = useState([]);
    const [importUrl, setImportUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    return (
        <div className="library-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Local Library</h1>

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
                {items.length === 0 ? (
                    <p>No documents yet. Import one above!</p>
                ) : (
                    items.map(item => (
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
                                <div style={{ fontSize: '0.85em', color: '#888', marginTop: '5px' }}>
                                    Tags: {item.tags && item.tags.length > 0 ? item.tags.join(', ') : 'None'}
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
                                        const tags = prompt('Enter tags (comma separated):', item.tags ? item.tags.join(', ') : '');
                                        if (tags !== null) handleUpdateMetadata(item.id, { tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
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
    );
}

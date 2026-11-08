import React, { useState, useEffect } from 'react';
import { Grid, RefreshCw, Heart, Search, AlertCircle, Layers } from 'lucide-react';
import { api } from '../services/api';
import { PhotoCard } from '../components/PhotoCard';
import { useFavorites } from '../context/FavoritesContext';

export const GalleryView = ({ onOpenModal }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [addedNotice, setAddedNotice] = useState(null);

  const { addMultipleFavorites } = useFavorites();

  const loadPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAllPhotos();
      setPhotos(res.photos || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load gallery photos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const filteredPhotos = photos.filter((p) => {
    if (!filterText.trim()) return true;
    const name = (p.filename || p.photo_path || '').toLowerCase();
    return name.includes(filterText.toLowerCase());
  });

  const handleAddAllToFavorites = () => {
    if (filteredPhotos.length === 0) return;
    const added = addMultipleFavorites(filteredPhotos);
    setAddedNotice(`Added ${added} new photo${added === 1 ? '' : 's'} to favorites!`);
    setTimeout(() => setAddedNotice(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Grid size={22} color="var(--accent-cyan)" /> All Indexed Photos
            </h2>
            <p className="panel-subtitle">
              Browse every image stored and vectorized in the local database
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadPhotos}
              disabled={loading}
              title="Refresh Photo Gallery"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {filteredPhotos.length > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddAllToFavorites}
              >
                <Heart size={15} fill="#ffffff" />
                <span>Add All to Favorites ({filteredPhotos.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Search filter input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '40px' }}
              placeholder="Filter photos by filename..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {filteredPhotos.length} / {photos.length} photos
          </span>
        </div>

        {addedNotice && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#6ee7b7',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Heart size={15} fill="currentColor" />
            <span>{addedNotice}</span>
          </div>
        )}
      </div>

      {/* Main Gallery Area */}
      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <RefreshCw size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading indexed photos from database...</p>
        </div>
      ) : error ? (
        <div
          className="panel"
          style={{
            background: 'rgba(244, 63, 94, 0.08)',
            borderColor: 'rgba(244, 63, 94, 0.3)',
            textAlign: 'center',
            padding: '40px 20px',
          }}
        >
          <AlertCircle size={36} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ color: '#f87171', marginBottom: '8px' }}>Gallery Load Error</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={loadPhotos}>
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="empty-state">
          <Layers className="empty-icon" />
          <h3 style={{ color: 'var(--text-primary)' }}>No Photos Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem' }}>
            {filterText
              ? `No images match your filter "${filterText}". Try clearing the search.`
              : 'The database does not have any indexed photos yet.'}
          </p>
        </div>
      ) : (
        <div className="gallery-grid">
          {filteredPhotos.map((photo, idx) => (
            <PhotoCard
              key={photo.id || photo.photo_path || idx}
              photo={photo}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
      )}
    </div>
  );
};

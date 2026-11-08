import React, { useEffect } from 'react';
import { X, Heart, ExternalLink, Target, Users } from 'lucide-react';
import { resolveImageUrl } from '../services/api';
import { useFavorites } from '../context/FavoritesContext';

export const PhotoModal = ({ photo, onClose }) => {
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

  const photoPath = photo.photo_path || photo.url;
  const filename = photo.filename || (photo.photo_path ? photo.photo_path.replace(/\\/g, '/').split('/').pop() : 'Photo');
  const imageUrl = resolveImageUrl(photo.url || photo.photo_path);
  const favorited = isFavorite(photoPath);

  const hasScore = typeof photo.score === 'number';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {filename}
            </h3>
            {hasScore && (
              <span className="brand-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Target size={12} /> Score: {photo.score.toFixed(4)}
              </span>
            )}
            {!hasScore && typeof photo.face_count === 'number' && (
              <span className="brand-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} /> {photo.face_count} Faces
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 10px' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              maxHeight: '65vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#040810',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px',
            }}
          >
            <img
              src={imageUrl}
              alt={filename}
              style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Path: {photo.photo_path}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${favorited ? 'btn-danger' : 'btn-outline-cyan'}`}
                onClick={() => toggleFavorite(photo)}
              >
                <Heart size={16} fill={favorited ? 'currentColor' : 'none'} />
                {favorited ? 'Favorited' : 'Add to Favorites'}
              </button>

              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <ExternalLink size={16} /> Open Full Size
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

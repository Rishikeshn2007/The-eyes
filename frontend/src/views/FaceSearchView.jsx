import React, { useState, useRef } from 'react';
import {
  ScanFace,
  Upload,
  Camera,
  Sliders,
  Sparkles,
  Heart,
  AlertCircle,
  RefreshCw,
  X,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { PhotoCard } from '../components/PhotoCard';
import { WebcamCapture } from '../components/WebcamCapture';
import { useFavorites } from '../context/FavoritesContext';

export const FaceSearchView = ({ onOpenModal }) => {
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'camera'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [threshold, setThreshold] = useState(0.4);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [addedNotice, setAddedNotice] = useState(null);

  const fileInputRef = useRef(null);
  const { addMultipleFavorites } = useFavorites();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleCameraCapture = (file, preview) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(preview);
    setInputMode('upload'); // Switch back to show query preview
    setError(null);
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeSearch = async () => {
    if (!selectedFile) {
      setError('Please upload a photo or capture a selfie first.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.searchFace(selectedFile, threshold);
      setResults(res);
      if (!res.found && res.error) {
        setError(res.error);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Face search request failed.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllToFavorites = () => {
    if (!results || !results.results || results.results.length === 0) return;
    const added = addMultipleFavorites(results.results);
    setAddedNotice(`Added ${added} matching photo${added === 1 ? '' : 's'} to favorites!`);
    setTimeout(() => setAddedNotice(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search Configuration Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <ScanFace size={22} color="var(--accent-cyan)" /> Biometric Facial Search
            </h2>
            <p className="panel-subtitle">
              Locate every photo containing the target person using InsightFace feature matching
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="toggle-tab-group">
            <button
              type="button"
              className={`toggle-tab ${inputMode === 'upload' ? 'active' : ''}`}
              onClick={() => setInputMode('upload')}
            >
              <Upload size={14} />
              <span>Upload Photo</span>
            </button>
            <button
              type="button"
              className={`toggle-tab ${inputMode === 'camera' ? 'active' : ''}`}
              onClick={() => setInputMode('camera')}
            >
              <Camera size={14} />
              <span>Take Live Selfie</span>
            </button>
          </div>
        </div>

        {/* Input Area */}
        {inputMode === 'camera' ? (
          <WebcamCapture
            onCapture={handleCameraCapture}
            onClose={() => setInputMode('upload')}
          />
        ) : (
          <div>
            {!selectedFile ? (
              <div
                className="dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <Upload className="dropzone-icon" />
                <div>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Click or Drag & Drop a Face Photo
                  </h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    Supports JPG, PNG, WEBP &bull; Max 20MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="query-preview-container">
                <img
                  src={previewUrl}
                  alt="Target Face"
                  className="query-preview-img"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {selectedFile.name || 'Captured Selfie'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Ready for facial analysis &bull; {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearSelection}
                  style={{ padding: '6px 10px' }}
                  title="Remove Image"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Threshold Slider */}
        <div style={{ marginTop: '22px' }}>
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} /> Similarity Threshold
              </span>
              <span className="slider-value">{threshold.toFixed(2)}</span>
            </label>
            <div className="slider-container">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.10 (Broad)</span>
              <input
                type="range"
                className="slider"
                min="0.10"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.90 (Strict)</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Standard recommendation is 0.40. Higher values yield more exact identity matches.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={executeSearch}
            disabled={loading || !selectedFile}
            style={{ padding: '12px 28px', fontSize: '0.95rem' }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Scanning Biometrics...</span>
              </>
            ) : (
              <>
                <ScanFace size={16} />
                <span>Execute Face Search</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.88rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Gallery Section */}
      {results && results.found && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={20} color="var(--accent-emerald)" />
                <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Found {results.count} matching photo{results.count === 1 ? '' : 's'}
                </span>
                <span className="brand-badge">&ge; {threshold.toFixed(2)} Match</span>
              </div>

              {results.results && results.results.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddAllToFavorites}
                >
                  <Heart size={15} fill="#ffffff" />
                  <span>Add All Results to Favorites</span>
                </button>
              )}
            </div>

            {addedNotice && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#6ee7b7',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Heart size={14} fill="currentColor" />
                <span>{addedNotice}</span>
              </div>
            )}
          </div>

          <div className="gallery-grid">
            {results.results.map((match, idx) => (
              <PhotoCard
                key={match.photo_path || idx}
                photo={match}
                onOpenModal={onOpenModal}
              />
            ))}
          </div>
        </div>
      )}

      {results && !results.found && !error && (
        <div className="empty-state">
          <ScanFace className="empty-icon" />
          <h3 style={{ color: 'var(--text-primary)' }}>No Matching Faces Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem' }}>
            No faces in the indexed database exceeded the {threshold.toFixed(2)} similarity threshold.
            Try lowering the threshold to 0.35 or use an image with better lighting.
          </p>
        </div>
      )}
    </div>
  );
};

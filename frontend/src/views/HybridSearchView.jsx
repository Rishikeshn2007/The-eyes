import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Camera,
  Sliders,
  Search,
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

export const HybridSearchView = ({ onOpenModal }) => {
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'camera'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [threshold, setThreshold] = useState(0.4);
  const [topK, setTopK] = useState(5);

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
    setInputMode('upload');
    setError(null);
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeHybridSearch = async () => {
    if (!selectedFile) {
      setError('Please provide a reference face image or capture a selfie.');
      return;
    }
    if (!searchText || !searchText.trim()) {
      setError('Please enter a descriptive search prompt for situational context.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.searchHybrid(selectedFile, searchText.trim(), threshold, topK);
      setResults(res);
      if (!res.found && res.error) {
        setError(res.error);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Hybrid search failed.');
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
      {/* Control Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Sparkles size={22} color="var(--accent-cyan)" /> Hybrid Multimodal Fusion Search
            </h2>
            <p className="panel-subtitle">
              Locate a specific person (Biometric Face) matching a situational prompt (Semantic CLIP)
            </p>
          </div>

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

        {/* Reference Image Input */}
        <div style={{ marginBottom: '20px' }}>
          <div className="form-label" style={{ marginBottom: '8px' }}>
            <span>1. Reference Face (Target Individual)</span>
          </div>

          {inputMode === 'camera' ? (
            <WebcamCapture
              onCapture={handleCameraCapture}
              onClose={() => setInputMode('upload')}
            />
          ) : !selectedFile ? (
            <div
              className="dropzone"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '28px 20px' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload className="dropzone-icon" style={{ width: '36px', height: '36px' }} />
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Upload Target Person's Face Photo
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  JPG, PNG, or WEBP
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
                  Biometric reference locked &bull; {(selectedFile.size / 1024).toFixed(1)} KB
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

        {/* Text Prompt Box */}
        <div className="form-group">
          <label className="form-label">
            <span>2. Contextual Description / Action</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. 'standing in front of a stage', 'outdoor portrait', 'speaking at podium'..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* Sliders in 2 Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginTop: '16px',
          }}
        >
          {/* Threshold Slider */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} /> Face Match Threshold
              </span>
              <span className="slider-value">{threshold.toFixed(2)}</span>
            </label>
            <div className="slider-container">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.10</span>
              <input
                type="range"
                className="slider"
                min="0.10"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.90</span>
            </div>
          </div>

          {/* Top K Slider */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} /> Max Results (Top K)
              </span>
              <span className="slider-value">{topK}</span>
            </label>
            <div className="slider-container">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1</span>
              <input
                type="range"
                className="slider"
                min="1"
                max="20"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>20</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={executeHybridSearch}
            disabled={loading || !selectedFile || !searchText.trim()}
            style={{ padding: '12px 28px', fontSize: '0.95rem' }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Running Hybrid Fusion...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Execute Hybrid Search</span>
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

      {/* Results Section */}
      {results && results.found && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={20} color="var(--accent-emerald)" />
                <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Found {results.count} matching moment{results.count === 1 ? '' : 's'}
                </span>
                <span className="brand-badge">Prompt: "{results.query}"</span>
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
          <Sparkles className="empty-icon" />
          <h3 style={{ color: 'var(--text-primary)' }}>No Hybrid Matches</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem' }}>
            Could not find photos that contain the target person while also matching "{searchText}".
            Try relaxing the face similarity threshold or adjusting your prompt description.
          </p>
        </div>
      )}
    </div>
  );
};

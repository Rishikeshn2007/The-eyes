import React, { useState } from 'react';
import {
  Search,
  Sliders,
  Sparkles,
  Heart,
  AlertCircle,
  RefreshCw,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { PhotoCard } from '../components/PhotoCard';
import { useFavorites } from '../context/FavoritesContext';

export const SemanticSearchView = ({ onOpenModal }) => {
  const [searchText, setSearchText] = useState('');
  const [topK, setTopK] = useState(5);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [addedNotice, setAddedNotice] = useState(null);

  const { addMultipleFavorites } = useFavorites();

  const suggestions = [
    'people in a group',
    'taking a selfie',
    'standing on stage',
    'friends smiling together',
    'meeting in an office',
    'graduation celebration',
  ];

  const executeSearch = async (queryToRun) => {
    const query = typeof queryToRun === 'string' ? queryToRun : searchText;
    if (!query || !query.trim()) {
      setError('Please enter a search description.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.searchSemantic(query.trim(), topK);
      setResults(res);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Semantic search failed.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (sug) => {
    setSearchText(sug);
    executeSearch(sug);
  };

  const handleAddAllToFavorites = () => {
    if (!results || !results.results || results.results.length === 0) return;
    const added = addMultipleFavorites(results.results);
    setAddedNotice(`Added ${added} matching photo${added === 1 ? '' : 's'} to favorites!`);
    setTimeout(() => setAddedNotice(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search Input Panel */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Search size={22} color="var(--accent-cyan)" /> Semantic Text Search
            </h2>
            <p className="panel-subtitle">
              Retrieve photos using natural language concepts via Jina CLIP v2 multimodal embeddings
            </p>
          </div>
        </div>

        {/* Text Input with Enter submission */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch();
          }}
        >
          <div className="form-group">
            <label className="form-label">
              <span>Natural Language Prompt</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 'friends smiling at camera', 'person taking selfie', 'outdoor event'..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ fontSize: '1rem', padding: '14px 18px' }}
              />
            </div>
          </div>

          {/* Prompt Suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '10px 0 20px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={12} /> Suggestions:
            </span>
            {suggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '14px' }}
                onClick={() => handleSuggestionClick(sug)}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Top K Slider */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} /> Maximum Matches (Top K)
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

          {/* Search Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !searchText.trim()}
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Computing Neural Match...</span>
                </>
              ) : (
                <>
                  <Search size={16} />
                  <span>Search Moments</span>
                </>
              )}
            </button>
          </div>
        </form>

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
      {results && results.status && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={20} color="var(--accent-emerald)" />
                <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Returned {results.count} results for "{results.query}"
                </span>
                <span className="brand-badge">Jina CLIP v2</span>
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

          {results.results.length === 0 ? (
            <div className="empty-state">
              <Search className="empty-icon" />
              <h3 style={{ color: 'var(--text-primary)' }}>No Matching Photos</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Try broadening your query description.</p>
            </div>
          ) : (
            <div className="gallery-grid">
              {results.results.map((match, idx) => (
                <PhotoCard
                  key={match.photo_path || idx}
                  photo={match}
                  onOpenModal={onOpenModal}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

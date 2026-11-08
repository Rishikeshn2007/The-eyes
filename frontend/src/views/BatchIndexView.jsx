import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Layers,
  RefreshCw,
  CheckCircle,
  XCircle,
  ScanFace,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Inbox,
  FolderInput,
} from 'lucide-react';

const API_BASE = '/api';

export const BatchIndexView = () => {
  /* ── Shared state ── */
  const [mode, setMode] = useState('folder'); // 'folder' | 'upload'

  /* ── Folder Path mode ── */
  const [folderPath, setFolderPath] = useState('');

  /* ── File Upload mode ── */
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  /* ── Shared result state ── */
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedErrors, setExpandedErrors] = useState(false);

  /* ── Live Progress state ── */
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    currentFile: '',
    facesFound: 0,
    percent: 0,
  });
  const [liveItems, setLiveItems] = useState([]);

  /* ───────────────── Folder path submit ───────────────── */
  const handleFolderSubmit = async () => {
    const path = folderPath.trim();
    if (!path) {
      setError('Please enter a valid folder path.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setLiveItems([]);
    setProgress({
      current: 0,
      total: 0,
      currentFile: 'Scanning folder for images...',
      facesFound: 0,
      percent: 0,
    });

    try {
      const res = await fetch(`${API_BASE}/batch-index-folder-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: path }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }

      // Check for stream reader support
      if (!res.body || !res.body.getReader) {
        // Fallback to static batch-index-folder
        const fallbackRes = await fetch(`${API_BASE}/batch-index-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder_path: path }),
        });
        const fallbackData = await fallbackRes.json();
        if (!fallbackRes.ok) throw new Error(fallbackData.detail || `HTTP ${fallbackRes.status}`);
        setResult(fallbackData);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let finalResult = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'init') {
              setProgress((p) => ({
                ...p,
                total: event.total_found,
                currentFile: event.total_found === 0 ? 'No images found' : 'Initializing models...',
                percent: 0,
              }));
            } else if (event.type === 'progress') {
              const pct = event.total > 0 ? Math.round((event.current / event.total) * 100) : 0;
              setProgress({
                current: event.current,
                total: event.total,
                currentFile: event.filename,
                facesFound: event.total_faces || 0,
                percent: pct,
              });
              if (event.item) {
                setLiveItems((prev) => [event.item, ...prev].slice(0, 6));
              }
            } else if (event.type === 'complete') {
              finalResult = event;
              setProgress((p) => ({
                ...p,
                current: event.total_found,
                total: event.total_found,
                currentFile: 'Indexing complete!',
                percent: 100,
              }));
            } else if (event.type === 'error') {
              throw new Error(event.error || 'Folder indexing failed.');
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) {
              throw e;
            }
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.trim().slice(6));
          if (event.type === 'complete') finalResult = event;
          else if (event.type === 'error') throw new Error(event.error);
        } catch (e) {
          // ignore trailing
        }
      }

      if (finalResult) {
        setResult(finalResult);
      } else {
        throw new Error('Completed without final result summary.');
      }
    } catch (err) {
      setError(err.message || 'Batch indexing from folder failed.');
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────── Multi-file upload submit ───────────────── */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    setSelectedFiles(files);
    setError(null);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image file to index.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setLiveItems([]);

    const total = selectedFiles.length;
    setProgress({
      current: 0,
      total,
      currentFile: selectedFiles[0].name,
      facesFound: 0,
      percent: 0,
    });

    const processedList = [];
    let successCount = 0;
    let totalFaces = 0;

    try {
      for (let i = 0; i < total; i++) {
        const file = selectedFiles[i];
        setProgress({
          current: i,
          total,
          currentFile: file.name,
          facesFound: totalFaces,
          percent: Math.round((i / total) * 100),
        });

        const formData = new FormData();
        formData.append('files', file, file.name);

        const res = await fetch(`${API_BASE}/batch-upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const failureItem = {
            success: false,
            filename: file.name,
            error: errData.detail || `HTTP ${res.status}`,
          };
          processedList.push(failureItem);
          setLiveItems((prev) => [failureItem, ...prev].slice(0, 6));
        } else {
          const data = await res.json();
          if (data.processed && data.processed.length > 0) {
            for (const item of data.processed) {
              processedList.push(item);
              if (item.success) {
                successCount += 1;
                totalFaces += item.faces_detected || 0;
              }
              setLiveItems((prev) => [item, ...prev].slice(0, 6));
            }
          }
        }

        setProgress({
          current: i + 1,
          total,
          currentFile: file.name,
          facesFound: totalFaces,
          percent: Math.round(((i + 1) / total) * 100),
        });
      }

      setResult({
        status: true,
        folder_path: 'Direct Multi-File Upload',
        total_found: total,
        total_processed: successCount,
        total_faces: totalFaces,
        processed: processedList,
      });
      setSelectedFiles([]);
    } catch (err) {
      setError(err.message || 'Batch upload indexing failed.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Helpers ── */
  const successItems = result?.processed?.filter((p) => p.success) ?? [];
  const failedItems = result?.processed?.filter((p) => !p.success) ?? [];

  const bytesLabel = (n) =>
    n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;

  const totalFilesSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Header ── */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Layers size={22} color="var(--accent-cyan)" /> Batch Image Indexer
            </h2>
            <p className="panel-subtitle">
              Convert multiple images into vector embeddings in one shot — extracts faces, generates CLIP embeddings, and stores paths in the database
            </p>
          </div>
        </div>

        {/* ── Mode Switcher ── */}
        <div className="toggle-tab-group" style={{ marginBottom: '24px' }}>
          <button
            type="button"
            className={`toggle-tab ${mode === 'folder' ? 'active' : ''}`}
            onClick={() => { setMode('folder'); setResult(null); setError(null); }}
          >
            <FolderInput size={15} />
            <span>Source Folder Path</span>
          </button>
          <button
            type="button"
            className={`toggle-tab ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => { setMode('upload'); setResult(null); setError(null); }}
          >
            <Upload size={15} />
            <span>Direct File Upload</span>
          </button>
        </div>

        {/* ════════ FOLDER MODE ════════ */}
        {mode === 'folder' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FolderOpen size={14} /> Source Image Folder Path
                </span>
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. C:\Users\You\Pictures\events  or  /home/user/photos"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleFolderSubmit()}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleFolderSubmit}
                  disabled={loading || !folderPath.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {loading ? (
                    <><RefreshCw size={15} className="animate-spin" /> Processing...</>
                  ) : (
                    <><Layers size={15} /> Start Indexing</>
                  )}
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                The backend will scan this directory for all <code style={{ background: 'var(--bg-surface)', padding: '1px 5px', borderRadius: '3px' }}>JPG PNG WEBP</code> files and convert them to embeddings.
                Existing indexed images are safely re-indexed (upsert).
              </p>
            </div>
          </div>
        )}

        {/* ════════ UPLOAD MODE ════════ */}
        {mode === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Drop Zone */}
            <div
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <Upload style={{ width: '44px', height: '44px', color: 'var(--accent-cyan)' }} />
              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Click or Drag & Drop Multiple Images
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Supports JPG, PNG, WEBP — select as many as you need
                </p>
              </div>
            </div>

            {/* Selected file list */}
            {selectedFiles.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                }}
              >
                {/* List header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Inbox size={16} color="var(--accent-cyan)" />
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected &bull;{' '}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {bytesLabel(totalFilesSize)} total
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setSelectedFiles([])}
                  >
                    Clear All
                  </button>
                </div>

                {/* Scrollable file list */}
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {selectedFiles.map((file, idx) => {
                    const ext = file.name.split('.').pop().toUpperCase();
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 16px',
                          borderBottom: idx < selectedFiles.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            background: 'rgba(56,189,248,0.1)',
                            border: '1px solid rgba(56,189,248,0.25)',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6rem',
                            fontWeight: '700',
                            color: 'var(--accent-cyan)',
                          }}
                        >
                          {ext}
                        </div>
                        <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {bytesLabel(file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                          title="Remove file"
                        >
                          <XCircle size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload submit button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUploadSubmit}
                disabled={loading || selectedFiles.length === 0}
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                {loading ? (
                  <><RefreshCw size={16} className="animate-spin" /> Indexing {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}...</>
                ) : (
                  <><Layers size={16} /> Index {selectedFiles.length || ''} Image{selectedFiles.length !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.3)',
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

      {/* ── Active Progress Panel ── */}
      {loading && (
        <div
          className="panel"
          style={{
            padding: '30px 28px',
            border: '1px solid var(--border-active)',
            boxShadow: 'var(--shadow-glow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Header & Status Counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <RefreshCw size={22} color="var(--accent-cyan)" className="animate-spin" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Indexing in Progress…
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Extracting biometric faces and computing neural CLIP embeddings
                </p>
              </div>
            </div>

            {/* Live Count Pill (e.g. Processed 3 / 10 images) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 16px',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: 'var(--accent-cyan)',
                  letterSpacing: '0.02em',
                }}
              >
                Processed {progress.current} / {progress.total || '?'} images
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  background: 'rgba(56,189,248,0.08)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(56,189,248,0.2)',
                }}
              >
                {progress.percent}%
              </span>
            </div>
          </div>

          {/* Progress Bar & Details */}
          <div>
            <div className="progress-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.max(progress.percent, 3)}%` }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '10px',
                fontSize: '0.82rem',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', overflow: 'hidden' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Current image:</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-cyan)',
                    background: 'var(--bg-surface)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    maxWidth: '380px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={progress.currentFile}
                >
                  {progress.currentFile || 'Initializing indexing pipeline…'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-muted)' }}>
                {progress.facesFound > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#a78bfa', fontWeight: '600' }}>
                    <ScanFace size={14} /> {progress.facesFound} face{progress.facesFound !== 1 ? 's' : ''} extracted
                  </span>
                )}
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {progress.current} of {progress.total || '?'} complete
                </span>
              </div>
            </div>
          </div>

          {/* Real-time mini stream of finished files */}
          {liveItems.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Live Processing Feed
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {liveItems.map((item, idx) => (
                  <div key={idx} className="live-feed-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {item.success ? (
                        <CheckCircle size={15} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                      ) : (
                        <XCircle size={15} color="var(--accent-rose)" style={{ flexShrink: 0 }} />
                      )}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename}
                      </span>
                    </div>
                    {item.success ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>
                        {item.faces_detected ?? 0} face{(item.faces_detected ?? 0) !== 1 ? 's' : ''} detected
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', flexShrink: 0 }}>
                        {item.error || 'Failed'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Results Panel ── */}
      {!loading && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Summary Stats */}
          <div
            className="panel"
            style={{ padding: '20px 24px' }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={20} color="var(--accent-emerald)" />
              Indexing Complete
              {result.folder_path && result.folder_path !== 'Direct Multi-File Upload' && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-surface)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    maxWidth: '500px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={result.folder_path}
                >
                  {result.folder_path}
                </span>
              )}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                { label: 'Images Found', value: result.total_found, color: 'var(--accent-cyan)' },
                { label: 'Successfully Indexed', value: result.total_processed, color: 'var(--accent-emerald)' },
                { label: 'Faces Extracted', value: result.total_faces, color: '#a78bfa' },
                { label: 'Failed', value: failedItems.length, color: failedItems.length > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.75rem', fontWeight: '800', color: stat.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '5px' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {result.message && (
              <p style={{ marginTop: '14px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {result.message}
              </p>
            )}
          </div>

          {/* Processed Items Table */}
          {successItems.length > 0 && (
            <div className="panel" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="var(--accent-emerald)" />
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Successfully Indexed ({successItems.length})
                </span>
              </div>
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {successItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 20px',
                      borderBottom: idx < successItems.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Thumbnail */}
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.filename}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '48px', height: '48px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layers size={18} color="var(--text-muted)" />
                      </div>
                    )}

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.photo_path}
                      </div>
                    </div>

                    {/* Face Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '12px', padding: '3px 10px', whiteSpace: 'nowrap' }}>
                      <ScanFace size={13} color="#c4b5fd" />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '700', color: '#c4b5fd' }}>
                        {item.faces_detected} face{item.faces_detected !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <CheckCircle size={16} color="var(--accent-emerald)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed items (collapsible) */}
          {failedItems.length > 0 && (
            <div
              className="panel"
              style={{
                padding: '0',
                overflow: 'hidden',
                borderColor: 'rgba(244,63,94,0.3)',
                background: 'rgba(244,63,94,0.04)',
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedErrors((prev) => !prev)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#f87171',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  textAlign: 'left',
                }}
              >
                <XCircle size={16} />
                <span>Failed ({failedItems.length})</span>
                <span style={{ marginLeft: 'auto' }}>
                  {expandedErrors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {expandedErrors && (
                <div style={{ borderTop: '1px solid rgba(244,63,94,0.2)' }}>
                  {failedItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '10px 20px',
                        borderBottom: idx < failedItems.length - 1 ? '1px solid rgba(244,63,94,0.15)' : 'none',
                      }}
                    >
                      <XCircle size={15} color="#f87171" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f87171' }}>{item.filename}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{item.error}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

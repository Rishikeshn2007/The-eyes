import React from 'react';
import { NmapEyeLogo } from '../components/NmapEyeLogo';
import {
  ScanFace,
  Search,
  Sparkles,
  Grid,
  Heart,
  ShieldCheck,
  Cpu,
  Database,
  ArrowRight,
  ExternalLink,
  Zap,
  Layers,
} from 'lucide-react';

export const HomeView = ({ onNavigate }) => {
  const features = [
    {
      id: 'gallery',
      icon: Grid,
      title: 'Gallery Index',
      desc: 'Browse all indexed group and individual photos with detected facial boundary counts and direct high-resolution previews.',
      tag: '01 Gallery',
    },
    {
      id: 'face',
      icon: ScanFace,
      title: 'Biometric Face Search',
      desc: 'Upload an existing reference photo or capture a live selfie. InsightFace (buffalo_l) detects and matches identities via 512-D cosine similarity.',
      tag: '02 Biometrics',
    },
    {
      id: 'semantic',
      icon: Search,
      title: 'Semantic Text Search',
      desc: 'Query photos using natural language concepts like "friends smiling on stage" using Jina CLIP v2 multimodal neural embeddings.',
      tag: '03 Neural NLP',
    },
    {
      id: 'hybrid',
      icon: Sparkles,
      title: 'Hybrid Fusion Search',
      desc: 'Combines face identity verification with situational scene context. Locate a specific person performing an activity.',
      tag: '04 Multi-Modal',
    },
    {
      id: 'batch',
      icon: Layers,
      title: 'Batch Image Indexer',
      desc: 'Point to any local folder or upload multiple images at once to extract faces, compute CLIP embeddings, and store everything in the database in one shot.',
      tag: '05 Ingestion',
    },
  ];

  const techSpecs = [
    { label: 'Face Recognition', value: 'InsightFace (buffalo_l)', icon: ScanFace },
    { label: 'Multimodal Vision', value: 'Jina CLIP v2 Transformer', icon: Cpu },
    { label: 'Vector & Metadata', value: 'SQLite3 Embedded Database', icon: Database },
    { label: 'API Backend', value: 'FastAPI + Uvicorn Async', icon: Zap },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      {/* Hero Section with Nmap Tactical Aesthetics */}
      <section
        className="panel radar-grid-bg"
        style={{
          padding: '60px 32px',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          border: '1px solid var(--border-active)',
          boxShadow: 'var(--shadow-glow)',
          position: 'relative',
        }}
      >
        <div
          style={{
            maxWidth: '820px',
            margin: '0 auto',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 16px',
              borderRadius: '24px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--accent-cyan)',
            }}
          >
            <NmapEyeLogo size={20} />
            <span>THE-EYES &bull; NMAP SECURITY COLORWAY</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              fontWeight: '800',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #ffffff 30%, #93c5fd 70%, var(--accent-cyan) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Search Millions of Moments in Seconds.
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: 'var(--text-secondary)',
              maxWidth: '680px',
              lineHeight: 1.6,
            }}
          >
            A high-performance local AI image search engine. Pinpoint target individuals through
            facial biometrics or discover moments through natural language scene descriptions.
          </p>

          {/* Quick Action Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              marginTop: '10px',
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('face')}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <ScanFace size={18} /> Face Search
            </button>
            <button
              type="button"
              className="btn btn-outline-cyan"
              onClick={() => onNavigate('hybrid')}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Sparkles size={18} /> Hybrid Fusion
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('gallery')}
              style={{ padding: '12px 20px', fontSize: '0.95rem' }}
            >
              <Grid size={18} /> View All Photos
            </button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Retrieval Capabilities
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Choose how you explore and query indexed photographic collections
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '20px',
          }}
        >
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="panel"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onClick={() => onNavigate(feat.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <span className="brand-badge">{feat.tag}</span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      marginBottom: '8px',
                    }}
                  >
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {feat.desc}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginTop: '20px',
                  }}
                >
                  <span>Launch Module</span>
                  <ArrowRight size={15} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tech Specifications */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">
              <Cpu size={20} color="var(--accent-cyan)" /> Under the Hood Architecture
            </h3>
            <p className="panel-subtitle">State-of-the-art computer vision models and local vector indexing</p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {techSpecs.map((spec, i) => {
            const Icon = spec.icon;
            return (
              <div
                key={i}
                style={{
                  background: 'var(--bg-surface)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(37, 99, 235, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {spec.label}
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {spec.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

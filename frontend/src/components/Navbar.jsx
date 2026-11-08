import React, { useState, useEffect } from 'react';
import { NmapEyeLogo } from './NmapEyeLogo';
import {
  Home,
  Grid,
  ScanFace,
  Search,
  Sparkles,
  Heart,
  Layers,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { api } from '../services/api';

export const Navbar = ({ currentTab, onSelectTab }) => {
  const { count: favCount } = useFavorites();
  const [isOnline, setIsOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkServer = async () => {
      const res = await api.getHealth();
      if (mounted) {
        setIsOnline(Boolean(res && res.status && res.running));
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'gallery', label: 'All Photos', icon: Grid },
    { id: 'face', label: 'Face Search', icon: ScanFace },
    { id: 'semantic', label: 'Semantic Search', icon: Search },
    { id: 'hybrid', label: 'Hybrid Search', icon: Sparkles },
    { id: 'batch', label: 'Batch Index', icon: Layers },
    { id: 'favorites', label: 'Favorites', icon: Heart, badge: favCount },
  ];

  const handleNavClick = (id) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="brand-wrapper" onClick={() => handleNavClick('home')}>
          <NmapEyeLogo size={36} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-title">The-Eyes</span>
              <span className="brand-badge">Nmap Style</span>
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Neural Multimodal Retrieval
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="fav-count-pill">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Health Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            className="health-indicator"
            title={isOnline ? 'FastAPI Backend Online' : 'Backend Server Offline / Degraded'}
          >
            <div className={`health-dot ${isOnline ? 'online' : ''}`} />
            <span>{isOnline ? 'SYS ONLINE' : 'SYS OFFLINE'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

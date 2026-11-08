import React, { useState } from 'react';
import { FavoritesProvider } from './context/FavoritesContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PhotoModal } from './components/PhotoModal';

import { HomeView } from './views/HomeView';
import { GalleryView } from './views/GalleryView';
import { FaceSearchView } from './views/FaceSearchView';
import { SemanticSearchView } from './views/SemanticSearchView';
import { HybridSearchView } from './views/HybridSearchView';
import { FavoritesView } from './views/FavoritesView';
import { BatchIndexView } from './views/BatchIndexView';

export function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [modalPhoto, setModalPhoto] = useState(null);

  const renderActiveView = () => {
    switch (currentTab) {
      case 'home':
        return <HomeView onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'gallery':
        return <GalleryView onOpenModal={(photo) => setModalPhoto(photo)} />;
      case 'face':
        return <FaceSearchView onOpenModal={(photo) => setModalPhoto(photo)} />;
      case 'semantic':
        return <SemanticSearchView onOpenModal={(photo) => setModalPhoto(photo)} />;
      case 'hybrid':
        return <HybridSearchView onOpenModal={(photo) => setModalPhoto(photo)} />;
      case 'favorites':
        return (
          <FavoritesView
            onOpenModal={(photo) => setModalPhoto(photo)}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        );
      case 'batch':
        return <BatchIndexView />;
      default:
        return <HomeView onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <FavoritesProvider>
      <div className="app-container">
        <Navbar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />

        <main className="main-content">
          {renderActiveView()}
        </main>

        <Footer />

        {modalPhoto && (
          <PhotoModal
            photo={modalPhoto}
            onClose={() => setModalPhoto(null)}
          />
        )}
      </div>
    </FavoritesProvider>
  );
}
export default App;

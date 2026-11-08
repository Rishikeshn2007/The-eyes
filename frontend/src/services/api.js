const API_BASE = '/api';

export const resolveImageUrl = (photoPathOrUrl) => {
  if (!photoPathOrUrl) return '';
  if (photoPathOrUrl.startsWith('http://') || photoPathOrUrl.startsWith('https://')) {
    return photoPathOrUrl;
  }
  if (photoPathOrUrl.startsWith('/images/') || photoPathOrUrl.startsWith('/faces/')) {
    return photoPathOrUrl;
  }
  // Extract filename from path like "../processed/images/group-1.jpeg"
  const cleanPath = photoPathOrUrl.replace(/\\/g, '/');
  const filename = cleanPath.split('/').pop();
  return `/images/${filename}`;
};

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return { status: false, running: false, error: err.message };
    }
  },

  async getAllPhotos() {
    const res = await fetch(`${API_BASE}/photos`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch photos');
    }
    return await res.json();
  },

  async searchFace(imageBlobOrFile, threshold = 0.4) {
    const formData = new FormData();
    const filename = imageBlobOrFile.name || 'query_face.jpg';
    formData.append('file', imageBlobOrFile, filename);
    formData.append('threshold', threshold.toString());

    const res = await fetch(`${API_BASE}/face-search`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Search failed with HTTP ${res.status}`);
    }
    return data;
  },

  async searchSemantic(text, top_k = 5) {
    const res = await fetch(`${API_BASE}/semantic-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        top_k: parseInt(top_k, 10),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Semantic search failed with HTTP ${res.status}`);
    }
    return data;
  },

  async searchHybrid(imageBlobOrFile, text, threshold = 0.4, top_k = 5) {
    const formData = new FormData();
    const filename = imageBlobOrFile.name || 'query_hybrid.jpg';
    formData.append('file', imageBlobOrFile, filename);
    formData.append('text', text);
    formData.append('threshold', threshold.toString());
    formData.append('top_k', top_k.toString());

    const res = await fetch(`${API_BASE}/hybrid-search`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || `Hybrid search failed with HTTP ${res.status}`);
    }
    return data;
  },
};

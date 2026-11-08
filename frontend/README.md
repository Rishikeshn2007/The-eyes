# The-Eyes Frontend

A React.js application for **The-Eyes** photo retrieval engine, built with a modern dark blue interface.

## Features

1. **Overview / Home**: Interactive introduction to the system with neural visual aesthetics, tech stack breakdown, and developer card.
2. **All Photos Gallery**: View all indexed photos with face count badges, search filtering by filename, and one-click "Add All to Favorites".
3. **Biometric Face Search**: Upload an existing reference photo or capture a live webcam selfie with a face alignment reticle. Configurable similarity threshold slider (0.10 to 0.90) and ranked gallery results with match scores.
4. **Semantic Search**: Text prompt search powered by Jina CLIP v2 multimodal neural embeddings with prompt suggestions and top-k slider.
5. **Hybrid Fusion Search**: Combines face recognition filtering with natural language scene descriptions.
6. **Favorites Collection**: Saved photos persisted across sessions in `localStorage` with batch additions and single-photo toggling.
7. **System Health Indicator**: Live heartbeat monitor tracking backend connectivity.

## Developer

- **Name**: Rishikesh N
- **Email**: [rishikeshn663@gmail.com](mailto:rishikeshn663@gmail.com)
- **GitHub**: [Rishikeshn2007](https://github.com/Rishikeshn2007)

## Getting Started

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Development Server

Ensure your FastAPI backend is running on `http://127.0.0.1:8000`:

```bash
npm run dev
```

The frontend will run at `http://localhost:5173` and automatically proxies `/api` and `/images` requests to the FastAPI backend.

### 3. Build for Production

```bash
npm run build
```

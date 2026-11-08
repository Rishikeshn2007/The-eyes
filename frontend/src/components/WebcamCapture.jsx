import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, AlertCircle, X } from 'lucide-react';

export const WebcamCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState(null);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCamera(false);
      setCameraError(err.message || 'Unable to access camera. Please check browser permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const takeSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    // Mirror the selfie horizontally for natural selfie appearance
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedBlob(file);
        setCapturedPreview(URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.95
    );
  };

  const retakeSelfie = () => {
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedBlob(null);
    setCapturedPreview(null);
  };

  const confirmSelfie = () => {
    if (capturedBlob && onCapture) {
      stopCamera();
      onCapture(capturedBlob, capturedPreview);
    }
  };

  return (
    <div className="panel" style={{ marginTop: '16px', background: '#07101f', border: '1px solid var(--border-active)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: '700' }}>
          <Camera size={18} />
          <span>Live Selfie Camera</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {cameraError ? (
        <div
          style={{
            padding: '24px',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            color: '#f87171',
          }}
        >
          <AlertCircle size={32} style={{ margin: '0 auto 10px' }} />
          <p style={{ fontWeight: '600' }}>Camera Error</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{cameraError}</p>
          <button type="button" className="btn btn-secondary" onClick={startCamera} style={{ marginTop: '14px' }}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      ) : capturedPreview ? (
        <div style={{ textAlign: 'center' }}>
          <div className="webcam-box" style={{ maxWidth: '420px', aspectRatio: '4/3' }}>
            <img
              src={capturedPreview}
              alt="Selfie Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '12px 0 16px' }}>
            Review your captured selfie. Ensure your face is centered and clearly lit.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={retakeSelfie}>
              <RefreshCw size={15} /> Retake
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmSelfie}>
              <Check size={15} /> Use This Selfie
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div className="webcam-box">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="webcam-video"
            />
            <div className="webcam-overlay">
              <div className="face-target-reticle" />
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-primary" onClick={takeSelfie} style={{ padding: '10px 24px' }}>
              <Camera size={18} /> Take Selfie Snapshot
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

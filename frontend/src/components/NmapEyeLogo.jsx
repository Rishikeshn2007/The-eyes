import React from 'react';

export const NmapEyeLogo = ({ size = 36, animated = true, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ verticalAlign: 'middle' }}
    >
      <defs>
        <radialGradient id="nmap-outer-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#0284c7" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0a192f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="nmap-iris-glow" cx="45%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#082f49" />
        </radialGradient>
        <linearGradient id="nmap-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Background Glow */}
      <circle cx="60" cy="60" r="56" fill="url(#nmap-outer-glow)" />

      {/* Outer Ring */}
      <circle
        cx="60"
        cy="60"
        r="52"
        stroke="url(#nmap-ring-grad)"
        strokeWidth="2.5"
        strokeDasharray="6 3 2 3"
        opacity="0.8"
      />

      {/* Eye Outline - Outer contour */}
      <path
        d="M 12,60 Q 60,18 108,60 Q 60,102 12,60 Z"
        fill="#071224"
        stroke="#38bdf8"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />

      {/* Internal Radar Grid Arcs */}
      <ellipse
        cx="60"
        cy="60"
        rx="36"
        ry="22"
        fill="none"
        stroke="#0369a1"
        strokeWidth="1.2"
        strokeDasharray="4 2"
      />
      <ellipse
        cx="60"
        cy="60"
        rx="26"
        ry="15"
        fill="none"
        stroke="#0284c7"
        strokeWidth="1"
      />

      {/* Concentric Coordinate Lines */}
      <line x1="20" y1="60" x2="100" y2="60" stroke="#0ea5e9" strokeWidth="0.8" opacity="0.5" />
      <line x1="60" y1="28" x2="60" y2="92" stroke="#0ea5e9" strokeWidth="0.8" opacity="0.5" />

      {/* Glowing Iris */}
      <circle
        cx="60"
        cy="60"
        r="18"
        fill="url(#nmap-iris-glow)"
        stroke="#38bdf8"
        strokeWidth="1.8"
      />

      {/* Center Pupil */}
      <circle cx="60" cy="60" r="8" fill="#040b17" stroke="#38bdf8" strokeWidth="1" />
      <circle cx="60" cy="60" r="4" fill="#38bdf8" />
      
      {/* Specular Light Reflection */}
      <circle cx="56" cy="54" r="3" fill="#ffffff" opacity="0.9" />

      {/* Scanner Crosshairs */}
      <path
        d="M 50,60 L 45,60 M 70,60 L 75,60 M 60,50 L 60,45 M 60,70 L 60,75"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

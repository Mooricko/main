import React from 'react';

interface KhoroosLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'mark' | 'full';
  monochrome?: boolean;
}

export const KhoroosLogo: React.FC<KhoroosLogoProps> = ({
  className = 'w-9 h-9',
  size,
  variant = 'mark',
  monochrome = false,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  if (variant === 'full') {
    return (
      <svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-label="Khoroos Reader"
      >
        {/* Rooster Head Silhouette */}
        <path
          d="M130 190
             H85 V205
             H130 V275
             H85 V290
             H130 V340
             C150 380 185 400 210 340
             C230 400 270 400 290 340
             C310 390 350 380 405 380
             C350 300 300 250 250 190
             H330
             C380 160 410 120 405 55
             C385 75 375 90 365 105
             C350 75 330 60 315 55
             C300 80 295 95 285 105
             C270 75 250 60 235 55
             C220 80 215 95 205 105
             C190 75 170 60 155 55
             C145 95 135 140 130 190 Z"
          fill="currentColor"
        />

        {/* Signature Red Dot at Beak Opening */}
        <circle
          cx="100"
          cy="240"
          r="22"
          fill={monochrome ? 'currentColor' : '#EF4444'}
        />

        {/* Iconic White Eye Ring */}
        <circle cx="185" cy="240" r="34" fill="white" />
        <circle cx="185" cy="240" r="17" fill="black" />

        {/* Wordmark KHOROOS */}
        <text
          x="250"
          y="450"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="44"
          letterSpacing="6"
        >
          KHOROOS
        </text>
      </svg>
    );
  }

  // Compact Rooster Mark for Header Badge
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="Khoroos Logo"
    >
      {/* Rooster Silhouette */}
      <path
        d="M130 190
           H85 V205
           H130 V275
           H85 V290
           H130 V340
           C150 380 185 400 210 340
           C230 400 270 400 290 340
           C310 390 350 380 405 380
           C350 300 300 250 250 190
           H330
           C380 160 410 120 405 55
           C385 75 375 90 365 105
           C350 75 330 60 315 55
           C300 80 295 95 285 105
           C270 75 250 60 235 55
           C220 80 215 95 205 105
           C190 75 170 60 155 55
           C145 95 135 140 130 190 Z"
        fill="currentColor"
      />

      {/* Signature Red Dot at Beak Opening */}
      <circle
        cx="100"
        cy="240"
        r="22"
        fill={monochrome ? 'currentColor' : '#EF4444'}
      />

      {/* Eye Ring */}
      <circle cx="185" cy="240" r="34" fill="white" />
      <circle cx="185" cy="240" r="17" fill="black" />
    </svg>
  );
};

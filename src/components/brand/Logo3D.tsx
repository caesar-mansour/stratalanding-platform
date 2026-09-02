'use client';

import { motion } from 'framer-motion';

interface Logo3DProps {
  size?: number;
  className?: string;
  /** How far apart layers are spread in Z-axis (px) */
  depth?: number;
  /** Tilt angle in degrees — how "tilted" the 3D view is */
  tilt?: number;
  /** Color of the logo layers */
  color?: string;
  /** Enable floating animation */
  animate?: boolean;
}

const LOGO_COLOR = '#0B1B3A';

export default function Logo3D({
  size = 64,
  className = '',
  depth = 12,
  tilt = 18,
  color = LOGO_COLOR,
  animate = true,
}: Logo3DProps) {
  // Scale factor from base size (64)
  const scale = size / 64;
  const containerW = 48 * scale;
  const containerH = 56 * scale;

  // Each layer's Z offset (bottom=0, middle=1x, top=2x depth)
  const layers = [
    {
      key: 'bottom',
      d: 'M4 36.5 L24 48.5 L44 36.5 L44 42 L24 54 L4 42 Z',
      z: 0,
      floatDelay: 0,
      floatAmount: 1,
      shadow: 0.08,
    },
    {
      key: 'middle',
      d: 'M4 25.5 L24 37.5 L44 25.5 L44 31 L24 43 L4 31 Z',
      z: depth,
      floatDelay: 0.3,
      floatAmount: 1.5,
      shadow: 0.12,
    },
    {
      key: 'top',
      d: 'M24 2 L44 15 L24 28 L4 15 Z M24 9 L35 15 L24 21 L13 15 Z',
      z: depth * 2,
      floatDelay: 0.6,
      floatAmount: 2,
      shadow: 0.15,
    },
  ];

  return (
    <div
      className={className}
      style={{
        width: containerW,
        height: containerH + depth * 2.5,
        perspective: `${size * 6}px`,
        perspectiveOrigin: '50% 40%',
      }}
    >
      <motion.div
        style={{
          width: containerW,
          height: containerH,
          position: 'relative',
          transformStyle: 'preserve-3d',
          rotateX: tilt,
        }}
        animate={animate ? {
          rotateY: [0, 3, 0, -3, 0],
        } : undefined}
        transition={animate ? {
          duration: 8,
          ease: 'easeInOut',
        } : undefined}
      >
        {layers.map((layer) => (
          <motion.div
            key={layer.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              transformStyle: 'preserve-3d',
              transform: `translateZ(${layer.z}px)`,
            }}
            animate={animate ? {
              y: [0, -layer.floatAmount * scale, 0],
            } : undefined}
            transition={animate ? {
              duration: 2.8 + layer.floatDelay,
              ease: 'easeInOut',
              delay: layer.floatDelay,
            } : undefined}
          >
            {/* Shadow underneath each layer */}
            <svg
              viewBox="0 0 48 56"
              width={containerW}
              height={containerH}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                filter: `blur(${3 * scale}px)`,
                opacity: layer.shadow,
                transform: `translateZ(-1px) translateY(${2 * scale}px)`,
              }}
            >
              <path d={layer.d} fill="#000" />
            </svg>
            {/* Actual layer */}
            <svg
              viewBox="0 0 48 56"
              width={containerW}
              height={containerH}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              <path
                d={layer.d}
                fill={color}
                fillRule={layer.key === 'top' ? 'evenodd' : undefined}
              />
            </svg>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

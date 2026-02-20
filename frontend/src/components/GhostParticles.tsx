'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function GhostParticles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate particles once on mount
  const particles = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Grid pattern */}
      <div className="absolute inset-0 ghost-grid opacity-30" />
      
      {/* Central glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-phantom-glow opacity-40" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[400px] bg-phantom-glow opacity-20" />
      
      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: `radial-gradient(circle, ${
              particle.id % 3 === 0 
                ? 'rgba(168, 85, 247, 0.8)' 
                : particle.id % 3 === 1
                  ? 'rgba(56, 189, 248, 0.8)'
                  : 'rgba(192, 132, 252, 0.8)'
            } 0%, transparent 70%)`,
            opacity: particle.opacity,
            animation: `particleDrift ${particle.duration}s linear infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* Ethereal lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <defs>
          <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        
        {/* Diagonal lines */}
        <line x1="0" y1="30%" x2="100%" y2="70%" stroke="url(#lineGrad1)" strokeWidth="1" />
        <line x1="0" y1="60%" x2="100%" y2="20%" stroke="url(#lineGrad2)" strokeWidth="1" />
        <line x1="20%" y1="0" x2="80%" y2="100%" stroke="url(#lineGrad1)" strokeWidth="0.5" />
      </svg>

      {/* Noise texture */}
      <div className="noise-overlay" />
    </div>
  );
}

// Animated orbs for specific sections
export function GhostOrb({ 
  size = 200, 
  color = 'phantom',
  className = '' 
}: { 
  size?: number; 
  color?: 'phantom' | 'ghost' | 'mixed';
  className?: string;
}) {
  const gradientColors = {
    phantom: 'from-phantom-500/30 to-phantom-700/10',
    ghost: 'from-ghost-500/30 to-ghost-700/10',
    mixed: 'from-phantom-500/20 via-ghost-500/20 to-phantom-700/10',
  };

  return (
    <div 
      className={`absolute rounded-full blur-3xl animate-ghost-float ${className}`}
      style={{ width: size, height: size }}
    >
      <div className={`w-full h-full rounded-full bg-gradient-to-br ${gradientColors[color]}`} />
    </div>
  );
}

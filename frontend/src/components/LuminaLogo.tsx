'use client';

import React from 'react';

interface LuminaLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textColor?: string;
}

export function LuminaLogo({
  size = 40,
  className = '',
  showText = false,
  textColor = 'text-white'
}: LuminaLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Handcrafted Vector SVG Logo */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Outer Ambient Glow */}
          <radialGradient id="luminaAmbientGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>

          {/* Squircle Background Base */}
          <linearGradient id="squircleBg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#151b2a" />
            <stop offset="100%" stopColor="#0a0e18" />
          </linearGradient>

          {/* Rich Cognac Leather Gradients */}
          <linearGradient id="leatherBack" x1="20" y1="35" x2="100" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8c5831" />
            <stop offset="45%" stopColor="#6d4121" />
            <stop offset="100%" stopColor="#4a2a14" />
          </linearGradient>

          <linearGradient id="leatherFront" x1="20" y1="52" x2="100" y2="102" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9e663a" />
            <stop offset="50%" stopColor="#7a4926" />
            <stop offset="100%" stopColor="#532e16" />
          </linearGradient>

          {/* Emerald Metallic Credit Card */}
          <linearGradient id="cardGrad" x1="26" y1="26" x2="94" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="40%" stopColor="#059669" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          {/* Currency Bill Gradient */}
          <linearGradient id="billGrad" x1="30" y1="18" x2="90" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Gold Chip Gradient */}
          <linearGradient id="goldChip" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Luminous Sparkle Star Gradient */}
          <linearGradient id="starGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Shadows */}
          <filter id="leatherShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Ambient Glow */}
        <circle cx="60" cy="62" r="50" fill="url(#luminaAmbientGlow)" />

        {/* Squircle Outer Container */}
        <rect
          x="4"
          y="4"
          width="112"
          height="112"
          rx="28"
          fill="url(#squircleBg)"
          stroke="#10b981"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />

        {/* INNER ARTWORK GROUP */}
        <g filter="url(#leatherShadow)">
          {/* 1. CURRENCY BILL (Peeking Out at angle) */}
          <g transform="rotate(-6 60 40)">
            <rect
              x="32"
              y="22"
              width="54"
              height="28"
              rx="4"
              fill="url(#billGrad)"
              stroke="#a7f3d0"
              strokeWidth="0.75"
              strokeOpacity="0.6"
            />
            {/* Currency design lines */}
            <circle cx="59" cy="36" r="6" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
            <line x1="38" y1="28" x2="48" y2="28" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.4" />
            <line x1="70" y1="28" x2="80" y2="28" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.4" />
          </g>

          {/* 2. METALLIC EMERALD CREDIT CARD (Peeking Out straighter) */}
          <g transform="rotate(5 62 46)">
            <rect
              x="33"
              y="28"
              width="56"
              height="36"
              rx="5"
              fill="url(#cardGrad)"
              stroke="#6ee7b7"
              strokeWidth="0.9"
              strokeOpacity="0.5"
            />
            {/* Magnetic stripe highlight / metallic sheen */}
            <path
              d="M33 34 L89 34"
              stroke="#ffffff"
              strokeOpacity="0.15"
              strokeWidth="2.5"
            />
            {/* Gold EMV Chip */}
            <rect
              x="40"
              y="40"
              width="8"
              height="6.5"
              rx="1.2"
              fill="url(#goldChip)"
              stroke="#d97706"
              strokeWidth="0.5"
            />
            {/* Contactless waves icon */}
            <path
              d="M78 41 C80 43 80 46 78 48 M81 39 C84 42 84 47 81 50"
              stroke="#ffffff"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeOpacity="0.5"
              fill="none"
            />
          </g>

          {/* 3. LEATHER WALLET - BACK FOLD */}
          <rect
            x="22"
            y="42"
            width="76"
            height="54"
            rx="12"
            fill="url(#leatherBack)"
            stroke="#b47444"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />

          {/* 4. LEATHER WALLET - FRONT MAIN BODY */}
          <path
            d="M22 56 
               C22 52, 26 49, 31 49 
               L89 49 
               C94 49, 98 52, 98 56 
               L98 84 
               C98 90, 93 95, 87 95 
               L33 95 
               C27 95, 22 90, 22 84 
               Z"
            fill="url(#leatherFront)"
            stroke="#d49561"
            strokeWidth="0.8"
            strokeOpacity="0.5"
          />

          {/* Realistic Stitching Details */}
          <path
            d="M26 56 L26 84 C26 88, 29 91, 33 91 L87 91 C91 91, 94 88, 94 84 L94 56"
            stroke="#e29b67"
            strokeWidth="0.75"
            strokeDasharray="2.2 2"
            strokeOpacity="0.6"
            fill="none"
          />

          {/* 5. LEATHER CLASP FLAP with LUMINA STAR */}
          <path
            d="M72 63 
               L96 63 
               C99 63, 102 66, 102 70 
               L102 76 
               C102 80, 99 83, 96 83 
               L72 83 
               Z"
            fill="#5c331a"
            stroke="#d49561"
            strokeWidth="0.8"
            strokeOpacity="0.6"
          />

          {/* Metallic Clasp Stud Button */}
          <circle cx="88" cy="73" r="5" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.8" />

          {/* LUMINA 4-POINT SPARKLE STAR (The Lumina Symbol) */}
          <path
            d="M88 69.5 
               Q88 73 91.5 73 
               Q88 73 88 76.5 
               Q88 73 84.5 73 
               Q88 73 88 69.5 Z"
            fill="url(#starGlow)"
          />
        </g>
      </svg>

      {/* Optional Wordmark */}
      {showText && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <span className={`font-display font-black text-xl tracking-wider ${textColor}`}>
              LUMINA
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-emerald-400/80 -mt-1">
            Smart Expense
          </span>
        </div>
      )}
    </div>
  );
}

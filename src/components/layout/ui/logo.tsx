import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradientInside" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#26bc8c" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Reducimos el radio de 16 a 15 para evitar que se corte en los bordes por el antialiasing del navegador */}
      <circle cx="16" cy="16" r="15" fill="url(#logoGradientInside)" />
      <path
        d="M9 16.5L14 21.5L23 11.5"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

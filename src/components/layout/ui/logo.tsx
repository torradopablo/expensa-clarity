import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-gradient-hero flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-2/3 h-2/3 text-white"
      >
        <path d="M20 6L9 17L4 12" />
      </svg>
    </div>
  );
}

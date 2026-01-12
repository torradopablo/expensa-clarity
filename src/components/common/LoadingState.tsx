import React from "react";
import { cn } from "../../lib/utils";

export interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({ 
  message = "Cargando...", 
  className,
  size = "md" 
}: LoadingStateProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-gray-300 border-t-green-600",
          sizes[size]
        )}
      />
      {message && (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
}

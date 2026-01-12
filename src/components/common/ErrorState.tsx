import React from "react";
import { Button } from "../layout/ui/button";
import { cn } from "../../lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = "Algo salió mal",
  message = "Ocurrió un error inesperado. Por favor, intentá de nuevo.",
  onRetry,
  className 
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-4 max-w-md">
        {message}
      </p>
      
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Intentar de nuevo
        </Button>
      )}
    </div>
  );
}

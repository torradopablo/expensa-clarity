import React from "react";
import { cn } from "../../lib/utils";

export interface Step {
  id: string;
  label: string;
  status: "completed" | "active" | "pending";
  icon?: React.ReactNode;
}

export interface StepperProps {
  steps: Step[];
  className?: string;
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-center flex-1"
          >
            {/* Step Circle */}
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                step.status === "completed" && "bg-green-600 text-white",
                step.status === "active" && "bg-green-100 text-green-700 border-2 border-green-600",
                step.status === "pending" && "bg-gray-100 text-gray-500"
              )}
            >
              {step.status === "completed" ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                step.icon || index + 1
              )}
            </div>

            {/* Step Label */}
            <div className="ml-3 min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium transition-colors",
                  step.status === "completed" && "text-green-700",
                  step.status === "active" && "text-green-700",
                  step.status === "pending" && "text-gray-500"
                )}
              >
                {step.label}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-4 transition-colors",
                  steps[index + 1].status === "completed" || steps[index + 1].status === "active"
                    ? "bg-green-600"
                    : "bg-gray-200"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface FormInputProps extends InputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, icon, iconPosition = "left", className, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </span>
          )}
          <Input
            id={inputId}
            ref={ref}
            className={cn(
              icon && iconPosition === "left" && "pl-10",
              icon && iconPosition === "right" && "pr-10",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            {...props}
          />
          {icon && iconPosition === "right" && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

export { Input, FormInput };

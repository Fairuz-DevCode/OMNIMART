import React from "react";
import { Loader2, LucideIcon } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  loadingText?: string;
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  loadingText,
  isLoading = false,
  type = "submit",
  className = "",
  icon: Icon,
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={isLoading || props.disabled}
      className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 text-parchment-DEFAULT bg-linear-to-br from-parchment-100 to-parchment-200 cursor-pointer ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText || "Memproses..."}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;

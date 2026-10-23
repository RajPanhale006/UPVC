import Image from "next/image";

import { COMPANY_LOGO_PATH, COMPANY_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

type ShivshaktiLogoProps = {
  className?: string;
  size?: number;
};

/** Official Shivshakti Enterprises logo. */
export function ShivshaktiLogo({ className, size = 72 }: ShivshaktiLogoProps) {
  return (
    <Image
      src={COMPANY_LOGO_PATH}
      alt="Shivshakti Enterprises"
      width={size}
      height={size}
      priority
      quality={100}
      sizes={`${size}px`}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: "auto", maxHeight: size }}
    />
  );
}

type BrandHeaderProps = {
  showTagline?: boolean;
  logoSize?: number;
  className?: string;
  variant?: "light" | "dark";
};

export function BrandHeader({
  showTagline = true,
  logoSize = 80,
  className,
  variant = "light",
}: BrandHeaderProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-xl p-1.5 shadow-md",
          isDark
            ? "bg-white ring-1 ring-white/20"
            : "bg-white ring-1 ring-slate-200/80",
        )}
      >
        <ShivshaktiLogo size={logoSize} />
      </div>
      {showTagline ? (
        <p
          className={cn(
            "max-w-xs text-xs font-medium leading-snug md:max-w-sm md:text-sm",
            isDark ? "text-slate-300" : "text-slate-600",
          )}
        >
          {COMPANY_TAGLINE}
        </p>
      ) : null}
    </div>
  );
}

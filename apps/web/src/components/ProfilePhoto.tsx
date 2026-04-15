import { useState } from "react";
import { cn } from "@/lib/utils";

function profileInitials(label: string): string {
  const t = label.trim();
  if (!t) return "U";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  const one = parts[0] || t;
  if (one.includes("@")) {
    const local = one.split("@")[0] || "";
    return (local.slice(0, 2) || "?").toUpperCase();
  }
  return one.slice(0, 2).toUpperCase();
}

export interface ProfilePhotoProps {
  /** Remote URL (e.g. Firebase / Google usercontent). Omit or null to show initials only. */
  src?: string | null;
  alt: string;
  /** Used for fallback initials when the image is missing or fails to load. */
  label?: string | null;
  className?: string;
  /** Extra classes for the initials fallback (overrides default gradient when set). */
  fallbackClassName?: string;
}

/**
 * Profile image with Google CDN–safe loading: omits the Referer header so lh3.googleusercontent.com
 * serves the image instead of an HTML error page. Falls back to initials on error.
 */
export function ProfilePhoto({
  src,
  alt,
  label,
  className,
  fallbackClassName,
}: ProfilePhotoProps) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(src?.trim()) && !failed;
  const initials = profileInitials(label || alt || "?");

  if (!showImg) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full text-xs font-bold",
          fallbackClassName ??
            "bg-gradient-to-br from-primary to-accent text-primary-foreground",
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      className={cn("shrink-0 rounded-full object-cover", className)}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

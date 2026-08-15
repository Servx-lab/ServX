import React from 'react';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  fullWidth?: boolean;
  noPadding?: boolean;
}

/**
 * Page header + body on the DashboardLayout right canvas. The canvas is the
 * card — no nested white box. Header stays fixed; body owns its own scroll.
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  children,
  headerContent,
  fullWidth = false,
  noPadding = false,
}) => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-slate-900 animate-in fade-in duration-300">
      {/* Compact sticky header */}
      <header className="flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border/70 px-5 py-4 md:px-7 md:py-5">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 md:text-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {headerContent && (
          <div className="flex flex-none items-center gap-3">{headerContent}</div>
        )}
      </header>

      {/* Body — same surface, no nested card */}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar ${
          noPadding ? '' : 'p-5 md:p-7'
        } ${fullWidth ? 'w-full' : 'mx-auto w-full max-w-5xl'}`}
      >
        {children}
      </div>
    </div>
  );
};

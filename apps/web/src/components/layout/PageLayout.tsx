import React from 'react';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  fullWidth?: boolean;
  noPadding?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ 
  title, 
  subtitle, 
  children, 
  headerContent,
  fullWidth = false,
  noPadding = false
}) => {
  return (
    <div className="h-full overflow-y-auto bg-[#F1F1F1] text-black p-6 md:p-12 animate-in fade-in duration-500 no-scrollbar rounded-xl">
      <div className={`mx-auto space-y-12 pb-20 ${fullWidth ? 'w-full' : 'max-w-5xl'}`}>
        
        {/* Settings Header & Inline Navbar */}
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-black tracking-tight mb-2">{title}</h1>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            
            {headerContent}
        </div>

        {/* Content Card */}
        <div className={`bg-white rounded-3xl ${noPadding ? 'overflow-hidden' : 'p-8'} shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/50 animate-in slide-in-from-bottom-4 duration-500 ${fullWidth ? 'w-full' : ''}`}>
            {children}
        </div>

      </div>
    </div>
  );
};

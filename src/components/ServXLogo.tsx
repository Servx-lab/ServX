import React from 'react';

interface ServXLogoProps {
  /** Show tagline below the logo */
  showTagline?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional className for the container */
  className?: string;
}

const SIZE_DIMENSIONS = {
  sm: 'h-8',
  md: 'h-16',
  lg: 'h-24',
};

export const ServXLogo: React.FC<ServXLogoProps> = ({
  showTagline = true,
  size = 'md',
  className = '',
}) => {
  const heightClass = SIZE_DIMENSIONS[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img 
        src="/Servx.webp" 
        alt="ServX Logo" 
        className={`${heightClass} w-auto object-contain select-none`}
      />
      {showTagline && (
        <p className="text-xs text-[#A4ADB3] font-medium tracking-widest lowercase mt-2">
          we're making servers work
        </p>
      )}
    </div>
  );
};

export default ServXLogo;

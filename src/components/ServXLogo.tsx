import React from 'react';

interface ServXLogoProps {
  /** Show tagline below the logo */
  showTagline?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional className for the container */
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
};

const OVERLAP_CLASSES = {
  sm: '-ml-3',
  md: '-ml-5',
  lg: '-ml-7',
};

const LETTER_CONFIG = [
  { char: 'S', color: 'text-yellow-400/90' },
  { char: 'e', color: 'text-pink-500/90' },
  { char: 'r', color: 'text-cyan-400/90' },
  { char: 'v', color: 'text-purple-500/90' },
  { char: 'X', color: 'text-blue-500/90' },
];

export const ServXLogo: React.FC<ServXLogoProps> = ({
  showTagline = true,
  size = 'md',
  className = '',
}) => {
  const sizeClass = SIZE_CLASSES[size];
  const overlapClass = OVERLAP_CLASSES[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className="flex items-center justify-center font-extrabold font-sans select-none [&>span]:mix-blend-screen"
        style={{ letterSpacing: '-0.2em' }}
      >
        {LETTER_CONFIG.map(({ char, color }, i) => (
          <span
            key={i}
            className={`${sizeClass} ${color} ${overlapClass} first:ml-0`}
          >
            {char}
          </span>
        ))}
      </div>
      {showTagline && (
        <p className="text-xs text-[#A4ADB3] font-medium tracking-widest lowercase mt-1">
          we're making servers work
        </p>
      )}
    </div>
  );
};

export default ServXLogo;

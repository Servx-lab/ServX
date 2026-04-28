import React from 'react';
import { Server } from 'lucide-react';

export const VercelLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 1155 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} fill-black`}>
    <path d="M577.344 0L1154.69 1000H0L577.344 0Z" />
  </svg>
);

export const RenderLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M19.3333 13.3333H4.66667V20H19.3333V13.3333Z" fill="black" fillOpacity="0.9" />
    <path d="M19.3333 4H4.66667V10.6667H19.3333V4Z" fill="black" fillOpacity="0.5" />
  </svg>
);

export const RailwayLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} text-black`}>
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const DOLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} text-[#0080FF]`}>
    <path d="M12 12H16V16H12V12Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M4 4H10V10H4V4ZM14 4H20V10H14V4ZM4 14H10V20H4V14Z" fill="currentColor" />
  </svg>
);

export const FlyLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} text-purple-600`}>
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" fillOpacity="0.5" />
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CoolifyLogoSVG = ({ className = "w-7 h-7" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2L2 7L12 12L2 17L12 22L22 17L12 12L22 7L12 2Z" fill="#6B16ED" fillOpacity="0.8" />
    <circle cx="12" cy="12" r="3" fill="#6B16ED" />
  </svg>
);

export const AWSLogo = ({ className = "w-7 h-7" }: { className?: string }) => (
  <Server className={`${className} text-[#FF9900]`} />
);

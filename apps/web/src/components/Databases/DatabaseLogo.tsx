import React from 'react';
import { DatabaseType } from './types';
import { Database, Cloud, HardDrive, Server, FileSpreadsheet } from 'lucide-react';

interface DatabaseLogoProps {
  type: DatabaseType | 'All' | string;
  className?: string;
}

export const DatabaseLogo: React.FC<DatabaseLogoProps> = ({ type, className = "w-6 h-6" }) => {
  switch (type) {
    case 'Firebase':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
          <path d="M3.89 15.67L6.47 5.09c.14-.58.94-.65 1.18-.11l2.09 4.67L3.89 15.67z" fill="#FFCA28"/>
          <path d="M14.26 8.35L11.5 2.82c-.22-.45-.85-.46-1.08 0L8.6 6.34 3.89 15.67l10.37 5.86 5.85-3.18L14.26 8.35z" fill="#FFA000"/>
          <path d="M20.11 15.67l-3.9-7.38c-.22-.43-.84-.45-1.09-.04l-2.73 4.5 7.72 2.92z" fill="#FFCA28"/> 
        </svg>
      );
    case 'MongoDB':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
           <path d="M12 21.6C12 21.6 6.8 15.6 11.2 4.4C11.6 3.4 12.4 3.4 12.8 4.4C17.2 15.6 12 21.6 12 21.6Z" fill="#00ED64"/>
           <path d="M11.6 10.8C11.6 10.8 10.6 13.2 11.6 19.4C11.6 19.4 11.2 16.4 12 14.8C12.8 13.2 11.6 10.8 11.6 10.8Z" fill="#00684A"/>
        </svg>
      );
    case 'Supabase':
      return (
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
           <path d="M11.696 2.01639C11.8702 1.9056 12.1298 1.9056 12.304 2.01639L20.4431 7.18957C20.6277 7.30691 20.7386 7.51474 20.7329 7.73307L20.2114 27.4244C20.2053 27.653 20.0838 27.8643 19.8887 27.9882L12.304 32.8055C12.1298 32.9163 11.8702 32.9163 11.696 32.8055L4.11128 27.9882C3.91617 27.8643 3.79471 27.653 3.78864 27.4244L3.26707 7.73307C3.26135 7.51474 3.37227 7.30691 3.55688 7.18957L11.696 2.01639Z" fill="#3ECF8E" style={{transform: "scale(0.65) translate(6px, 0px)"}}/>
           <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="#3ECF8E" stroke="#3ECF8E" strokeWidth="2" fillOpacity="0.2"/>
           <path d="M12.5 6L6 14H11.5L10.5 20L17.5 11H12.5L13.5 6H12.5Z" fill="#3ECF8E"/>
        </svg>
      );
    case 'MySQL':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
          <path d="M4 17C2 15 2 7 12 7C22 7 22 15 20 17C18 19 2 19 4 17Z" stroke="#00758F" strokeWidth="2"/>
          <path d="M12 9C17 9 17 14 12 14C7 14 7 9 12 9Z" fill="#F29111"/> 
          <rect x="10" y="16" width="4" height="4" fill="#00758F"/>
        </svg>
      );
    case 'AWS':
    case 'AWS RDS':
      return (
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
             <path d="M12 2L18.5 6V18L12 22L5.5 18V6L12 2Z" stroke="#FF9900" strokeWidth="2"/>
             <path d="M15 15C15 15 13 17 12 17C9 17 8 14 8 12C8 10 9 7 12 7C14 7 15 8 15.5 9" stroke="#FF9900" strokeWidth="2" strokeLinecap="round"/>
         </svg>
      );
    case 'Redis':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
            <path d="M4 16C4 18.2 7.6 20 12 20C16.4 20 20 18.2 20 16" stroke="#D82C20" strokeWidth="2"/>
            <path d="M4 12C4 14.2 7.6 16 12 16C16.4 16 20 14.2 20 12" stroke="#D82C20" strokeWidth="2"/>
            <path d="M4 8C4 10.2 7.6 12 12 12C16.4 12 20 10.2 20 8" stroke="#D82C20" strokeWidth="2"/>
            <ellipse cx="12" cy="8" rx="8" ry="4" stroke="#D82C20" strokeWidth="2"/>
        </svg>
      );
    case 'MariaDB':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM6 12C6 11 6.8 10 8 10C9.2 10 10 10.8 10 12C10 13.2 9.2 14 8 14C6.8 14 6 13.2 6 12ZM16 12C16 11 16.8 10 18 10C19.2 10 20 10.8 20 12C20 13.2 19.2 14 18 14C16.8 14 16 13.2 16 12Z" fill="#C0765A"/>
            <path d="M12 17C14.5 17 16.5 15 16.5 12.5C16.5 10 14.5 8 12 8C9.5 8 7.5 10 7.5 12.5C7.5 15 9.5 17 12 17Z" fill="#C0765A"/>
        </svg>
      );
    case 'Oracle':
       return (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
                <rect x="2" y="6" width="20" height="12" rx="2" fill="#F80000"/>
                <path d="M6 10H18" stroke="white" strokeWidth="2"/>
                <path d="M6 14H14" stroke="white" strokeWidth="2"/>
            </svg>
       );
    case 'Google Sheets':
        return (
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#0F9D58"/>
                <path d="M14 2V8H20" fill="#87CEFA" fillOpacity="0.3"/> 
                <rect x="7" y="10" width="10" height="2" fill="white"/>
                <rect x="7" y="14" width="10" height="2" fill="white"/>
                <rect x="7" y="18" width="6" height="2" fill="white"/>
             </svg>
        );
    case 'PostgreSQL':
        return (
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12.7 18.1C10.5 18.6 8.5 17.5 7.6 15.4C6.7 13.3 7.3 10.9 9.1 9.6L12.5 5.5L16.2 8.7L14.4 13.6L16.8 17.5L12.7 18.1Z" fill="#336791"/>
             </svg>
        );
    case 'Vercel':
        return (
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none">
                <path d="M12 2L2 21H22L12 2Z" fill="white"/>
             </svg>
        );
    default:
      // Fallback to Lucide icons
      switch (type) {
          case 'All': return <Database className={className} />;
          default: return <Database className={className} />;
      }
  }
};

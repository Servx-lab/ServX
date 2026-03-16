import React from 'react';
import { Link } from 'react-router-dom';
import ServXLogo from './ServXLogo';

interface LegalLayoutProps {
  title: string;
  children: React.ReactNode;
}

const LegalLayout: React.FC<LegalLayoutProps> = ({ title, children }) => (
  <div className="min-h-screen bg-[#0B0E14] text-[#A4ADB3]">
    <header className="border-b border-[#181C25]">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-[#00C2CB] hover:text-[#00C2CB]/80 transition-colors">
          <ServXLogo showTagline={false} size="sm" />
        </Link>
        <nav className="flex gap-6">
          <Link to="/privacy" className="text-sm font-medium text-[#A4ADB3] hover:text-[#00C2CB] transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-sm font-medium text-[#A4ADB3] hover:text-[#00C2CB] transition-colors">
            Terms of Service
          </Link>
        </nav>
      </div>
    </header>

    <main className="container mx-auto px-6 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-[#00C2CB] mb-8">{title}</h1>
      <div className="space-y-6">
        {children}
      </div>
    </main>

    <footer className="border-t border-[#181C25] mt-16 py-6">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-[#A4ADB3] hover:text-[#00C2CB] transition-colors">
          ← Back to ServX
        </Link>
        <p className="text-xs text-[#A4ADB3]/60">© {new Date().getFullYear()} ServX. Open source.</p>
      </div>
    </footer>
  </div>
);

export default LegalLayout;

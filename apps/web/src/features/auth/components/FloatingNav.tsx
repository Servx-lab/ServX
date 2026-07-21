import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Database, 
  Cloud, 
  Globe, 
  Code2, 
  Github, 
  Shield
} from 'lucide-react';

const navItems = [
  { id: 'showcase-automedic', icon: Activity, label: 'Auto-Medic', offset: 80 },
  { id: 'showcase-database', icon: Database, label: 'Database', offset: 85 },
  { id: 'showcase-hosting', icon: Cloud, label: 'Hosting Bridge', offset: 215 },
  { id: 'showcase-globalops', icon: Globe, label: 'Global Ops', offset: 55 },
  { id: 'showcase-vscode', icon: Code2, label: 'VSCode Sync', offset: 255 },
  { id: 'showcase-github', icon: Github, label: 'GitHub Analytics', offset: 230 },
  { id: 'showcase-attackpath', icon: Shield, label: 'Attack Path', offset: 235 },
];

// Set this to true in the future if you add new pages and need to tweak offsets again!
const SHOW_SCROLLBOX = false;

export const FloatingNav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // DevTools State for Offsets (Initialized from navItems)
  const [offsets, setOffsets] = useState<Record<string, number>>(() => {
    const initialOffsets: Record<string, number> = {};
    navItems.forEach(item => {
      initialOffsets[item.id] = item.offset;
    });
    return initialOffsets;
  });

  React.useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const currentOffset = offsets[id] || 0;
      
      window.scrollTo({ 
        top: elementPosition + currentOffset, 
        behavior: 'smooth' 
      });
      
      setIsOpen(false);
    }
  };

  return (
    <>
      <div 
        className="fixed z-[9999]"
        style={{
          left: 24,
          top: 'calc(50% + 23px)'
        }}
      >
        <motion.div
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          initial={{ 
            width: 64, 
            height: 64, 
            borderRadius: 9999, 
            opacity: 0, 
            scale: 0.5,
            x: -10,
            y: '-50%'
          }}
          animate={{
            width: isOpen ? 220 : 64,
            height: 424,
            borderRadius: 24,
            opacity: 1,
            scale: 0.8,
            x: -10,
            y: '-50%'
          }}
          transition={{ 
            duration: isInitialLoad ? 2 : 0.3,
            ease: "easeInOut"
          }}
          className="bg-[#2A2A2A] text-gray-300 shadow-2xl overflow-hidden flex flex-col py-4 relative origin-left"
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isInitialLoad ? 1 + (index * 0.15) : 0 }}
                onClick={() => scrollToSection(item.id)}
                className="flex items-center w-full px-4 py-3 hover:bg-[#3A3A3A] hover:text-white transition-colors"
              >
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                  <Icon className="w-5 h-5" />
                </div>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10, width: 0 }}
                      animate={{ opacity: 1, x: 0, width: 'auto' }}
                      exit={{ opacity: 0, x: -10, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* DevTools Offset Tweaker - ScrollBOX */}
      {SHOW_SCROLLBOX && (
        <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl z-[999] w-72 text-white">
          <h3 className="text-sm font-bold mb-3 text-blue-400">ScrollBOX</h3>
          <p className="text-[10px] text-gray-400 mb-3">
            Drag sliders below to adjust scroll stop position. Click nav links to test. Output is generated at the bottom.
          </p>
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {navItems.map(item => (
              <div key={item.id} className="text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-gray-300">{item.label}</span>
                  <span className="text-blue-300">{offsets[item.id]}px</span>
                </div>
                <input 
                  type="range" 
                  min="-500" 
                  max="500" 
                  step="5"
                  value={offsets[item.id] || 0}
                  onChange={(e) => setOffsets(prev => ({ ...prev, [item.id]: parseInt(e.target.value) }))}
                  className="w-full accent-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 p-2 bg-black rounded text-[10px] font-mono text-blue-300 break-all select-all whitespace-pre-wrap">
            {JSON.stringify(offsets, null, 2)}
          </div>
        </div>
      )}
    </>
  );
};

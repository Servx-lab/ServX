import React, { useEffect, useState, useRef } from 'react';
import { DatabasePipelineUI } from './DatabasePipelineUI';
import { useInView } from 'framer-motion';

export type DBState = 'idle' | 'clicking_add' | 'selecting_provider' | 'filling_credentials' | 'connecting' | 'connected' | 'renaming_connection' | 'searching' | 'expanded';

export const DatabaseShowcase = () => {
  const [dbState, setDbState] = useState<DBState>('idle');
  const [cycleIndex, setCycleIndex] = useState(0);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: false, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    
    let timeout: ReturnType<typeof setTimeout>;
    let currentCycle = 0;

    const runLoop = () => {
      setCycleIndex(currentCycle % 3);
      // 1. Idle (waiting to connect)
      setDbState('idle');
      
      timeout = setTimeout(() => {
        // 2. Cursor clicks "Add Database"
        setDbState('clicking_add');
        
        timeout = setTimeout(() => {
          // 3. Select Provider Modal opens, cursor clicks MongoDB
          setDbState('selecting_provider');
          
          timeout = setTimeout(() => {
            // 4. Form appears, cursor fills credentials
            setDbState('filling_credentials');
            
            timeout = setTimeout(() => {
              // 5. Cursor clicks Connect
              setDbState('connecting');
              
              timeout = setTimeout(() => {
                // 6. Connected
                setDbState('connected');
                
                timeout = setTimeout(() => {
                  // 7. Cursor renames connection
                  setDbState('renaming_connection');
                  
                  timeout = setTimeout(() => {
                    // 8. Cursor goes to search bar
                    setDbState('searching');
                    
                    timeout = setTimeout(() => {
                      // 9. Data matrix expands
                      setDbState('expanded');
                      
                      timeout = setTimeout(() => {
                        // 10. Loop restarts
                        currentCycle++;
                        runLoop();
                      }, 4000);
                    }, 3000);
                  }, 2000);
                }, 1000);
              }, 1000);
            }, 3500); // Takes 3.5s to fill credentials
          }, 1500);
        }, 1500);
      }, 2000);
    };

    runLoop();
    return () => {
      clearTimeout(timeout);
      setDbState('idle');
      setCycleIndex(0);
    };
  }, [isInView]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px]">
      <DatabasePipelineUI dbState={dbState} cycleIndex={cycleIndex} />
    </div>
  );
};

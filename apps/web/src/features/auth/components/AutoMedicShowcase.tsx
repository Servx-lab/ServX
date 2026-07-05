import React, { useEffect, useState, useRef } from 'react';
import { AutoMedicShowcaseScene, NodeState } from './AutoMedicShowcaseScene';
import { AutoMedicPipelineUI } from './AutoMedicPipelineUI';
import { useInView } from 'framer-motion';

export const AutoMedicShowcase = () => {
  const [nodeState, setNodeState] = useState<NodeState>('healthy');
  const [errorIndex, setErrorIndex] = useState(0);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: false, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    
    let timeout: ReturnType<typeof setTimeout>;

    const runLoop = () => {
      // 1. Start Healthy for 4s
      setNodeState('healthy');
      
      timeout = setTimeout(() => {
        // 2. Corrupt for 3s
        setNodeState('corrupted');
        
        timeout = setTimeout(() => {
          // 3. Start resolving animation (cursor moves) for 1.5s
          setNodeState('resolving');
          
          timeout = setTimeout(() => {
            // 4. Healing (click!) for 2.5s
            setNodeState('healing');
            
            timeout = setTimeout(() => {
              // 5. Restart loop and cycle error type
              setErrorIndex(prev => (prev + 1) % 4);
              runLoop();
            }, 2500);
          }, 1500);
        }, 3000);
      }, 4000);
    };

    runLoop();

    return () => {
      clearTimeout(timeout);
      setNodeState('healthy');
      setErrorIndex(0);
    };
  }, [isInView]);

  return (
    <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch min-h-[500px] w-full">
      {/* 1:3 ratio for the 3D Node (col-span-4) */}
      <div className="lg:col-span-4 w-full h-full min-h-[500px]">
        <AutoMedicShowcaseScene nodeState={nodeState} />
      </div>

      {/* 2:3 ratio for the UI Dashboard (col-span-8) */}
      <div className="lg:col-span-8 w-full h-full min-h-[500px]">
        <AutoMedicPipelineUI nodeState={nodeState} errorIndex={errorIndex} />
      </div>
    </div>
  );
};

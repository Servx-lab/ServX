import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Server, GitPullRequest } from 'lucide-react';

export const AutoMedicScene: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [serverState, setServerState] = useState<'healthy' | 'error' | 'healing'>('healthy');
  const serverMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // Reset or start sequence when becoming active
  useEffect(() => {
    if (isActive) {
      setServerState('error'); // Start with an error!
      
      // Simulate healing process triggered by the cursor
      const timeout1 = setTimeout(() => {
        setServerState('healing');
      }, 2500); // Wait for cursor to reach the button

      const timeout2 = setTimeout(() => {
        setServerState('healthy');
      }, 4500); // Finish healing

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }
  }, [isActive]);

  // Animate colors based on state
  useFrame((state, delta) => {
    if (serverMatRef.current) {
      let targetColor = new THREE.Color('#10B981'); // healthy green
      if (serverState === 'error') targetColor = new THREE.Color('#EF4444'); // error red
      if (serverState === 'healing') targetColor = new THREE.Color('#3B82F6'); // healing blue
      
      serverMatRef.current.color.lerp(targetColor, delta * 3);
      serverMatRef.current.emissive.lerp(targetColor, delta * 3);
    }
  });

  if (!isActive) return null;

  return (
    <group position={[-2, 0, 0]}>
      {/* The Server Node */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 2, 1.5]} />
          <meshStandardMaterial 
            ref={serverMatRef}
            roughness={0.2} 
            metalness={0.8}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Floating UI Panel for the Server */}
        <Html position={[1.2, 0, 0]} center transform sprite>
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col gap-3 min-w-[200px] text-white">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="font-bold flex items-center gap-2">
                <Server size={16} /> node-us-east-1
              </span>
              {serverState === 'error' && <span className="text-red-400 animate-pulse flex items-center gap-1"><Activity size={14}/> 99% CPU</span>}
              {serverState === 'healing' && <span className="text-blue-400 animate-pulse">Healing...</span>}
              {serverState === 'healthy' && <span className="text-green-400">Stable</span>}
            </div>

            {/* Simulated "Auto Heal" Button that the cursor will "click" */}
            <button className={`w-full py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              serverState === 'error' ? 'bg-red-500 hover:bg-red-400' : 
              serverState === 'healing' ? 'bg-blue-500 opacity-50 cursor-not-allowed' : 
              'bg-slate-700 opacity-50 cursor-not-allowed'
            }`}>
              <GitPullRequest size={16} />
              {serverState === 'error' ? 'AUTO HEAL' : serverState === 'healing' ? 'GENERATING PR...' : 'MERGED'}
            </button>
          </div>
        </Html>
      </Float>
    </group>
  );
};

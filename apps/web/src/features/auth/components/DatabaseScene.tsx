import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Database, Link } from 'lucide-react';

export const DatabaseScene: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [isWired, setIsWired] = useState(false);
  const dataStreamMatRef = useRef<THREE.LineBasicMaterial>(null);

  useEffect(() => {
    if (isActive) {
      setIsWired(false);
      
      // The cursor clicks the Wire button at 2.5s
      const timer = setTimeout(() => {
        setIsWired(true);
      }, 2500);

      const endTimer = setTimeout(() => {
        setIsWired(false);
      }, 6500);

      return () => {
        clearTimeout(timer);
        clearTimeout(endTimer);
      };
    }
  }, [isActive]);

  useFrame((state, delta) => {
    if (dataStreamMatRef.current && isWired) {
      // Pulse the opacity to simulate data flow
      dataStreamMatRef.current.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5;
    }
  });

  if (!isActive) return null;

  const dbPositions: [number, number, number][] = [
    [-1.5, 1.5, 0],   // Postgres
    [1.5, 1.5, -0.5], // MongoDB
    [0, 2, 1],        // Redis
  ];
  
  const centralHubPosition: [number, number, number] = [0, 0, 0];

  return (
    <group position={[0, -0.5, 0]}>
      {/* Central Hub */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh position={centralHubPosition}>
          <octahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color={isWired ? '#00C2CB' : '#334155'} roughness={0.1} metalness={0.8} />
        </mesh>
      </Float>

      {/* Database Nodes */}
      {dbPositions.map((pos, i) => (
        <Float key={i} speed={2 + i} rotationIntensity={0.5} floatIntensity={1} position={pos}>
          <mesh>
            <cylinderGeometry args={[0.4, 0.4, 0.6, 16]} />
            <meshStandardMaterial color="#3B82F6" roughness={0.3} metalness={0.7} />
          </mesh>
          <Html position={[0, -0.6, 0]} center transform sprite scale={0.5}>
            <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-blue-900 text-blue-300 text-xs font-bold shadow-lg">
              {['PostgreSQL', 'MongoDB', 'Redis'][i]}
            </div>
          </Html>
        </Float>
      ))}

      {/* Data Streams (Wiring) */}
      {isWired && dbPositions.map((pos, i) => (
        <Line 
          key={`line-${i}`}
          points={[pos, centralHubPosition]} 
          color="#00C2CB" 
          lineWidth={3} 
          transparent 
          ref={dataStreamMatRef}
        />
      ))}

      {/* UI Control Panel */}
      <Html position={[0, -1.5, 1]} center transform sprite>
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col gap-3 min-w-[200px] text-white select-none pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-bold text-sm flex items-center gap-2">
              <Database size={16} /> DATA LAYER
            </span>
            {isWired ? (
              <span className="text-green-400 text-xs font-bold animate-pulse">CONNECTED</span>
            ) : (
              <span className="text-slate-400 text-xs font-bold">STANDBY</span>
            )}
          </div>
          
          <button className={`w-full py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
            isWired ? 'bg-green-600' : 'bg-blue-600'
          }`}>
            <Link size={16} />
            {isWired ? 'SYNCHRONIZING...' : 'WIRE DATABASES'}
          </button>
        </div>
      </Html>
    </group>
  );
};

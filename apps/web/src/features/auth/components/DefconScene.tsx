import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export const DefconScene: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [defconLevel, setDefconLevel] = useState(5);
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const shieldRef = useRef<THREE.Mesh>(null);

  // Animate the sequence
  useEffect(() => {
    if (isActive) {
      setDefconLevel(5); // Start calm
      
      // The cursor will start dragging at 1.5s
      const intervals: any[] = [];
      
      // Simulate the dragging of the slider over time
      for (let i = 4; i >= 1; i--) {
        intervals.push(
          setTimeout(() => {
            setDefconLevel(i);
          }, 1500 + (5 - i) * 500) // Drops level every 500ms
        );
      }

      // Reset to 5 at the end
      const endTimer = setTimeout(() => {
        setDefconLevel(5);
      }, 5500);

      return () => {
        intervals.forEach(clearTimeout);
        clearTimeout(endTimer);
      };
    }
  }, [isActive]);

  useFrame((state, delta) => {
    // Colors based on defcon
    const colors = {
      5: '#3B82F6', // Blue (Calm)
      4: '#10B981', // Green
      3: '#F59E0B', // Yellow
      2: '#EA580C', // Orange
      1: '#EF4444', // Red (Critical)
    };

    const targetColor = new THREE.Color(colors[defconLevel as keyof typeof colors]);
    
    if (coreMatRef.current) {
      coreMatRef.current.color.lerp(targetColor, delta * 4);
      coreMatRef.current.emissive.lerp(targetColor, delta * 4);
    }

    if (shieldRef.current) {
      // Shield becomes visible and larger at lower DEFCONs
      const targetScale = defconLevel <= 2 ? 1.5 : 0.1;
      const targetOpacity = defconLevel <= 2 ? 0.4 : 0.0;
      
      shieldRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
      
      const mat = shieldRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 5);
      
      // Rotate the shield
      shieldRef.current.rotation.y += delta * (6 - defconLevel) * 0.5;
      shieldRef.current.rotation.z += delta * (6 - defconLevel) * 0.2;
    }
  });

  if (!isActive) return null;

  return (
    <group position={[1.5, 0, 0]}>
      {/* The Core Node */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <Sphere args={[1, 32, 32]}>
          <meshStandardMaterial 
            ref={coreMatRef}
            roughness={0.1} 
            metalness={0.9}
            emissiveIntensity={0.8}
            wireframe={defconLevel === 1}
          />
        </Sphere>
        
        {/* Protective Force Field (Active on DEFCON 1/2) */}
        <Sphere args={[1, 16, 16]} ref={shieldRef}>
          <meshBasicMaterial 
            color="#EF4444" 
            transparent 
            opacity={0} 
            wireframe 
            blending={THREE.AdditiveBlending} 
          />
        </Sphere>

        {/* DEFCON UI Panel */}
        <Html position={[-2, 1, 0]} center transform sprite distanceFactor={10}>
          <div className="bg-slate-900/90 backdrop-blur-xl border border-red-900/50 p-4 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col gap-4 min-w-[240px] text-white select-none pointer-events-none">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <span className="font-bold tracking-widest text-sm flex items-center gap-2">
                DEFCON OPS
              </span>
              {defconLevel <= 2 ? (
                <span className="text-red-500 animate-pulse flex items-center gap-1 text-xs font-bold">
                  <ShieldAlert size={14}/> LOCKDOWN
                </span>
              ) : (
                <span className="text-blue-400 text-xs font-bold">MONITORING</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>LVL 5</span>
                <span>LVL 1</span>
              </div>
              
              {/* Fake Slider Track */}
              <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-orange-500 to-red-500 transition-all duration-300"
                  style={{ width: `${((5 - defconLevel) / 4) * 100}%` }}
                />
              </div>

              {/* The "Knob" that the cursor will grab */}
              <div 
                className="absolute top-[50px] w-5 h-5 bg-white rounded-full shadow-lg border-2 border-slate-900 transition-all duration-300"
                style={{ left: `calc(${((5 - defconLevel) / 4) * 100}% - 10px)` }}
              />
            </div>

            <div className="text-center mt-2">
              <span className={`text-3xl font-black ${defconLevel <= 2 ? 'text-red-500' : 'text-slate-300'}`}>
                {defconLevel}
              </span>
            </div>
          </div>
        </Html>
      </Float>
    </group>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float, Sphere, Box } from '@react-three/drei';
import * as THREE from 'three';
import { Lock, ShieldCheck, Smartphone, XCircle } from 'lucide-react';

export const ZeroTrustScene: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [accessState, setAccessState] = useState<'pending' | 'denied' | 'approved'>('pending');
  const shieldMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const dataPacketRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (isActive) {
      setAccessState('pending');
      
      // Initial state is "blocked" by default because of Zero Trust
      const deniedTimer = setTimeout(() => {
        setAccessState('denied');
      }, 1000);

      // The cursor clicks the Approve button on the admin device at 3.5s
      const approveTimer = setTimeout(() => {
        setAccessState('approved');
      }, 3500);

      const resetTimer = setTimeout(() => {
        setAccessState('pending');
      }, 6500);

      return () => {
        clearTimeout(deniedTimer);
        clearTimeout(approveTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [isActive]);

  useFrame((state, delta) => {
    // Shield animation
    if (shieldMatRef.current) {
      const targetOpacity = accessState === 'approved' ? 0 : (accessState === 'denied' ? 0.8 : 0.4);
      const targetColor = accessState === 'denied' ? '#EF4444' : '#3B82F6';
      
      shieldMatRef.current.opacity = THREE.MathUtils.lerp(shieldMatRef.current.opacity, targetOpacity, delta * 5);
      shieldMatRef.current.color.lerp(new THREE.Color(targetColor), delta * 5);
    }

    // Packet animation (trying to enter the core)
    if (dataPacketRef.current) {
      if (accessState === 'pending') {
        dataPacketRef.current.position.lerp(new THREE.Vector3(2, 0, 0), delta * 2);
      } else if (accessState === 'denied') {
        // Bounce off the shield
        dataPacketRef.current.position.lerp(new THREE.Vector3(2.5, 0.5, 0), delta * 5);
      } else if (accessState === 'approved') {
        // Zoom into the core
        dataPacketRef.current.position.lerp(new THREE.Vector3(0, 0, 0), delta * 5);
        dataPacketRef.current.scale.lerp(new THREE.Vector3(0.1, 0.1, 0.1), delta * 5);
      } else {
        // Reset
        dataPacketRef.current.position.set(4, 0, 0);
        dataPacketRef.current.scale.set(1, 1, 1);
      }
    }
  });

  if (!isActive) return null;

  return (
    <group position={[0, 0, 0]}>
      {/* Target Core Server */}
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
        <Box args={[1.5, 1.5, 1.5]}>
          <meshStandardMaterial color="#1E293B" roughness={0.1} metalness={0.8} />
        </Box>
        <Html position={[0, 1.2, 0]} center transform sprite distanceFactor={10} scale={0.7}>
          <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2">
            <Lock size={12} /> SECURE CORE
          </div>
        </Html>
        
        {/* Zero Trust Force Field */}
        <Sphere args={[2, 32, 32]}>
          <meshBasicMaterial 
            ref={shieldMatRef}
            color="#3B82F6" 
            transparent 
            opacity={0.4} 
            wireframe 
            blending={THREE.AdditiveBlending}
          />
        </Sphere>
      </Float>

      {/* Incoming Request Packet */}
      <mesh ref={dataPacketRef} position={[4, 0, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={accessState === 'denied' ? '#EF4444' : '#10B981'} emissiveIntensity={0.8} />
      </mesh>

      {/* Admin Approval Device (Simulating a mobile device or admin console) */}
      <Html position={[-2.5, -1, 1]} center transform sprite distanceFactor={10}>
        <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-900/50 p-4 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.2)] flex flex-col gap-3 min-w-[220px] text-white pointer-events-none select-none">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-bold text-sm flex items-center gap-2">
              <Smartphone size={16} /> ADMIN AUTH
            </span>
          </div>
          
          <div className="text-xs text-slate-300">
            <p>Incoming request from:</p>
            <p className="font-mono text-blue-400">192.168.1.42</p>
          </div>

          <div className="flex gap-2 mt-2">
            <button className="flex-1 py-1.5 rounded bg-slate-800 text-slate-400 text-xs font-bold flex justify-center items-center gap-1 opacity-50">
              <XCircle size={14} /> DENY
            </button>
            <button className={`flex-1 py-1.5 rounded text-white text-xs font-bold flex justify-center items-center gap-1 transition-all ${
              accessState === 'approved' ? 'bg-green-500' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]'
            }`}>
              <ShieldCheck size={14} /> APPROVE
            </button>
          </div>
        </div>
      </Html>
    </group>
  );
};

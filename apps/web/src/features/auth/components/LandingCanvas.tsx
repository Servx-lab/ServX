import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Cursor3D } from './Cursor3D';

// This is the main orchestration canvas that will cycle through the features
export const LandingCanvas: React.FC = () => {
  const [cursorTarget, setCursorTarget] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [isClicking, setIsClicking] = useState(false);

  // Simple idle animation loop for Phase 1
  useEffect(() => {
    let phase = 0;
    const targets = [
      new THREE.Vector3(-2, 1, 0),
      new THREE.Vector3(2, 2, -1),
      new THREE.Vector3(0, -1, 1),
      new THREE.Vector3(-1, 0, 2),
    ];

    const interval = setInterval(() => {
      // Simulate moving to a new target
      setCursorTarget(targets[phase % targets.length]);
      
      // Simulate clicking half a second after moving
      setTimeout(() => {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 200);
      }, 500);

      phase++;
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-0 w-full h-full pointer-events-none">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Environment preset="city" />
        
        {/* Animated 3D background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Phase 1: Basic Animated Cursor */}
        <Cursor3D targetPosition={cursorTarget} isClicking={isClicking} />

        {/* Orbit controls limited so user can slightly pan around if we enable pointer events, 
            but keeping it static for the background for now */}
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 2 - 0.2} />
      </Canvas>
    </div>
  );
};

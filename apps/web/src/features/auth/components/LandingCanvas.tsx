import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Cursor3D } from './Cursor3D';
import { AutoMedicScene } from './AutoMedicScene';

export const LandingCanvas: React.FC = () => {
  const [cursorTarget, setCursorTarget] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [isClicking, setIsClicking] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  // Orchestrate the global feature loop
  useEffect(() => {
    // Defines the features and their durations (in ms)
    const features = [
      { name: 'AutoMedic', duration: 7000 },
      // Other features will go here
    ];

    let timer: any;
    
    const runSequence = () => {
      const feature = features[currentFeatureIndex];
      
      // AutoMedic cursor animation choreography
      if (feature.name === 'AutoMedic') {
        // Reset cursor to center briefly
        setCursorTarget(new THREE.Vector3(0, -2, 2));

        // 1. Move towards the Auto Heal button
        setTimeout(() => setCursorTarget(new THREE.Vector3(-0.8, -0.6, 0.5)), 1000);
        
        // 2. Click the button at exactly 2.5s (matching the AutoMedicScene timeline)
        setTimeout(() => {
          setIsClicking(true);
          setTimeout(() => setIsClicking(false), 200);
        }, 2500);

        // 3. Move cursor away slightly to observe the healing and PR
        setTimeout(() => setCursorTarget(new THREE.Vector3(0, 1.5, 1)), 3500);
      }

      // Next feature (loops back to 0 if at the end)
      timer = setTimeout(() => {
        setCurrentFeatureIndex((prev) => (prev + 1) % features.length);
      }, feature.duration);
    };

    runSequence();

    return () => {
      clearTimeout(timer);
    };
  }, [currentFeatureIndex]);

  return (
    <div className="absolute inset-0 z-0 w-full h-full pointer-events-none">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Environment preset="city" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Feature Scenes */}
        <AutoMedicScene isActive={currentFeatureIndex === 0} />

        {/* Animated Cursor */}
        <Cursor3D targetPosition={cursorTarget} isClicking={isClicking} />

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 2 - 0.2} />
      </Canvas>
    </div>
  );
};

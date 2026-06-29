import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Cursor3D } from './Cursor3D';
import { AutoMedicScene } from './AutoMedicScene';
import { DefconScene } from './DefconScene';
import { DatabaseScene } from './DatabaseScene';

export const LandingCanvas: React.FC = () => {
  const [cursorTarget, setCursorTarget] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [isClicking, setIsClicking] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  // Orchestrate the global feature loop
  useEffect(() => {
    // Defines the features and their durations (in ms)
    const features = [
      { name: 'AutoMedic', duration: 7000 },
      { name: 'Defcon', duration: 7000 },
      { name: 'Database', duration: 7000 },
    ];

    let timer: any;
    
    const runSequence = () => {
      const feature = features[currentFeatureIndex];
      
      if (feature.name === 'AutoMedic') {
        setCursorTarget(new THREE.Vector3(0, -2, 2));
        setTimeout(() => setCursorTarget(new THREE.Vector3(-0.8, -0.6, 0.5)), 1000);
        setTimeout(() => {
          setIsClicking(true);
          setTimeout(() => setIsClicking(false), 200);
        }, 2500);
        setTimeout(() => setCursorTarget(new THREE.Vector3(0, 1.5, 1)), 3500);
      }
      
      if (feature.name === 'Defcon') {
        setCursorTarget(new THREE.Vector3(2, -1, 1));
        setTimeout(() => setCursorTarget(new THREE.Vector3(-0.4, 0.2, 0.5)), 1000);
        setTimeout(() => setIsClicking(true), 1500);
        setTimeout(() => setCursorTarget(new THREE.Vector3(-0.1, 0.2, 0.5)), 2000);
        setTimeout(() => setCursorTarget(new THREE.Vector3(0.2, 0.2, 0.5)), 2500);
        setTimeout(() => setCursorTarget(new THREE.Vector3(0.5, 0.2, 0.5)), 3000);
        setTimeout(() => setCursorTarget(new THREE.Vector3(0.8, 0.2, 0.5)), 3500);
        setTimeout(() => setIsClicking(false), 3700);
        setTimeout(() => setCursorTarget(new THREE.Vector3(0, 2, 1.5)), 4500);
      }

      if (feature.name === 'Database') {
        setCursorTarget(new THREE.Vector3(-2, 1, 2));
        // Move towards the Wire button
        setTimeout(() => setCursorTarget(new THREE.Vector3(0, -1.8, 1.2)), 1000);
        
        // Click the button
        setTimeout(() => {
          setIsClicking(true);
          setTimeout(() => setIsClicking(false), 200);
        }, 2500);

        // Move away to see the data streams
        setTimeout(() => setCursorTarget(new THREE.Vector3(1.5, 1, 2)), 3500);
      }

      // Next feature
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
        <DefconScene isActive={currentFeatureIndex === 1} />
        <DatabaseScene isActive={currentFeatureIndex === 2} />

        {/* Animated Cursor */}
        <Cursor3D targetPosition={cursorTarget} isClicking={isClicking} />

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 2 - 0.2} />
      </Canvas>
    </div>
  );
};

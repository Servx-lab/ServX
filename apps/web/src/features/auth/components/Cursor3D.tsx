import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface Cursor3DProps {
  targetPosition: THREE.Vector3;
  isClicking?: boolean;
}

export const Cursor3D: React.FC<Cursor3DProps> = ({ targetPosition, isClicking = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Smoothly move cursor to target position
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Lerp position
      groupRef.current.position.lerp(targetPosition, delta * 5);
      
      // Scale down slightly when clicking
      const targetScale = isClicking ? 0.8 : 1.0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 15);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} renderOrder={999}>
      {/* 
        Rotate the cone to look more like a standard cursor pointer.
        A cone points UP along the Y axis by default.
        We want it pointing diagonally down-left.
      */}
      <mesh rotation={[Math.PI, 0, Math.PI / 4]} castShadow>
        <coneGeometry args={[0.15, 0.5, 4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Glow effect */}
      <mesh rotation={[Math.PI, 0, Math.PI / 4]}>
        <coneGeometry args={[0.2, 0.6, 4]} />
        <meshBasicMaterial color="#00C2CB" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

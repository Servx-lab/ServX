import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Line, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Define the 3D positions of our network nodes
const NODE_POSITIONS: [number, number, number][] = [
  [0, 0, 0],          // 0: Central Node
  [2, 1.5, -1],       // 1: Top Right
  [1.5, -2, 1],       // 2: Bottom Right
  [-2, -1.5, 0.5],    // 3: Bottom Left
  [-1.5, 2, -0.5],    // 4: Top Left
  [0, 0, -2.5],       // 5: Back Node
];

// Define which nodes are connected to form the network topology
const CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], // Center connects to all
  [1, 2], [2, 3], [3, 4], [4, 1],         // Outer ring connections
  [1, 5], [4, 5]                          // Back node connections
];

const THREAT_NODE_INDEX = 4;

const ThreatNode = ({ position, isQuarantined, onClick }: { position: [number, number, number], isQuarantined: boolean, onClick: () => void }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const shieldRef = useRef<THREE.Mesh>(null);
  
  const [hovered, setHovered] = useState(false);
  const targetScale = useRef(1);
  const basePosition = useMemo(() => new THREE.Vector3(...position), [position]);
  const targetColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    // 1. Emissive Pulsing & Color Lerping
    if (materialRef.current) {
      if (isQuarantined) {
        // Transition to safe teal state
        targetColor.set("#00C2CB");
        materialRef.current.color.lerp(targetColor, 0.05);
        materialRef.current.emissive.lerp(targetColor, 0.05);
        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, 0.8, 0.05);
      } else {
        // Pulse red threat state
        targetColor.set("#EF4444");
        materialRef.current.color.copy(targetColor);
        materialRef.current.emissive.copy(targetColor);
        const pulse = (Math.sin(state.clock.elapsedTime * 6) + 1) / 2;
        materialRef.current.emissiveIntensity = 0.5 + pulse * 2.0;
      }
    }

    // 2. Hover Physics (Scale & Magnetic Parallax)
    if (groupRef.current) {
      targetScale.current = hovered && !isQuarantined ? 1.2 : 1.0;
      const currentScale = groupRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale.current, 0.1);
      groupRef.current.scale.setScalar(newScale);

      if (hovered && !isQuarantined) {
        const mouseX = (state.pointer.x * state.viewport.width) / 2;
        const mouseY = (state.pointer.y * state.viewport.height) / 2;
        
        const pullStrength = 0.2; 
        const targetX = basePosition.x + (mouseX - basePosition.x) * pullStrength;
        const targetY = basePosition.y + (mouseY - basePosition.y) * pullStrength;
        
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.05);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.05);
      } else {
        groupRef.current.position.lerp(basePosition, 0.1);
      }
    }

    // 3. Shield Animation (Deploy Kill Switch)
    if (shieldRef.current) {
      if (isQuarantined) {
        shieldRef.current.scale.setScalar(THREE.MathUtils.lerp(shieldRef.current.scale.x, 1, 0.08));
        shieldRef.current.rotation.y += delta * 1.5;
        shieldRef.current.rotation.x += delta * 1.0;
      } else {
        shieldRef.current.scale.setScalar(0.01);
      }
    }
  });

  // Global Cursor Management
  useEffect(() => {
    document.body.style.cursor = hovered && !isQuarantined ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto'; // cleanup on unmount
    };
  }, [hovered, isQuarantined]);

  return (
    <group ref={groupRef} position={position}>
      {/* The Core Node */}
      <mesh 
        ref={meshRef} 
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isQuarantined) onClick();
        }}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshPhysicalMaterial 
          ref={materialRef}
          color="#EF4444" 
          emissive="#EF4444"
          emissiveIntensity={1}
          metalness={0.8} 
          roughness={0.2} 
          clearcoat={1}
        />
      </mesh>

      {/* The Glassmorphic Shield */}
      <mesh ref={shieldRef} scale={0.01}>
        <icosahedronGeometry args={[0.6, 2]} />
        <meshPhysicalMaterial 
          color="#00C2CB" 
          transmission={0.9} 
          transparent
          opacity={1}
          metalness={0.2} 
          roughness={0} 
          ior={1.5}
          thickness={0.5}
        />
      </mesh>
    </group>
  );
};


const ThreatLine = ({ start, end, isQuarantined }: { start: [number, number, number], end: [number, number, number], isQuarantined: boolean }) => {
  const lineRef = useRef<any>(null);
  const targetColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (lineRef.current && lineRef.current.material) {
      if (!isQuarantined) {
        // Data leaking animation
        lineRef.current.material.dashOffset -= delta * 4;
        targetColor.set("#EF4444");
      } else {
        // Secure, healthy traffic animation
        lineRef.current.material.dashOffset -= delta * 0.5;
        targetColor.set("#00C2CB");
      }
      // Lerp the line color
      lineRef.current.material.color.lerp(targetColor, 0.05);
    }
  });

  return (
    <Line
      ref={lineRef}
      points={[start, end]}
      color="#EF4444"
      lineWidth={1.5}
      transparent
      opacity={0.9}
      dashed={true}
      dashScale={1}
      dashSize={0.2}
      gapSize={0.1}
    />
  );
};

const NetworkConstellation = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [isQuarantined, setIsQuarantined] = useState(false);

  // Slow ambient rotation for the entire network
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Render Connecting Lines */}
      {CONNECTIONS.map(([startIdx, endIdx], i) => {
        const isThreatLine = startIdx === THREAT_NODE_INDEX || endIdx === THREAT_NODE_INDEX;
        
        if (isThreatLine) {
          // Flow from regular node to the threat node
          const start = NODE_POSITIONS[startIdx === THREAT_NODE_INDEX ? endIdx : startIdx];
          const end = NODE_POSITIONS[startIdx === THREAT_NODE_INDEX ? startIdx : endIdx];
          
          return (
            <ThreatLine 
              key={`line-${i}`} 
              start={start} 
              end={end} 
              isQuarantined={isQuarantined} 
            />
          );
        }

        return (
          <Line
            key={`line-${i}`}
            points={[NODE_POSITIONS[startIdx], NODE_POSITIONS[endIdx]]}
            color={isQuarantined ? "#00C2CB" : "#334155"} // Change surrounding network to teal when secured
            lineWidth={1}
            transparent
            opacity={0.6}
          />
        );
      })}

      {/* Render Nodes */}
      {NODE_POSITIONS.map((pos, i) => {
        if (i === THREAT_NODE_INDEX) {
          return (
            <ThreatNode 
              key={`node-${i}`} 
              position={pos} 
              isQuarantined={isQuarantined} 
              onClick={() => setIsQuarantined(true)} 
            />
          );
        }
        
        return (
          <mesh key={`node-${i}`} position={pos}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshPhysicalMaterial 
              color="#0f172a" 
              metalness={0.9} 
              roughness={0.1} 
              clearcoat={1}
              envMapIntensity={2}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export const AttackPathScene = () => {
  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#00C2CB" />
        <Environment preset="city" />

        <NetworkConstellation />
        
        {/* Ground shadow for depth */}
        <ContactShadows position={[0, -3.5, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#000000" />
      </Canvas>
    </div>
  );
};

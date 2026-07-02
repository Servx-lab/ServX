import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

export type NodeState = 'healthy' | 'corrupted' | 'resolving' | 'healing';

const ServerNode = ({ nodeState }: { nodeState: NodeState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const wireframeRef = useRef<any>(null);
  
  const wipeProgress = useRef(-2);
  const colorTop = useRef(new THREE.Color("#0f172a"));
  const colorBottom = useRef(new THREE.Color("#0f172a"));
  const targetTop = useRef(new THREE.Color("#0f172a"));
  const targetBottom = useRef(new THREE.Color("#0f172a"));

  // Continuous rotation on the Y-axis, plus erratic shaking when corrupted
  // Smoothly interpolate colors and distortion to make the healing process gradual
  useFrame((state, delta) => {
    if (meshRef.current && materialRef.current && wireframeRef.current) {
      
      let targetDistort = 0;
      let targetSpeed = 0;
      let wColor = "#334155";

      if (nodeState === 'corrupted' || nodeState === 'resolving') {
        targetDistort = 0.5;
        targetSpeed = 5;
        wColor = "#EF4444";
        
        targetTop.current.set("#EF4444");
        targetBottom.current.set("#EF4444");
        wipeProgress.current = THREE.MathUtils.lerp(wipeProgress.current, -2, 0.1);
        
        // Erratic glitch shaking
        meshRef.current.rotation.y += delta * 2.0;
        meshRef.current.position.x = (Math.random() - 0.5) * 0.15;
        meshRef.current.position.y = (Math.random() - 0.5) * 0.15;
        meshRef.current.position.z = (Math.random() - 0.5) * 0.15;
      } else if (nodeState === 'healing') {
        // Slow gradual healing process
        targetDistort = 0.0;
        targetSpeed = 1;
        wColor = "#00C2CB";
        
        targetTop.current.set("#EF4444");
        targetBottom.current.set("#00C2CB");
        // Wipe from bottom (-2) to top (+2) over the geometry's Y space
        wipeProgress.current = THREE.MathUtils.lerp(wipeProgress.current, 2.5, 0.02);
        
        meshRef.current.rotation.y += delta * 0.5;
        meshRef.current.position.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      } else {
        // Healthy smooth rotation
        targetDistort = 0.0;
        targetSpeed = 0;
        wColor = "#334155";
        
        targetTop.current.set("#0f172a");
        targetBottom.current.set("#0f172a");
        wipeProgress.current = THREE.MathUtils.lerp(wipeProgress.current, 2.5, 0.05);
        
        meshRef.current.rotation.y += delta * 0.2;
        meshRef.current.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
      }
      
      // Interpolate material properties for gradual transition
      materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.02);
      materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, targetSpeed, 0.02);

      wireframeRef.current.distort = THREE.MathUtils.lerp(wireframeRef.current.distort, targetDistort * 1.5, 0.02);
      wireframeRef.current.color.lerp(new THREE.Color(wColor), 0.02);

      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

      // Update Vertex Colors for perfect 3D physical spatial wipe
      colorTop.current.lerp(targetTop.current, 0.1);
      colorBottom.current.lerp(targetBottom.current, 0.1);

      const geometry = meshRef.current.geometry;
      if (geometry) {
        const posAttribute = geometry.attributes.position;
        let colorAttribute = geometry.attributes.color;
        
        if (!colorAttribute) {
          geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(posAttribute.count * 3), 3));
          colorAttribute = geometry.attributes.color;
        }

        const p = wipeProgress.current;
        const tempColor = new THREE.Color();
        
        for (let i = 0; i < posAttribute.count; i++) {
          const y = posAttribute.getY(i);
          // Create a gradient band based on local Y coordinate
          let mixFactor = THREE.MathUtils.clamp((y - p) * 1.5 + 0.5, 0, 1);
          
          if (nodeState === 'healing') {
            tempColor.lerpColors(colorBottom.current, colorTop.current, mixFactor);
          } else {
            tempColor.copy(colorTop.current);
          }
          
          colorAttribute.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        }
        colorAttribute.needsUpdate = true;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <icosahedronGeometry args={[1.5, 0]} />
      <MeshDistortMaterial 
        ref={materialRef}
        color="#ffffff" 
        vertexColors={true}
        distort={0} 
        speed={0} 
        roughness={0.15} 
        metalness={0.8}
        clearcoat={1}
        envMapIntensity={2}
      />
      
      {/* Wireframe overlay for the "tech" aesthetic */}
      <mesh>
        <icosahedronGeometry args={[1.501, 0]} />
        <MeshDistortMaterial 
          ref={wireframeRef}
          color="#334155" 
          wireframe 
          transparent 
          opacity={0.4} 
          distort={0} 
          speed={0} 
        />
      </mesh>
    </mesh>
  );
};

// Particle stream simulating the Auto-Medic AI fixing the node
const ParticleStream = ({ isActive }: { isActive: boolean }) => {
  const count = 60;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const globalScale = useRef(0);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Initialize random starting positions on a sphere
  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() => {
      const radius = 3 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      return {
        startPos: new THREE.Vector3(x, y, z),
        currentPos: new THREE.Vector3(x, y, z),
        speed: 0.02 + Math.random() * 0.03,
        scale: Math.random() * 0.05 + 0.02,
      };
    });
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Smoothly grow particles when active, shrink when inactive
    globalScale.current = THREE.MathUtils.lerp(
      globalScale.current, 
      isActive ? 1 : 0, 
      0.03
    );

    if (globalScale.current < 0.01 && !isActive) return;
    
    particles.forEach((particle, i) => {
      // Pull particles toward the center (0,0,0)
      particle.currentPos.lerp(new THREE.Vector3(0, 0, 0), particle.speed);
      
      // If a particle reaches the center, reset it to its outer starting position
      if (particle.currentPos.length() < 0.5) {
        particle.currentPos.copy(particle.startPos);
      }
      
      dummy.position.copy(particle.currentPos);
      dummy.scale.setScalar(particle.scale * globalScale.current);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#00C2CB" transparent opacity={0.8} />
    </instancedMesh>
  );
};

export const AutoMedicShowcaseScene: React.FC<{ nodeState: NodeState }> = ({ nodeState }) => {
  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-950 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        {/* Environment Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#00C2CB" />
        <Environment preset="city" />

        <group position={[0, 0, 0]}>
          <ServerNode nodeState={nodeState} />
          <ParticleStream isActive={nodeState === 'healing'} />
        </group>
        
        {/* Ground shadow for depth */}
        <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4} color={(nodeState === 'corrupted' || nodeState === 'resolving') ? '#EF4444' : '#00C2CB'} />
      </Canvas>
    </div>
  );
};

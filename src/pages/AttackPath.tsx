import React, { useState, useEffect, Suspense, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Float, MeshDistortMaterial, Sphere, Icosahedron, Line, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Lock, AlertTriangle, ChevronDown,
  Crosshair, Bug, FileWarning, ArrowRight, Cpu, X,
  Loader2, Target, RadioTower, Scan
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import apiClient from "@/lib/apiClient";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ─── Types ──────────────────────────────────────────────────────

interface RepoSummary {
  id: number;
  name: string;
  full_name: string;
  language: string | null;
  owner?: { login: string };
}

interface Vulnerability {
  id: string;
  severity: "critical" | "medium" | "low";
  title: string;
  detail: string;
  file?: string;
}

type AttackType = "ddos" | "injection" | null;
type ScanPhase = "idle" | "scanning" | "attacking" | "reporting";

// --- sub-components ---

const SolarSystemBackground = () => {
  const sunRef = useRef<THREE.Mesh>(null);
  const earthRef = useRef<THREE.Group>(null);
  const marsRef = useRef<THREE.Group>(null);
  const jupiterRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sunRef.current) sunRef.current.rotation.y += 0.005;
    if (earthRef.current) {
      earthRef.current.position.x = Math.cos(t * 0.5) * 10;
      earthRef.current.position.z = Math.sin(t * 0.5) * 10;
      earthRef.current.rotation.y += 0.02;
    }
    if (marsRef.current) {
      marsRef.current.position.x = Math.cos(t * 0.3 + 2) * 14;
      marsRef.current.position.z = Math.sin(t * 0.3 + 2) * 14;
      marsRef.current.rotation.y += 0.015;
    }
    if (jupiterRef.current) {
      jupiterRef.current.position.x = Math.cos(t * 0.1 + 4) * 20;
      jupiterRef.current.position.z = Math.sin(t * 0.1 + 4) * 20;
      jupiterRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={[0, -2, -15]} rotation={[0.4, 0, 0]}>
      {/* Sun */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#ffaa00" />
        <pointLight color="#ffaa00" intensity={2} distance={100} />
        {/* Sun Glow */}
        <Sphere args={[2.2, 32, 32]}>
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.2} blending={THREE.AdditiveBlending} />
        </Sphere>
      </mesh>

      {/* Earth Orbit */}
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 10, 0, Math.sin(i / 64 * Math.PI * 2) * 10])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial color="#2266ff" roughness={0.7} />
        </mesh>
      </group>

      {/* Mars Orbit */}
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 14, 0, Math.sin(i / 64 * Math.PI * 2) * 14])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={marsRef}>
        <mesh>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#ff4422" roughness={0.8} />
        </mesh>
      </group>

      {/* Jupiter Orbit */}
      <Line points={Array.from({ length: 65 }).map((_, i) => [Math.cos(i / 64 * Math.PI * 2) * 20, 0, Math.sin(i / 64 * Math.PI * 2) * 20])} color="#ffffff" opacity={0.15} transparent lineWidth={1} />
      <group ref={jupiterRef}>
        <mesh>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial color="#ddaa88" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};

const AttackParticles = React.memo(({ start, end, active }: any) => {
  const [pos, setPos] = useState(0);
  
  useFrame((state, delta) => {
    if (!active) return;
    setPos((prev) => (prev + delta * 2) % 1);
  });

  const currentPos = useMemo(() => {
    return new THREE.Vector3().lerpVectors(new THREE.Vector3(...start), new THREE.Vector3(...end), pos);
  }, [pos, start, end]);

  if (!active) return null;

  return (
    <mesh position={currentPos}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#6C63FF" />
      <pointLight color="#6C63FF" intensity={4} distance={3} />
    </mesh>
  );
});

const TopologyNode = React.memo(({ position, label, isTargeted }: any) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (isTargeted && meshRef.current) {
      meshRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 20) * 0.05;
      meshRef.current.position.y = position[1] + Math.cos(state.clock.elapsedTime * 23) * 0.05;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position}>
        <Icosahedron ref={meshRef} args={[0.5, 1]} onPointerOver={(e) => (e.stopPropagation())}>
          <meshStandardMaterial 
            color={isTargeted ? "#6C63FF" : "#00C2CB"} 
            emissive={isTargeted ? "#6C63FF" : "#00C2CB"} 
            emissiveIntensity={isTargeted ? 20 : 2} 
            wireframe 
          />
        </Icosahedron>
        
        {/* Pulsing Aura */}
        <Sphere args={[0.5, 16, 16]}>
          <meshBasicMaterial 
            color={isTargeted ? "#6C63FF" : "#00C2CB"} 
            transparent 
            opacity={0.1} 
          />
        </Sphere>

        <Text
          position={[0, 0.8, 0]}
          fontSize={0.2}
          color="#00C2CB"
          font="https://fonts.gstatic.com/s/orbitron/v30/y97pyXG9LrxS4lTz68l6_GfN.woff"
        >
          {label}
        </Text>

        {isTargeted && (
          <Sphere args={[0.6, 16, 16]}>
            <MeshDistortMaterial
              color="#6C63FF"
              speed={5}
              distort={0.4}
              radius={1}
              transparent
              opacity={0.3}
            />
          </Sphere>
        )}
      </group>
    </Float>
  );
});

const AttackPath = () => {
  const [isAttackActive, setIsAttackActive] = useState(false);
  const [isLockdown, setIsLockdown] = useState(false);
  const [glitch, setGlitch] = useState(false);

  const toggleLockdown = () => {
    setGlitch(true);
    setTimeout(() => setGlitch(false), 200);
    setIsLockdown(!isLockdown);
  };

  const toggleAttack = () => {
    setIsAttackActive(!isAttackActive);
  };

  return (
    <div className={`flex min-h-screen bg-white text-black overflow-hidden transition-all duration-500 ${glitch ? 'filter invert brightness-150' : ''}`}>
      <Sidebar />

      {/* Holographic Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 2px, 3px 100%'
      }} />

      <main className="ml-56 flex-1 relative flex flex-col items-center justify-center">
        {/* 3D Viewport */}
        <div className="absolute inset-0 z-0">
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[0, 0, 10]} />
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#00C2CB" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#6C63FF" />
            
            <Stars radius={100} depth={50} count={7000} factor={4} saturation={1} fade speed={1.5} />

            <Suspense fallback={null}>
              <SolarSystemBackground />
              <group rotation={[0.2, 0, 0]}>
                <TopologyNode position={[-4, 0, 0]} label="G-FRONTEND-01" isTargeted={false} />
                <TopologyNode position={[0, 2.5, 0]} label="G-CORE-API-07" isTargeted={isAttackActive} />
                <TopologyNode position={[4, 0, 0]} label="G-PERSIST-09" isTargeted={false} />
                <TopologyNode position={[0, -2.5, 0]} label="G-AUTH-SYS-04" isTargeted={false} />

                {/* Attack Animation */}
                <AttackParticles start={[-4, 0, 0]} end={[0, 2, 0]} active={isAttackActive} />

                {/* Holographic Flow Paths */}
                <Line
                  points={[[-4, 0, 0], [0, 2, 0]]}
                  color={isAttackActive ? "#6C63FF" : "#00C2CB"}
                  lineWidth={1.5}
                  transparent
                  opacity={0.5}
                />
                <Line
                  points={[[-4, 0, 0], [0, -2, 0]]}
                  color="#00C2CB"
                  lineWidth={1.5}
                  transparent
                  opacity={0.5}
                />
                <Line
                  points={[[0, 2, 0], [4, 0, 0]]}
                  color="#00C2CB"
                  lineWidth={1.5}
                  transparent
                  opacity={0.5}
                />
                <Line
                  points={[[0, -2, 0], [4, 0, 0]]}
                  color="#00C2CB"
                  lineWidth={1.5}
                  transparent
                  opacity={0.5}
                />
              </group>
            </Suspense>

            <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        </div>

        {/* UI Overlay */}
        <div className="relative z-10 w-full h-full p-8 flex flex-col justify-between pointer-events-none">
          {/* Top Header */}
          <div className="flex justify-between items-start">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-sm pointer-events-auto"
            >
              <h2 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] mb-1">War Room Context</h2>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${isAttackActive ? 'text-purple-500 animate-pulse' : 'text-blue-500'}`} />
                <span className="text-xl font-bold tracking-tight text-black">Active Infrastructure Map</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-sm pointer-events-auto"
            >
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Network Load</p>
                  <p className="text-lg font-mono font-bold text-blue-500">{isAttackActive ? '94.2%' : '12.4%'}</p>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active Threats</p>
                  <p className={`text-lg font-mono font-bold ${isAttackActive ? 'text-purple-500' : 'text-blue-500'}`}>
                    {isAttackActive ? '01' : '00'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Controls (Bento Style) */}
          <div className="grid grid-cols-4 gap-6">
            {/* Chaos Control */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="col-span-1 bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-sm pointer-events-auto"
            >
              <h3 className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-4">Chaos Simulation</h3>
              <div className="space-y-4">
                <ChaosToggle 
                  label="DDoS Attack" 
                  active={isAttackActive} 
                  onClick={toggleAttack} 
                />
                <ChaosToggle 
                  label="SQL Injection" 
                  active={false} 
                  onClick={() => {}} 
                />
              </div>
            </motion.div>

            {/* Empty space for 3D map */}
            <div className="col-span-2" />

            {/* Master Override */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="col-span-1 bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-2xl shadow-sm pointer-events-auto flex flex-col items-center justify-center gap-4"
            >
              <h3 className="text-[10px] text-purple-500 font-bold uppercase tracking-widest">Security Protocol</h3>
              <MasterOverride onClick={toggleLockdown} active={isLockdown} />
            </motion.div>
          </div>
        </div>

        {/* Lockdown Overlay */}
        <AnimatePresence>
          {isLockdown && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-purple-500/5 backdrop-blur-md pointer-events-none overflow-hidden"
            >
              {/* Hexagonal Grid Overlay */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%236C63FF' fill='none'/%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
              }} />

              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-purple-500 blur-[120px] opacity-20 animate-pulse" />
                <div className="border border-purple-200 p-16 relative flex flex-col items-center gap-8 bg-white/90 backdrop-blur-3xl shadow-2xl rounded-2xl">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 border-purple-500" />
                  <div className="absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 border-purple-500" />
                  <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 border-purple-500" />
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 border-purple-500" />
                  
                  <div className="relative">
                    <Shield className="w-24 h-24 text-purple-600 animate-pulse" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-dashed border-purple-300 rounded-full scale-150"
                    />
                  </div>

                  <div className="text-center">
                    <h1 className="text-7xl font-black text-black tracking-[0.3em] mb-4">LOCKDOWN</h1>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent mb-4" />
                    <p className="text-purple-600 text-sm font-mono tracking-[0.5em] animate-pulse">ENCRYPTING ALL NETWORK NODES // LEVEL 4 PROTOCOL</p>
                  </div>

                  <div className="flex gap-8 text-[10px] font-mono text-gray-500">
                    <div className="flex flex-col items-center">
                      <span>NODES ISOLATED</span>
                      <span className="text-black font-bold">14/14</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>DATA SHIELD</span>
                      <span className="text-purple-600 font-bold">MAXIMUM</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const ChaosToggle = ({ label, active, onClick }: any) => {
  return (
    <div className="flex items-center justify-between group pointer-events-auto">
      <span className={`text-xs font-bold tracking-wider transition-colors duration-300 ${active ? 'text-black' : 'text-gray-500'}`}>
        {label}
      </span>
      <div 
        onClick={onClick}
        className="relative w-14 h-7 cursor-pointer"
      >
        {/* Track */}
        <div className={`absolute inset-0 rounded-full border transition-all duration-500 ${active ? 'bg-purple-100 border-purple-500' : 'bg-gray-100 border-gray-300'}`} />
        
        {/* Handle */}
        <motion.div 
          animate={{ 
            x: active ? 28 : 0,
            backgroundColor: active ? "#8b5cf6" : "#9ca3af"
          }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            mass: 0.8
          }}
          className="absolute top-1 left-1 w-5 h-5 rounded-full shadow-sm flex items-center justify-center"
        >
          <div className={`w-1 h-1 rounded-full ${active ? 'bg-white' : 'bg-gray-200'}`} />
        </motion.div>

        {/* Ripple Effect */}
        <AnimatePresence>
          {active && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-blue-500 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const MasterOverride = ({ onClick, active }: any) => {
  const [coverOpen, setCoverOpen] = useState(false);

  return (
    <div className="relative group flex flex-col items-center gap-6">
      <div 
        className="relative w-40 h-40 flex items-center justify-center cursor-pointer perspective-1000"
        onMouseEnter={() => setCoverOpen(true)}
        onMouseLeave={() => setCoverOpen(false)}
        onClick={() => coverOpen && onClick()}
      >
        {/* Glow Background */}
        <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${active ? 'bg-purple-500 opacity-40' : 'bg-blue-500'}`} />

        {/* Under Button */}
        <div className={`relative z-0 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl ${active ? 'bg-purple-500 shadow-purple-200' : 'bg-white border-2 border-purple-200'}`}>
          <motion.div
            animate={{ scale: active ? [1, 1.2, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {active ? <Shield className="w-12 h-12 text-white" /> : <Lock className="w-12 h-12 text-purple-300" />}
          </motion.div>
        </div>

        {/* Glass Cover */}
        <motion.div 
          animate={{ rotateX: coverOpen ? -130 : 0, y: coverOpen ? -20 : 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
          style={{ transformOrigin: "top", transformStyle: "preserve-3d" }}
          className="absolute inset-x-0 top-0 h-40 bg-white/50 backdrop-blur-md border border-gray-200 rounded-2xl flex flex-col items-center justify-center pointer-events-none z-10 shadow-lg"
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
          <p className="text-[10px] font-black italic text-gray-500 uppercase tracking-[0.4em] mb-2">Level 4 Clearance</p>
          <div className="flex gap-1">
             {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" />)}
          </div>
        </motion.div>
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-mono tracking-widest transition-colors ${coverOpen ? 'text-purple-600' : 'text-gray-400'}`}>
          {coverOpen ? "ENGAGE MASTER OVERRIDE" : "RESTRICTED ACCESS"}
        </p>
      </div>
    </div>
  );
};

export default AttackPath;

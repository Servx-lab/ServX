import React, { useState, Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Float, MeshDistortMaterial, Sphere, Icosahedron, Line, Stars, Text, Trail } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Lock, AlertTriangle, Play, RefreshCcw, Binary } from "lucide-react";
import Sidebar from "@/components/Sidebar";

// --- sub-components ---

const AttackParticles = ({ start, end, active }: any) => {
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i <= 20; i++) {
      p.push(new THREE.Vector3().lerpVectors(new THREE.Vector3(...start), new THREE.Vector3(...end), i / 20));
    }
    return p;
  }, [start, end]);

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
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color="#6C63FF" />
      <pointLight color="#6C63FF" intensity={2} distance={2} />
    </mesh>
  );
};

const TopologyNode = ({ position, label, isTargeted }: any) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (isTargeted && meshRef.current) {
      meshRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 20) * 0.05;
      meshRef.current.position.y = position[1] + Math.cos(state.clock.elapsedTime * 23) * 0.05;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        <Icosahedron ref={meshRef} args={[0.5, 1]} onPointerOver={(e) => (e.stopPropagation())}>
          <meshStandardMaterial 
            color={isTargeted ? "#6C63FF" : "#00C2CB"} 
            emissive={isTargeted ? "#6C63FF" : "#00C2CB"} 
            emissiveIntensity={isTargeted ? 15 : 2} 
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
};

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
    <div className={`flex min-h-screen bg-[#0B0E14] text-white overflow-hidden transition-all duration-500 ${glitch ? 'filter invert brightness-150' : ''}`}>
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
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#00C2CB" />
            
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            <Suspense fallback={null}>
              <group rotation={[0.2, 0, 0]}>
                <TopologyNode position={[-4, 0, 0]} label="FRONTEND_GATEWAY" isTargeted={false} />
                <TopologyNode position={[0, 2, 0]} label="API_CORE_V2" isTargeted={isAttackActive} />
                <TopologyNode position={[4, 0, 0]} label="DB_PERSISTENCE" isTargeted={false} />
                <TopologyNode position={[0, -2, 0]} label="AUTH_AUTHZ" isTargeted={false} />

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
              className="bg-[#181C25]/80 backdrop-blur-xl border border-[#00C2CB]/20 p-6 rounded-2xl shadow-[0_0_20px_rgba(0,194,203,0.1)] pointer-events-auto"
            >
              <h2 className="text-xs font-black text-[#00C2CB] uppercase tracking-[0.3em] mb-1">War Room Context</h2>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${isAttackActive ? 'text-[#6C63FF] animate-pulse' : 'text-[#00C2CB]'}`} />
                <span className="text-xl font-bold tracking-tight">Active Infrastructure Map</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-[#181C25]/80 backdrop-blur-xl border border-[#00C2CB]/20 p-6 rounded-2xl pointer-events-auto"
            >
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Network Load</p>
                  <p className="text-lg font-mono font-bold text-[#00C2CB]">{isAttackActive ? '94.2%' : '12.4%'}</p>
                </div>
                <div className="h-10 w-px bg-[#00C2CB]/20" />
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Active Threats</p>
                  <p className={`text-lg font-mono font-bold ${isAttackActive ? 'text-[#6C63FF]' : 'text-[#00C2CB]'}`}>
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
              className="col-span-1 bg-[#181C25]/80 backdrop-blur-xl border border-[#00C2CB]/20 p-6 rounded-2xl pointer-events-auto"
            >
              <h3 className="text-[10px] text-[#00C2CB] font-bold uppercase tracking-widest mb-4">Chaos Simulation</h3>
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
              className="col-span-1 bg-[#181C25]/80 backdrop-blur-xl border border-[#6C63FF]/30 p-6 rounded-2xl pointer-events-auto flex flex-col items-center justify-center gap-4"
            >
              <h3 className="text-[10px] text-[#6C63FF] font-bold uppercase tracking-widest">Security Protocol</h3>
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
              className="absolute inset-0 z-50 flex items-center justify-center bg-[#6C63FF]/5 backdrop-blur-md pointer-events-none overflow-hidden"
            >
              {/* Hexagonal Grid Overlay */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-rule='evenodd' stroke='%236C63FF' fill='none'/%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
              }} />

              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-[#6C63FF] blur-[120px] opacity-30 animate-pulse" />
                <div className="border border-[#6C63FF]/50 p-16 relative flex flex-col items-center gap-8 bg-[#0B0E14]/80 backdrop-blur-3xl shadow-[0_0_100px_rgba(108,99,255,0.2)]">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 border-[#6C63FF] shadow-[0_0_15px_#6C63FF]" />
                  <div className="absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 border-[#6C63FF] shadow-[0_0_15px_#6C63FF]" />
                  <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 border-[#6C63FF] shadow-[0_0_15px_#6C63FF]" />
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 border-[#6C63FF] shadow-[0_0_15px_#6C63FF]" />
                  
                  <div className="relative">
                    <Shield className="w-24 h-24 text-[#6C63FF] animate-pulse" />
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-dashed border-[#6C63FF]/30 rounded-full scale-150"
                    />
                  </div>

                  <div className="text-center">
                    <h1 className="text-7xl font-black text-white tracking-[0.3em] mb-4 drop-shadow-[0_0_20px_#6C63FF]">LOCKDOWN</h1>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#6C63FF] to-transparent mb-4" />
                    <p className="text-[#6C63FF] text-sm font-mono tracking-[0.5em] animate-pulse">ENCRYPTING ALL NETWORK NODES // LEVEL 4 PROTOCOL</p>
                  </div>

                  <div className="flex gap-8 text-[10px] font-mono text-gray-500">
                    <div className="flex flex-col items-center">
                      <span>NODES ISOLATED</span>
                      <span className="text-white font-bold">14/14</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>DATA SHIELD</span>
                      <span className="text-[#6C63FF] font-bold">MAXIMUM</span>
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
      <span className={`text-xs font-bold tracking-wider transition-colors duration-300 ${active ? 'text-white' : 'text-gray-500'}`}>
        {label}
      </span>
      <div 
        onClick={onClick}
        className="relative w-14 h-7 cursor-pointer"
      >
        {/* Track */}
        <div className={`absolute inset-0 rounded-full border transition-all duration-500 ${active ? 'bg-[#6C63FF]/20 border-[#6C63FF]' : 'bg-[#0B0E14] border-gray-700'}`} />
        
        {/* Handle */}
        <motion.div 
          animate={{ 
            x: active ? 28 : 0,
            backgroundColor: active ? "#6C63FF" : "#374151"
          }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            mass: 0.8
          }}
          className="absolute top-1 left-1 w-5 h-5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
        >
          <div className={`w-1 h-1 rounded-full ${active ? 'bg-white' : 'bg-gray-500'}`} />
        </motion.div>

        {/* Ripple Effect */}
        <AnimatePresence>
          {active && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-[#00C2CB] pointer-events-none"
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
        <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${active ? 'bg-[#6C63FF] opacity-40' : 'bg-[#00C2CB]'}`} />

        {/* Under Button */}
        <div className={`relative z-0 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${active ? 'bg-[#6C63FF] shadow-[0_0_50px_#6C63FF]' : 'bg-[#181C25] border-2 border-[#6C63FF]/50'}`}>
          <motion.div
            animate={{ scale: active ? [1, 1.2, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {active ? <Shield className="w-12 h-12 text-white" /> : <Lock className="w-12 h-12 text-[#6C63FF]/50" />}
          </motion.div>
        </div>

        {/* Glass Cover */}
        <motion.div 
          animate={{ rotateX: coverOpen ? -130 : 0, y: coverOpen ? -20 : 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
          style={{ transformOrigin: "top", transformStyle: "preserve-3d" }}
          className="absolute inset-x-0 top-0 h-40 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col items-center justify-center pointer-events-none z-10 shadow-2xl"
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mb-4" />
          <p className="text-[10px] font-black italic text-white/40 uppercase tracking-[0.4em] mb-2">Level 4 Clearance</p>
          <div className="flex gap-1">
             {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-[#6C63FF] rounded-full animate-pulse" />)}
          </div>
        </motion.div>
      </div>
      <div className="text-center">
        <p className={`text-[10px] font-mono tracking-widest transition-colors ${coverOpen ? 'text-[#6C63FF]' : 'text-gray-600'}`}>
          {coverOpen ? "ENGAGE MASTER OVERRIDE" : "RESTRICTED ACCESS"}
        </p>
      </div>
    </div>
  );
};

export default AttackPath;

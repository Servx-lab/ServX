import React, { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Float, MeshDistortMaterial, Sphere, Icosahedron, Line, Stars, Html, Text } from "@react-three/drei";
import { motion, AnimatePresence, useSpring } from "framer-motion";
import { Shield, Zap, Lock, AlertTriangle, Play, RefreshCcw, Binary } from "lucide-react";
import Sidebar from "@/components/Sidebar";

// --- sub-components ---

const TopologyNode = ({ position, label, isTargeted }: any) => {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        <Icosahedron args={[0.5, 1]} onPointerOver={(e) => (e.stopPropagation())}>
          <meshStandardMaterial 
            color={isTargeted ? "#6C63FF" : "#00C2CB"} 
            emissive={isTargeted ? "#6C63FF" : "#00C2CB"} 
            emissiveIntensity={isTargeted ? 10 : 2} 
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
              className="absolute inset-0 z-50 flex items-center justify-center bg-[#6C63FF]/10 backdrop-blur-md pointer-events-none"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-[#6C63FF] blur-[100px] opacity-20 animate-pulse" />
                <div className="border-4 border-[#6C63FF] p-12 relative flex flex-col items-center gap-6">
                  <div className="absolute -top-4 -left-4 w-8 h-8 border-t-4 border-l-4 border-[#6C63FF]" />
                  <div className="absolute -top-4 -right-4 w-8 h-8 border-t-4 border-r-4 border-[#6C63FF]" />
                  <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-4 border-l-4 border-[#6C63FF]" />
                  <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-4 border-r-4 border-[#6C63FF]" />
                  
                  <Shield className="w-20 h-20 text-[#6C63FF] animate-bounce" />
                  <h1 className="text-6xl font-black text-[#6C63FF] tracking-[0.2em] italic">SYSTEM LOCKDOWN</h1>
                  <p className="text-[#6C63FF] text-xl font-mono animate-pulse">PROTOCOL L-03 ACTIVE // ALL NODES ISOLATED</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const ChaosToggle = ({ label, active, onClick }: any) => {
  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">{label}</span>
      <button 
        onClick={onClick}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${active ? 'bg-[#6C63FF]' : 'bg-gray-800'}`}
      >
        <motion.div 
          animate={{ x: active ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-lg"
        />
        {active && (
          <motion.div 
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-full bg-white/50"
          />
        )}
      </button>
    </div>
  );
};

const MasterOverride = ({ onClick, active }: any) => {
  const [coverOpen, setCoverOpen] = useState(false);

  return (
    <div className="relative group flex flex-col items-center gap-4">
      <div 
        className="relative w-32 h-32 flex items-center justify-center cursor-pointer"
        onMouseEnter={() => setCoverOpen(true)}
        onMouseLeave={() => setCoverOpen(false)}
        onClick={() => coverOpen && onClick()}
      >
        {/* Under Button */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${active ? 'bg-[#6C63FF] shadow-[0_0_40px_#6C63FF]' : 'bg-[#181C25] border-2 border-[#6C63FF]/30'}`}>
          <Lock className={`w-10 h-10 ${active ? 'text-white' : 'text-[#6C63FF]/50'}`} />
        </div>

        {/* Glass Cover */}
        <motion.div 
          animate={{ rotateX: coverOpen ? -110 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{ transformOrigin: "top" }}
          className="absolute inset-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center pointer-events-none"
        >
          <p className="text-[10px] font-black italic text-white/50 uppercase tracking-[0.2em] transform -rotate-12">Security Cover</p>
        </motion.div>
      </div>
      <p className="text-[10px] text-gray-500 font-mono italic">Lift cover to engage override</p>
    </div>
  );
};

export default AttackPath;

import { useState } from "react";
import { motion } from "framer-motion";

const sources = [
  "Cloud Security & IAM",
  "Vulnerability Management",
  "Identity & Privilege",
  "Endpoint & EDR",
  "Network Exposure",
  "Application Security",
  "Container & Kubernetes",
  "Data & Storage",
  "Other Sources",
];

const FlowVisualization = () => {
  const [hoveredSource, setHoveredSource] = useState<number | null>(null);

  const centerX = 700;
  const centerY = 300;
  const sourceStartX = 60;
  const sourceSpacing = 58;
  const startY = 68;

  const getSourceY = (i: number) => startY + i * sourceSpacing;

  const generatePath = (index: number) => {
    const sy = getSourceY(index);
    const dotX = 240;
    const cp1x = dotX + 80;
    const cp2x = centerX - 100;
    return `M ${dotX} ${sy} C ${cp1x} ${sy}, ${cp2x} ${centerY}, ${centerX} ${centerY}`;
  };

  // Right-side output paths
  const generateOutputPath = (endY: number, color: "red" | "blue" | "green" | "yellow") => {
    const startX = centerX;
    const endX = 1400;
    const cp1x = centerX + 100;
    const cp2x = endX - 80;
    return `M ${startX} ${centerY} C ${cp1x} ${centerY}, ${cp2x} ${endY}, ${endX} ${endY}`;
  };

  const outputPaths = [
    { endY: 100, color: "red" as const, width: 8 },
    { endY: 180, color: "yellow" as const, width: 5 },
    { endY: 250, color: "green" as const, width: 3 },
    { endY: 370, color: "blue" as const, width: 6 },
    { endY: 440, color: "red" as const, width: 4 },
    { endY: 510, color: "yellow" as const, width: 3 },
  ];

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox="0 0 1400 600"
        className="w-full h-full overflow-visible"
        style={{}}
        shapeRendering="geometricPrecision"
      >
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="centerRing" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="85%" stopColor="transparent" />
            <stop offset="90%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glowBlue">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowRed">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="lineGradBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="outputRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="40%" stopColor="#EF4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="outputBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="40%" stopColor="#60A5FA" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="outputGreen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="40%" stopColor="#10B981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="outputYellow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Center glow */}
        <circle cx={centerX} cy={centerY} r="160" fill="url(#centerGlow)" />
        <circle cx={centerX} cy={centerY} r="120" fill="url(#centerRing)" />

        {/* Orbit rings */}
        {[100, 130, 155].map((r, i) => (
          <circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={r}
            fill="none"
            stroke="#3B82F6"
            strokeOpacity={0.08 + i * 0.03}
            strokeWidth="1"
          />
        ))}

        {/* Source lines */}
        {sources.map((_, i) => {
          const isHovered = hoveredSource === i;
          return (
            <g key={i}>
              <motion.path
                d={generatePath(i)}
                fill="none"
                stroke="url(#lineGradBlue)"
                strokeWidth={isHovered ? 3 : 1.5}
                strokeOpacity={isHovered ? 1 : 0.5}
                filter={isHovered ? "url(#glowBlue)" : undefined}
                initial={false}
                animate={{ strokeOpacity: isHovered ? 1 : 0.5 }}
                transition={{ duration: 0.3 }}
              />
              {/* Animated dash overlay */}
              <motion.path
                d={generatePath(i)}
                fill="none"
                stroke="#60A5FA"
                strokeWidth={1}
                strokeOpacity={isHovered ? 0.8 : 0.15}
                strokeDasharray="4 16"
                className="animate-flow-dash"
              />
            </g>
          );
        })}

        {/* Output flow paths */}
        {outputPaths.map((op, i) => (
          <g key={`out-${i}`}>
            <motion.path
              d={generateOutputPath(op.endY, op.color)}
              fill="none"
              stroke={`url(#output${op.color.charAt(0).toUpperCase() + op.color.slice(1)})`}
              strokeWidth={op.width}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: "easeOut" }}
            />
          </g>
        ))}

        {/* Source labels and dots */}
        {sources.map((name, i) => {
          const y = getSourceY(i);
          const isHovered = hoveredSource === i;
          return (
            <g
              key={name}
              onMouseEnter={() => setHoveredSource(i)}
              onMouseLeave={() => setHoveredSource(null)}
              className="cursor-pointer"
            >
              <text
                x={sourceStartX}
                y={y + 5}
                fill={isHovered ? "#60A5FA" : "#94A3B8"}
                fontSize="12"
                fontFamily="Inter, sans-serif"
                textAnchor="start"
                className="transition-colors"
              >
                {name}
              </text>
              {/* Glowing dot */}
              <circle
                cx={240}
                cy={y}
                r={isHovered ? 6 : 4}
                fill="#3B82F6"
                opacity={isHovered ? 1 : 0.7}
                filter="url(#glowBlue)"
                className="transition-all duration-300"
              />
              <circle
                cx={240}
                cy={y}
                r={2}
                fill="#60A5FA"
              />
              {/* Hover area */}
              <rect
                x={sourceStartX - 10}
                y={y - 15}
                width={270}
                height={30}
                fill="transparent"
              />
            </g>
          );
        })}

        {/* Center metric text */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          fill="#000000"
          fontSize="52"
          fontFamily="Geist Mono, monospace"
          fontWeight="700"
        >
          612K
        </text>
        <text
          x={centerX + 65}
          y={centerY - 25}
          textAnchor="start"
          fill="#34D399"
          fontSize="13"
          fontFamily="Geist Mono, monospace"
          fontWeight="500"
        >
          +0.9%
        </text>
        <text
          x={centerX}
          y={centerY + 20}
          textAnchor="middle"
          fill="#64748B"
          fontSize="13"
          fontFamily="Inter, sans-serif"
        >
          Unique Risks Conditions
        </text>
      </svg>
    </div>
  );
};

export default FlowVisualization;

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

/**
 * Blast-radius edge: inactive = dim teal; active = danger red + animated dash.
 */
export function BlastRadiusEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const blast = Boolean((data as { blast?: boolean } | undefined)?.blast);

  return (
    <BaseEdge
      id={id}
      path={path}
      className={
        blast
          ? "animate-blast-edge-dash !stroke-[#EF4444]"
          : "!stroke-[#00C2CB]/55"
      }
      style={{
        strokeWidth: blast ? 2.75 : 1.5,
        strokeDasharray: blast ? "10 6" : undefined,
        filter: blast ? "drop-shadow(0 0 5px rgba(239, 68, 68, 0.85))" : undefined,
      }}
    />
  );
}

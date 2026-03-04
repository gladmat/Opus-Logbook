import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import { Specialty } from "@/types/case";
import { SPECIALTY_ICON_PATHS } from "@/assets/specialty-icons";

interface SpecialtyIconProps {
  specialty: Specialty;
  size?: number;
  color: string;
}

export function SpecialtyIcon({
  specialty,
  size = 24,
  color,
}: SpecialtyIconProps) {
  const icon = SPECIALTY_ICON_PATHS[specialty];
  if (!icon) return null;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {icon.strokes.map((stroke, i) => (
        <Path
          key={i}
          d={stroke.d}
          stroke={color}
          strokeWidth={stroke.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {icon.circles?.map((circle, i) => (
        <Circle
          key={`c${i}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          {...(circle.fill
            ? { fill: color }
            : {
                stroke: color,
                strokeWidth: 1.8,
                strokeLinecap: "round" as const,
                strokeLinejoin: "round" as const,
              })}
        />
      ))}
    </Svg>
  );
}

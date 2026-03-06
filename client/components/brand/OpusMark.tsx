import React from "react";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Approximate arc length of the brand mark path.
 * The arc is 316° of a circle with radius 39.2:
 *   2 × π × 39.2 × (316 / 360) ≈ 216.1
 */
const ARC_LENGTH = 2 * Math.PI * 39.2 * (316 / 360);
const GAP_LENGTH = 2 * Math.PI * 39.2 * (44 / 360);

interface OpusMarkProps {
  size?: number;
  color?: string;
  /** When true, the arc draws on over 900ms. Default: false (static). */
  animate?: boolean;
}

/**
 * Opus brand mark — Interrupted Circle
 * A monoline circle with an asymmetric gap at the top.
 *
 * The SVG path draws an arc leaving a gap centered near 12 o'clock.
 * Stroke width scales proportionally: 7.2% of viewBox size.
 *
 * @param size - Width and height in points (default: 32)
 * @param color - Stroke color (default: '#E5A00D')
 * @param animate - Draw-on animation (default: false)
 */
export function OpusMark({
  size = 32,
  color = "#E5A00D",
  animate = false,
}: OpusMarkProps) {
  const dashOffset = useSharedValue(animate ? ARC_LENGTH : 0);

  React.useEffect(() => {
    if (!animate) return;
    dashOffset.value = withTiming(0, {
      duration: 900,
      easing: Easing.inOut(Easing.ease),
    });
  }, [animate]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  if (!animate) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Path
          d="M 64.68 13.65 A 39.2 39.2 0 1 1 35.32 13.65"
          stroke={color}
          strokeWidth={7.2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <AnimatedPath
        d="M 64.68 13.65 A 39.2 39.2 0 1 1 35.32 13.65"
        stroke={color}
        strokeWidth={7.2}
        strokeLinecap="round"
        strokeDasharray={[ARC_LENGTH, GAP_LENGTH]}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

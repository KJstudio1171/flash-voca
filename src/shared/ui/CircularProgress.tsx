import { memo, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/src/shared/theme/ThemeProvider";

type CircularProgressProps = {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  trackColor?: string;
  centerSlot?: ReactNode;
};

function CircularProgressComponent({
  size = 48,
  strokeWidth = 4,
  progress,
  color,
  trackColor,
  centerSlot,
}: CircularProgressProps) {
  const { colors } = useTheme();
  const effectiveColor = color ?? colors.primary;
  const effectiveTrackColor = trackColor ?? colors.line;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const percent = Math.round(clampedProgress * 100);

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={effectiveTrackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          stroke={effectiveColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View style={styles.labelContainer}>
        {centerSlot ?? (
          <Text
            style={[
              styles.label,
              { color: effectiveColor, fontSize: size * 0.23 },
            ]}
          >
            {percent}%
          </Text>
        )}
      </View>
    </View>
  );
}

export const CircularProgress = memo(CircularProgressComponent);

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "700",
  },
});

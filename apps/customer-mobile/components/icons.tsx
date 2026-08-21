import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../lib/theme';

/**
 * The icon set from the design, as SVG paths.
 *
 * Hand-drawn rather than pulled from a font: the design's glyphs are a specific
 * 20×20 line set at 1.5/1.8 stroke weight, and swapping in Ionicons would give
 * the tab bar a different visual weight than everything around it.
 */

interface IconProps {
  size?: number;
  color?: string;
  /** Tab icons thicken when selected. */
  active?: boolean;
}

const strokeFor = (active?: boolean) => (active ? 1.8 : 1.5);

export function HomeIcon({ size = 21, color = colors.ink3, active }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 9.4L10 4l7 5.4V16a1 1 0 01-1 1h-3.4v-4.4H7.4V17H4a1 1 0 01-1-1V9.4z"
        stroke={color}
        strokeWidth={strokeFor(active)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SearchIcon({ size = 21, color = colors.ink3, active }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={9} cy={9} r={6.4} stroke={color} strokeWidth={strokeFor(active)} />
      <Path
        d="M13.8 13.8L17.4 17.4"
        stroke={color}
        strokeWidth={strokeFor(active)}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SubscribeIcon({ size = 21, color = colors.ink3, active }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10a6 6 0 019.8-4.6M16 10a6 6 0 01-9.8 4.6M13 4.4h1.6V6M7 15.6H5.4V14"
        stroke={color}
        strokeWidth={strokeFor(active)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BagIcon({ size = 21, color = colors.ink3, active }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4.6 6.4h10.8l-1 9.4a1.6 1.6 0 01-1.6 1.4H7.2a1.6 1.6 0 01-1.6-1.4l-1-9.4zM7.6 6.4V5a2.4 2.4 0 014.8 0v1.4"
        stroke={color}
        strokeWidth={strokeFor(active)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UserIcon({ size = 21, color = colors.ink3, active }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 10.4a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM4 17c0-2.8 2.7-4.4 6-4.4s6 1.6 6 4.4"
        stroke={color}
        strokeWidth={strokeFor(active)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StarIcon({ size = 12, color = colors.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path d="M6 1l1.5 3.2L11 4.7 8.5 7.1 9.1 11 6 9.2 2.9 11l.6-3.9L1 4.7l3.5-.5z" fill={color} />
    </Svg>
  );
}

export function BellIcon({ size = 15, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 2a3.6 3.6 0 00-3.6 3.6c0 3.2-1.4 4.4-1.4 4.4h10s-1.4-1.2-1.4-4.4A3.6 3.6 0 008 2z"
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <Path
        d="M6.6 12.4a1.5 1.5 0 002.8 0"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PinIcon({ size = 16, color = colors.brandMid }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M8 14s5-4.2 5-7.6A5 5 0 003 6.4C3 9.8 8 14 8 14z" stroke={color} strokeWidth={1.4} />
      <Circle cx={8} cy={6.4} r={1.7} stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}

export function HeartIcon({ size = 17, color = colors.ink }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 15.5S2.5 11.8 2.5 7.4A3.6 3.6 0 019 5.3a3.6 3.6 0 016.5 2.1c0 4.4-6.5 8.1-6.5 8.1z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PhoneIcon({ size = 17, color = colors.bg }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path
        d="M4 3h3l1.4 3.4-2 1.3a8 8 0 004 4l1.3-2L15 11v3a1 1 0 01-1 1A11 11 0 013 4a1 1 0 011-1z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 28, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.6l4.4 4.4L19 7.4"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronIcon({ size = 11, color = colors.ink2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d="M3 4.5L6 7.5L9 4.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function TruckIcon({ size = 18, color = colors.bg }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M3 13h1.5a2 2 0 004 0H12V6H3v7z" stroke={color} strokeWidth={1.4} />
      <Path d="M12 8h3l2 3v2h-1.5a2 2 0 01-4 0" stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}

/* ---------------------------------------------------------------------------
 * Profile row glyphs
 *
 * Same 20x20 line set and stroke weight as the tab bar, so a row of them reads
 * as one family rather than a pile of borrowed icons.
 * ------------------------------------------------------------------------- */

export function BoxIcon({ size = 18, color = colors.brandMid }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 2.6l6.4 3.2v8.4L10 17.4 3.6 14.2V5.8L10 2.6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M3.6 5.8L10 9l6.4-3.2M10 9v8.4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CardIcon({ size = 18, color = colors.brandMid }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M2.8 6.2a1.6 1.6 0 011.6-1.6h11.2a1.6 1.6 0 011.6 1.6v7.6a1.6 1.6 0 01-1.6 1.6H4.4a1.6 1.6 0 01-1.6-1.6V6.2z"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path d="M2.8 8.4h14.4" stroke={color} strokeWidth={1.5} />
      <Path d="M5.8 12.4h3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function HelpIcon({ size = 18, color = colors.brandMid }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={7.2} stroke={color} strokeWidth={1.5} />
      <Path
        d="M8.2 8a1.9 1.9 0 013.6.8c0 1.3-1.8 1.6-1.8 2.9"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx={10} cy={14.2} r={0.85} fill={color} />
    </Svg>
  );
}

import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, border, font, type as typeScale } from '../lib/theme';

/**
 * The handful of shapes the design repeats on every screen: the primary
 * espresso button, the outline button, pill chips, the selection tile, the
 * radio row, and the card.
 *
 * They exist so that the espresso colour and the 14 px corner radius are
 * written once. Screens compose these rather than restyling a bare Pressable.
 */

// ---------------------------------------------------------------------------
// text
// ---------------------------------------------------------------------------

type TypeVariant = keyof typeof typeScale;

export function T({
  variant = 'body',
  color = colors.ink,
  style,
  children,
  numberOfLines,
  onPress,
}: {
  variant?: TypeVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  /** For inline text actions — "Pause", "See all". Adds a tap target, not a button. */
  onPress?: () => void;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
      suppressHighlighting={!onPress}
      style={[typeScale[variant], { color }, style]}
    >
      {children}
    </Text>
  );
}

/**
 * A number that must always read left-to-right — prices, phone numbers, ratings.
 * In an RTL layout React Native would otherwise reorder "4.9" around the dot.
 * `tabular-nums` is not available in RN, so widths are kept steady by the
 * font's own figures.
 */
export function Num({
  children,
  variant = 'label',
  color = colors.ink,
  style,
}: {
  children: ReactNode;
  variant?: TypeVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[typeScale[variant], { color, writingDirection: 'ltr' }, style]}>{children}</Text>
  );
}

// ---------------------------------------------------------------------------
// buttons
// ---------------------------------------------------------------------------

export function PrimaryButton({
  label,
  onPress,
  trailing,
  disabled,
  loading,
  tone = 'espresso',
  style,
}: {
  label: string;
  onPress?: () => void;
  /** Right-hand slot — the design puts the running total here on Checkout. */
  trailing?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  /** `cream` inverts the button for the dark onboarding and confirmation screens. */
  tone?: 'espresso' | 'cream';
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  const onCream = tone === 'cream';
  const foreground = onCream ? colors.ink : colors.bg;

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.primary,
        onCream && { backgroundColor: colors.bg },
        trailing ? styles.primaryWithTrailing : null,
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <Text style={[styles.primaryLabel, { color: foreground }]}>{label}</Text>
          {trailing}
        </>
      )}
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  tone = 'ink',
  style,
}: {
  label: string;
  onPress?: () => void;
  /** `danger` is the sign-out treatment; `light` sits on a dark background. */
  tone?: 'ink' | 'danger' | 'light';
  style?: StyleProp<ViewStyle>;
}) {
  const tint = tone === 'danger' ? colors.red : tone === 'light' ? colors.bg : colors.ink;
  const line =
    tone === 'danger'
      ? 'rgba(201,75,75,0.3)'
      : tone === 'light'
        ? 'rgba(248,244,238,0.28)'
        : border.soft;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.outline,
        { borderColor: line, backgroundColor: tone === 'ink' ? colors.surface : 'transparent' },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.outlineLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

/** Square back button used on every pushed screen. */
export function BackButton({
  onPress,
  tone = 'light',
}: {
  onPress: () => void;
  /** `dark` sits on the espresso/forest headers. */
  tone?: 'light' | 'dark' | 'floating';
}) {
  // The glyph points the way "back" actually is for the current layout.
  const glyph = I18nManager.isRTL ? '→' : '←';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.iconSquare,
        tone === 'dark' && { backgroundColor: 'transparent', borderColor: 'rgba(248,244,238,0.2)' },
        tone === 'floating' && {
          backgroundColor: 'rgba(248,244,238,0.92)',
          borderColor: 'transparent',
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={{ fontSize: 17, color: tone === 'dark' ? colors.bg : colors.ink }}>{glyph}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// chips and selection
// ---------------------------------------------------------------------------

export function Chip({
  label,
  active,
  onPress,
  compact,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        compact && { paddingVertical: 8, paddingHorizontal: 14 },
        active ? styles.chipActive : styles.chipIdle,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipLabel, { color: active ? colors.bg : colors.brown }]}>{label}</Text>
    </Pressable>
  );
}

/** The grind / weight / frequency selector tile. */
export function SelectTile({
  label,
  active,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectTile,
        {
          backgroundColor: active ? colors.espresso : colors.surface,
          borderColor: active ? colors.espresso : border.soft,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.selectLabel, { color: active ? colors.bg : colors.ink }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Delivery-method / payment-method row with a radio on the leading edge. */
export function OptionRow({
  active,
  onPress,
  children,
}: {
  active?: boolean;
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        { borderColor: active ? colors.espresso : 'rgba(33,23,18,0.09)' },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[styles.radio, { borderColor: active ? colors.espresso : 'rgba(33,23,18,0.25)' }]}
      >
        {active ? <View style={styles.radioDot} /> : null}
      </View>
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// containers
// ---------------------------------------------------------------------------

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return <View style={[styles.card, padded && { padding: 16 }, style]}>{children}</View>;
}

/** Full-screen empty / error state: circle icon, title, body, optional action. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon}</View>
      <T variant="title">{title}</T>
      <T variant="body" color={colors.ink2} style={{ textAlign: 'center', maxWidth: 250 }}>
        {body}
      </T>
      {action}
    </View>
  );
}

/**
 * Skeleton block for the loading state. A steady tinted block rather than an
 * animated shimmer: the shimmer in the prototype swept left-to-right, which
 * reads backwards in an RTL layout.
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.skeleton, style]} />;
}

const styles = StyleSheet.create({
  primary: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryWithTrailing: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  primaryLabel: { fontFamily: font.semibold, fontSize: 15, color: colors.bg },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },

  outline: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  outlineLabel: { fontFamily: font.medium, fontSize: 14.5 },

  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.soft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  chipIdle: { backgroundColor: colors.surface, borderColor: border.soft },
  chipLabel: { fontFamily: font.semibold, fontSize: 12.5 },

  selectTile: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  selectLabel: { fontFamily: font.semibold, fontSize: 13.5 },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.espresso,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border.hair,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: 'rgba(197,139,85,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  skeleton: {
    backgroundColor: '#EDE6DD',
    borderRadius: 12,
  },
});

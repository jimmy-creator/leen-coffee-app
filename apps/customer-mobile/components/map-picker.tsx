import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import type { LatLng } from '@leen/types';
import { DEFAULT_CENTER, MAX_ZOOM, MIN_ZOOM, panCenter, staticMapUrl } from '../lib/mapbox';
import { colors, border, font } from '../lib/theme';
import { onSurface } from '@leen/ui/palette';
import { PinIcon } from './icons';
import { T } from './primitives';

/**
 * Drop-a-pin map, built on static tiles.
 *
 * The pin is fixed dead centre and the map moves underneath it — the standard
 * pattern, and the only one that works here: a static image cannot report where
 * a tap landed in geographic terms, but the centre is always known exactly.
 *
 * Panning updates a local offset immediately so the drag feels attached to the
 * finger, and only commits a new centre (and therefore a new tile request) when
 * the gesture ends. Requesting a tile per frame would be both unusable and a
 * fast way through the Mapbox quota.
 */
export function MapPicker({
  value,
  onChange,
  height = 320,
}: {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  height?: number;
}) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth;

  const [center, setCenter] = useState<LatLng>(value ?? DEFAULT_CENTER);
  const [zoom, setZoom] = useState(15);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [locating, setLocating] = useState(false);

  // The responder closes over these, and it is created once — a ref keeps it
  // reading current values instead of the ones from first render.
  const live = useRef({ center, zoom });
  live.current = { center, zoom };

  useEffect(() => {
    if (value) setCenter(value);
  }, [value]);

  const commit = useCallback(
    (next: LatLng) => {
      setCenter(next);
      setOffset({ x: 0, y: 0 });
      onChange(next);
    },
    [onChange],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderMove: (_e, g) => setOffset({ x: g.dx, y: g.dy }),
        onPanResponderRelease: (_e, g) => {
          const { center: c, zoom: z } = live.current;
          commit(panCenter(c, z, g.dx, g.dy));
        },
        onPanResponderTerminate: () => setOffset({ x: 0, y: 0 }),
      }),
    [commit],
  );

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setZoom(17);
      commit({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch {
      // Location off, or no fix. The map stays where it is.
    } finally {
      setLocating(false);
    }
  }, [commit]);

  // Oversized so a drag reveals map rather than the background behind it.
  const tileWidth = width * 1.6;
  const tileHeight = height * 1.6;
  const uri = staticMapUrl(center, zoom, tileWidth, tileHeight);

  return (
    <View style={[styles.root, { height }]} {...responder.panHandlers}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.tile,
            {
              width: tileWidth,
              height: tileHeight,
              left: (width - tileWidth) / 2 + offset.x,
              top: (height - tileHeight) / 2 + offset.y,
            },
          ]}
          contentFit="cover"
          transition={120}
          // Tiles repeat heavily while panning; caching them keeps the map from
          // flashing white on every commit.
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.noToken}>
          <T variant="caption" color={colors.ink2}>
            {t('addresses.map.unavailable')}
          </T>
        </View>
      )}

      {/* Fixed centre pin. Offset up by its own height so the point sits on the
          centre of the map, not the middle of the glyph. */}
      <View style={styles.pinWrap} pointerEvents="none">
        <View style={styles.pin}>
          <PinIcon size={20} color={colors.surface} />
        </View>
        <View style={styles.pinStem} />
        <View style={styles.pinShadow} />
      </View>

      <View style={styles.zoomStack}>
        <Pressable
          onPress={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
          style={styles.zoomButton}
        >
          <T variant="title" color={colors.ink}>
            +
          </T>
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable
          onPress={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
          style={styles.zoomButton}
        >
          <T variant="title" color={colors.ink}>
            −
          </T>
        </Pressable>
      </View>

      <Pressable onPress={() => void useMyLocation()} style={styles.locateButton}>
        {locating ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : (
          <>
            <PinIcon size={14} color={colors.brand} />
            <T variant="micro" color={colors.brand} style={{ fontFamily: font.semibold }}>
              {t('addresses.map.useMyLocation')}
            </T>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  tile: { position: 'absolute' },
  noToken: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

  pinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
    // Lifts the pin so its tip, not its centre, marks the spot.
    transform: [{ translateY: -22 }],
  },
  pinStem: {
    width: 2,
    height: 12,
    backgroundColor: colors.brand,
    transform: [{ translateY: -22 }],
  },
  pinShadow: {
    width: 12,
    height: 4,
    borderRadius: 999,
    backgroundColor: onSurface(0.22),
    transform: [{ translateY: -20 }],
  },

  zoomStack: {
    position: 'absolute',
    end: 14,
    top: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border.soft,
    overflow: 'hidden',
  },
  zoomButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: border.hair },

  locateButton: {
    position: 'absolute',
    start: 14,
    bottom: 14,
    height: 36,
    minWidth: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: border.soft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

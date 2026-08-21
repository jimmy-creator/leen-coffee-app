import '../lib/i18n';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  IBMPlexSansArabic_300Light,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { SessionProvider } from '../lib/session';
import { CartProvider } from '../lib/cart';
import { AddressProvider } from '../lib/address';
import { NotificationProvider } from '../lib/notifications';
import { colors } from '../lib/theme';

// Hold the native splash until the fonts are in memory. Without this the first
// frame renders in the system font and then reflows — very visible in Arabic,
// where the fallback has different metrics entirely.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic_300Light,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  useEffect(() => {
    // Hide on error too: a missing font should degrade to the system face, not
    // leave the customer staring at a splash screen forever.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.blank} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SessionProvider>
        <CartProvider>
          <AddressProvider>
            <NotificationProvider>
              {/* Screens draw their own headers — the design has no system header
              anywhere, and several screens run artwork under the status bar. */}
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="welcome" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="otp" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="store/[id]" />
                <Stack.Screen name="product/[id]" />
                <Stack.Screen name="checkout" />
                <Stack.Screen name="order-confirmed" options={{ gestureEnabled: false }} />
                <Stack.Screen name="track/[code]" />
                <Stack.Screen name="orders" />
                <Stack.Screen name="loyalty" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="addresses" />
                <Stack.Screen name="address-form" options={{ presentation: 'modal' }} />
              </Stack>
            </NotificationProvider>
          </AddressProvider>
        </CartProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
});

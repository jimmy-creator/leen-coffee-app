// Hermes ships without Intl.PluralRules, and Arabic needs all six plural
// categories (zero/one/two/few/many/other) for strings like "3 results".
import 'intl-pluralrules';
import { DevSettings, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, defaultLocale, isRtl, type Locale } from '@leen/i18n';

const LANG_KEY = 'leen.merchant.lang.v1';

I18nManager.allowRTL(true);

/**
 * Flip the native RTL flag to match the locale. Returns true when it actually
 * changed, in which case the caller reloads — React Native only mirrors the
 * layout on a fresh start, so without the reload Arabic text lands in a
 * left-to-right layout.
 */
function syncDirection(locale: Locale): boolean {
  const rtl = isRtl(locale);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.forceRTL(rtl);
  return true;
}

/**
 * Reload the JS bundle. `DevSettings.reload()` is stubbed to a no-op in release
 * builds, so a store build has to go through expo-updates instead — otherwise
 * switching language would translate the text but leave the layout mirrored
 * the wrong way until the user force-quit the app.
 */
async function reloadApp(): Promise<void> {
  if (__DEV__) {
    DevSettings.reload();
    return;
  }
  await Updates.reloadAsync();
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: defaultLocale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

  // Restore the saved language. If its direction disagrees with the current
  // native layout — first launch, or a language set on a previous run — correct
  // it once and reload.
  void AsyncStorage.getItem(LANG_KEY).then((saved) => {
    const locale = ((saved as Locale) ?? defaultLocale) as Locale;
    if (saved && saved !== i18n.language) void i18n.changeLanguage(saved);
    if (syncDirection(locale)) {
      void reloadApp().catch(() => {
        // The flag is already set, so it applies on the next launch regardless.
      });
    }
  });
}

/** Switch language, persist it, and reload so the layout direction follows. */
export async function setAppLanguage(locale: Locale): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, locale);
  await i18n.changeLanguage(locale);
  const flipped = syncDirection(locale);
  if (!flipped) return;
  try {
    await reloadApp();
  } catch {
    // Text updates live via react-i18next; direction applies next launch.
  }
}

export default i18n;

import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LatLng } from '@leen/types';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { useAddresses } from '../lib/address';
import { useFormat } from '../lib/format';
import { hasMapbox, reverseGeocode } from '../lib/mapbox';
import { colors, border, font } from '../lib/theme';
import { onSurface } from '@leen/ui/palette';
import { MapPicker } from '../components/map-picker';
import { PinIcon } from '../components/icons';
import { BackButton, Card, PrimaryButton, T } from '../components/primitives';

/**
 * New address, in two steps.
 *
 * The pin comes first because it is the part that actually gets the coffee to
 * the door: Saudi National Address fields are typed from memory and often
 * approximate, whereas a dropped pin is exact and is what the rider navigates
 * to. Picking the location also pre-fills the form, so the typing that remains
 * is correction rather than recall.
 *
 * Street, district and city stay required and editable — reverse geocoding is a
 * head start, not an authority, and Mapbox's district coverage in Saudi is
 * uneven enough that a customer must always be able to fix it.
 */
export default function AddressForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const f = useFormat();
  const { userId } = useSession();
  const { refresh: refreshAddresses } = useAddresses();

  // Skip straight to the form when there is no Mapbox token — a broken map is
  // worse than no map, and the address is still enterable by hand.
  const [step, setStep] = useState<'pin' | 'details'>(hasMapbox ? 'pin' : 'details');

  const [point, setPoint] = useState<LatLng | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const [label, setLabel] = useState('');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [additionalNumber, setAdditionalNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = street.trim() && district.trim() && city.trim();

  /** Resolve the pin, prefill what came back, and move to the form. */
  const confirmPin = useCallback(async () => {
    if (!point) return;
    setResolving(true);
    try {
      const found = await reverseGeocode(point, f.locale);
      if (found) {
        // Only fill blanks — never clobber something already typed.
        if (found.street) setStreet((v) => v || found.street || '');
        if (found.district) setDistrict((v) => v || found.district || '');
        if (found.city) setCity((v) => v || found.city || '');
        if (found.postalCode) setPostalCode((v) => v || found.postalCode || '');
        if (found.buildingNumber) setBuildingNumber((v) => v || found.buildingNumber || '');
        setPinLabel(found.label);
      }
    } finally {
      setResolving(false);
      setStep('details');
    }
  }, [point, f.locale]);

  async function save() {
    if (!userId) return;
    if (!valid) {
      setError(t('addresses.form.required'));
      return;
    }
    setSaving(true);

    // The first address a customer saves becomes the default, so checkout has
    // something selected without them having to think about it.
    const { count } = await supabase.from('addresses').select('id', { count: 'exact', head: true });

    const { error: saveError } = await supabase.from('addresses').insert({
      user_id: userId,
      label: label.trim() || t('addresses.form.labelPlaceholder'),
      street: street.trim(),
      district: district.trim(),
      city: city.trim(),
      building_number: buildingNumber.trim() || null,
      postal_code: postalCode.trim() || null,
      additional_number: additionalNumber.trim() || null,
      notes: notes.trim() || null,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      is_default: (count ?? 0) === 0,
    });

    setSaving(false);
    if (saveError) {
      setError(t('common.somethingWrong'));
      return;
    }
    await refreshAddresses();
    router.back();
  }

  if (step === 'pin') {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <BackButton onPress={() => router.back()} />
          <T variant="h3" style={{ fontSize: 18 }}>
            {t('addresses.map.title')}
          </T>
        </View>

        <MapPicker value={point} onChange={setPoint} height={380} />

        <View style={[styles.pinFooter, { paddingBottom: insets.bottom + 16 }]}>
          <T variant="body" color={colors.ink2}>
            {t('addresses.map.hint')}
          </T>

          {point ? (
            <Card style={styles.coordCard}>
              <PinIcon size={16} color={colors.brandMid} />
              <T variant="caption" color={colors.ink2} style={{ flex: 1 }} numberOfLines={2}>
                {pinLabel ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
              </T>
            </Card>
          ) : null}

          <PrimaryButton
            label={t('addresses.map.confirm')}
            disabled={!point}
            loading={resolving}
            onPress={() => void confirmPin()}
          />
          <T
            variant="caption"
            color={colors.ink3}
            style={{ textAlign: 'center' }}
            onPress={() => setStep('details')}
          >
            {t('addresses.map.skip')}
          </T>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => (hasMapbox ? setStep('pin') : router.back())} />
        <T variant="h3" style={{ fontSize: 18 }}>
          {t('addresses.form.title')}
        </T>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
        keyboardShouldPersistTaps="handled"
      >
        {point ? (
          <Card style={styles.coordCard}>
            <PinIcon size={16} color={colors.brandMid} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="micro" color={colors.ink3}>
                {t('addresses.map.pinned')}
              </T>
              <T variant="caption" numberOfLines={2}>
                {pinLabel ?? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
              </T>
            </View>
            <T
              variant="micro"
              color={colors.brandMid}
              style={{ fontFamily: font.semibold }}
              onPress={() => setStep('pin')}
            >
              {t('common.change')}
            </T>
          </Card>
        ) : null}

        <Field
          label={t('addresses.form.label')}
          value={label}
          onChange={setLabel}
          placeholder={t('addresses.form.labelPlaceholder')}
        />
        <Field label={t('addresses.form.street')} value={street} onChange={setStreet} required />
        <Field
          label={t('addresses.form.district')}
          value={district}
          onChange={setDistrict}
          required
        />
        <Field label={t('addresses.form.city')} value={city} onChange={setCity} required />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field
            label={t('addresses.form.buildingNumber')}
            value={buildingNumber}
            onChange={setBuildingNumber}
            keyboardType="number-pad"
            style={{ flex: 1 }}
          />
          <Field
            label={t('addresses.form.postalCode')}
            value={postalCode}
            onChange={setPostalCode}
            keyboardType="number-pad"
            style={{ flex: 1 }}
          />
        </View>

        <Field
          label={t('addresses.form.additionalNumber')}
          value={additionalNumber}
          onChange={setAdditionalNumber}
          keyboardType="number-pad"
        />
        <Field label={t('addresses.form.notes')} value={notes} onChange={setNotes} multiline />

        {error ? (
          <T variant="caption" color={colors.danger}>
            {error}
          </T>
        ) : null}

        <PrimaryButton
          label={t('addresses.form.saveAddress')}
          disabled={!valid}
          loading={saving}
          onPress={() => void save()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  multiline,
  keyboardType,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
  style?: object;
}) {
  return (
    <View style={[{ gap: 7 }, style]}>
      <T variant="caption" color={colors.ink2} style={{ fontFamily: font.semibold }}>
        {required ? `${label} *` : label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={[styles.input, multiline && { height: 88, paddingTop: 14 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: onSurface(0.06),
  },
  scroll: { padding: 20, gap: 16 },
  pinFooter: { flex: 1, padding: 20, gap: 14, justifyContent: 'flex-end' },
  coordCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  input: {
    height: 52,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: border.soft,
    backgroundColor: colors.surface,
    fontFamily: font.medium,
    fontSize: 14.5,
    color: colors.ink,
    textAlignVertical: 'top',
  },
});

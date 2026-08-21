import { useState } from 'react';
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
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { colors, border, font } from '../lib/theme';
import { PrimaryButton, T } from '../components/primitives';

/**
 * New address, in Saudi National Address terms.
 *
 * Street, district and city are required; building number, postal code and the
 * additional number are optional because a customer often does not know them
 * off the top of their head, and delivery in KSA works off the district anyway.
 */
export default function AddressForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useSession();

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
      is_default: (count ?? 0) === 0,
    });

    setSaving(false);
    if (saveError) {
      setError(t('common.somethingWrong'));
      return;
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
        keyboardShouldPersistTaps="handled"
      >
        <T variant="h3" style={{ fontSize: 18 }}>
          {t('addresses.form.title')}
        </T>

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
  scroll: { padding: 20, gap: 16 },
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

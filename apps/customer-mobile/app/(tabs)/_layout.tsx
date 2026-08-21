import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, border, font } from '../../lib/theme';
import { useCart } from '../../lib/cart';
import { useFormat } from '../../lib/format';
import { BagIcon, HomeIcon, SearchIcon, SubscribeIcon, UserIcon } from '../../components/icons';
import { T } from '../../components/primitives';

/** Count badge on the Cart tab. Hidden at zero rather than showing "0". */
function CartBadge() {
  const { count } = useCart();
  const f = useFormat();
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <T variant="micro" color={colors.bg} style={{ fontSize: 9, lineHeight: 12 }}>
        {f.num(count)}
      </T>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.espresso,
        tabBarInactiveTintColor: colors.ink4,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => <HomeIcon color={color} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color, focused }) => <SearchIcon color={color} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="subscribe"
        options={{
          title: t('tabs.subscribe'),
          tabBarIcon: ({ color, focused }) => <SubscribeIcon color={color} active={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('tabs.cart'),
          tabBarIcon: ({ color, focused }) => (
            <View>
              <BagIcon color={color} active={focused} />
              <CartBadge />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => <UserIcon color={color} active={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(248,244,238,0.97)',
    borderTopWidth: 1,
    borderTopColor: border.hair,
    height: 88,
    paddingTop: 9,
    paddingBottom: 30,
  },
  label: { fontFamily: font.medium, fontSize: 10.5, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -4,
    // `end` rather than `right` so the badge mirrors with the layout.
    end: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

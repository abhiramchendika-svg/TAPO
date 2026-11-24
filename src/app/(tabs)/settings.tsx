import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { Icon, type IconName } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { Button, Field, Notice, Panel, Screen, SectionHeader, Title } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { initials } from '../../lib/format';
import { DISPLAY_NAME_MAX, validateDisplayName } from '../../lib/validation';
import { useWallet } from '../../lib/wallet';
import { colors, fonts, radius, space, type } from '../../theme';

type Pending = 'reset' | 'clear' | null;

export default function SettingsScreen() {
  const { resetDemo, clearAll, data, setOnboarded } = useWallet();
  const devUnlocked = data.devSettings?.unlocked === true;
  const [pending, setPending] = useState<Pending>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function confirm() {
    if (pending === 'reset') {
      await resetDemo();
      setMessage('Demo data restored: 4 sample cards and sample transactions.');
    } else if (pending === 'clear') {
      await clearAll();
      setMessage('All cards and transactions removed from this device.');
    }
    setPending(null);
  }

  return (
    <Screen>
      <Title kicker="Preferences">Settings</Title>

      <SectionHeader title="Account" />
      <AccountSection />

      <SectionHeader title="Profile" />
      <ProfileSection />

      <SectionHeader title="Demo data" />
      <Panel style={{ gap: space.md }}>
        <Text style={type.small}>
          {data.cards.length} card{data.cards.length === 1 ? '' : 's'} and {data.transactions.length} sample
          transactions are stored on this device only.
        </Text>
        {pending ? (
          <View style={{ gap: space.sm }} accessibilityLiveRegion="polite">
            <Text style={[type.body, { fontWeight: '600' }]}>
              {pending === 'reset'
                ? 'Replace everything with the original demo data? Cards you added will be removed.'
                : 'Remove all cards and transactions? You can restore demo data later.'}
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label="Cancel" variant="secondary" onPress={() => setPending(null)} style={{ flex: 1 }} />
              <Button
                label={pending === 'reset' ? 'Yes, reset' : 'Yes, remove'}
                variant="danger"
                onPress={confirm}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <>
            <Button
              label="Reset demo data"
              icon="refresh"
              variant="secondary"
              onPress={() => {
                setMessage(null);
                setPending('reset');
              }}
            />
            <Button
              label="Remove all cards"
              icon="trash"
              variant="danger"
              onPress={() => {
                setMessage(null);
                setPending('clear');
              }}
            />
          </>
        )}
        {message ? (
          <Text style={[type.small, { color: colors.success, fontWeight: '600' }]} accessibilityRole="alert">
            {message}
          </Text>
        ) : null}
      </Panel>

      <SectionHeader title="Privacy" />
      <Panel style={{ gap: space.lg }}>
        <Bullet icon="wallet">Data stays on this device in local app storage. Nothing is sent to a server.</Bullet>
        <Bullet icon="card">
          We only store your account name and email, a secure hash of your password (never the password itself), an
          optional display name, plus each card’s nickname, fictional issuer, network, card type, last four digits and
          reward rules.
        </Bullet>
        <Bullet icon="lock">
          We never ask for or store full card numbers, CVV, PIN, OTP, expiry dates, bank logins or payment tokens.
          Never enter them into any app you don’t trust.
        </Bullet>
        <Bullet icon="shield">No analytics, ads or tracking are included.</Bullet>
      </Panel>

      <SectionHeader title="About" />
      <View style={{ alignItems: 'center', paddingVertical: space.lg, gap: space.sm }}>
        <Logo size={44} tagline="Rewards wallet · demo" />
        <VersionTapper unlocked={devUnlocked} />
      </View>
      {devUnlocked ? (
        <Button
          label="Developer tools"
          variant="secondary"
          icon="code"
          iconRight="arrowRight"
          onPress={() => router.push('/developer')}
          accessibilityHint="Opens testing tools for the prototype"
          style={{ marginBottom: space.md }}
        />
      ) : null}
      <Button
        label="How TAPO works"
        variant="outline"
        iconRight="arrowRight"
        onPress={() => router.push('/how-it-works')}
        style={{ marginBottom: space.md }}
      />
      <Button
        label="Show introduction again"
        variant="ghost"
        icon="refresh"
        onPress={() => {
          setOnboarded(false);
          router.replace('/onboarding');
        }}
        accessibilityHint="Replays the welcome screens shown on first launch"
        style={{ marginBottom: space.md }}
      />
      <Notice title="Prototype only">
        This is a demonstration app. It cannot make payments and has no partnership, approval or affiliation with
        any bank, card network or payment provider. Issuer names and reward rules are fictional samples.
      </Notice>
    </Screen>
  );
}

const DEV_TAPS = 7;

/**
 * Tap the version DEV_TAPS times to unlock the developer screen. Once unlocked, Settings keeps a
 * "Developer tools" link until it is hidden again from the developer screen.
 */
function VersionTapper({ unlocked }: { unlocked: boolean }) {
  const { setDevUnlocked } = useWallet();
  const [taps, setTaps] = useState(0);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const left = DEV_TAPS - taps;
  if (unlocked) {
    return <Text style={type.caption}>Version {version} · Developer tools on</Text>;
  }
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Pressable
        onPress={() => {
          const next = taps + 1;
          if (next >= DEV_TAPS) {
            setTaps(0);
            setDevUnlocked(true);
            router.push('/developer');
          } else {
            setTaps(next);
          }
        }}
        accessibilityLabel={`Version ${version}`}
        hitSlop={12}
        style={{ paddingVertical: 6, paddingHorizontal: 12 }}
      >
        <Text style={type.caption}>Version {version}</Text>
      </Pressable>
      {taps >= 3 ? (
        <Text style={[type.caption, { color: colors.textMuted }]} accessibilityLiveRegion="polite">
          {left} more {left === 1 ? 'tap' : 'taps'} for developer tools
        </Text>
      ) : null}
    </View>
  );
}

function AccountSection() {
  const { session, signOut, removeAccount } = useAuth();
  const [armed, setArmed] = useState(false);
  if (!session) return null;
  return (
    <Panel style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Text style={type.mono}>Signed in as</Text>
        <Text style={type.h2} numberOfLines={1}>
          {session.name}
        </Text>
        <Text style={[type.small, { color: colors.textMuted }]} numberOfLines={1}>
          {session.email}
        </Text>
      </View>
      <Text style={type.caption}>
        Your account and encrypted wallet are stored only on this device. TAPO locks after 10 minutes without activity.
      </Text>
      <Button label="Sign out" icon="lock" variant="secondary" onPress={signOut} />
      {armed ? (
        <View style={{ gap: space.sm }} accessibilityLiveRegion="polite">
          <Text style={[type.body, { fontWeight: '600' }]}>
            Delete this account and all its cards and spending from this device? This can’t be undone.
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Cancel" variant="secondary" onPress={() => setArmed(false)} style={{ flex: 1 }} />
            <Button label="Yes, delete" variant="danger" onPress={() => removeAccount(session.email)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Button label="Delete account" icon="trash" variant="ghost" onPress={() => setArmed(true)} />
      )}
    </Panel>
  );
}

function ProfileSection() {
  const { data, setProfile } = useWallet();
  const name = data.profile?.displayName;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [touched, setTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const error = touched ? validateDisplayName(draft) : null;

  function startEdit() {
    setDraft(name ?? '');
    setTouched(false);
    setMessage(null);
    setEditing(true);
  }

  function save() {
    setTouched(true);
    if (validateDisplayName(draft)) return;
    setProfile({ displayName: draft });
    setEditing(false);
    setMessage('Name saved on this device.');
  }

  function remove() {
    setProfile(undefined);
    setMessage('Name removed from this device.');
  }

  return (
    <Panel style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {name ? (
            <Text style={styles.avatarText}>{initials(name)}</Text>
          ) : (
            <Icon name="user" color={colors.onPrimary} size={26} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={type.mono}>Display name</Text>
          <Text style={[type.h2, { marginTop: 2 }, !name && { color: colors.textMuted }]} numberOfLines={1}>
            {name ?? 'Not set'}
          </Text>
          <Text style={[type.caption, { fontWeight: '500', marginTop: 2 }]}>Shown in your Wallet greeting</Text>
        </View>
      </View>

      {editing ? (
        <View>
          <Field
            label="Display name"
            value={draft}
            onChangeText={(t) => setDraft(t.replace(/\d/g, ''))}
            maxLength={DISPLAY_NAME_MAX}
            placeholder="e.g. Priya"
            autoCapitalize="words"
            autoComplete="off"
            importantForAutofill="no"
            error={error}
            hint={`${draft.trim().length}/${DISPLAY_NAME_MAX} · used only for your greeting`}
            returnKeyType="done"
            onSubmitEditing={save}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Cancel" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => setEditing(false)} />
            <Button label="Save" size="sm" style={{ flex: 1 }} onPress={save} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            label={name ? 'Edit name' : 'Add name'}
            icon={name ? 'edit' : 'plus'}
            variant="secondary"
            size="sm"
            style={{ flex: 1 }}
            onPress={startEdit}
          />
          {name ? (
            <Button label="Remove" icon="trash" variant="danger" size="sm" style={{ flex: 1 }} onPress={remove} />
          ) : null}
        </View>
      )}

      {message ? (
        <Text style={[type.small, { color: colors.success, fontWeight: '600' }]} accessibilityRole="alert">
          {message}
        </Text>
      ) : null}

      <Text style={type.caption}>
        Your name appears only in the Wallet greeting. Sample cards always show “DEMO CARDHOLDER”. No email, phone
        number or other personal details are collected.
      </Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.condensed,
    fontSize: 22,
    fontWeight: '800',
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
});

function Bullet({ children, icon }: { children: string; icon: IconName }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} color={colors.primary} size={19} />
      </View>
      <Text style={[type.body, { flex: 1, fontSize: 15 }]}>{children}</Text>
    </View>
  );
}

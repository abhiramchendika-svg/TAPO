import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Intro } from '../components/Intro';
import { Logo } from '../components/Logo';
import { Text } from '../components/Text';
import { Button, Field, Notice, Panel, Screen, Segmented } from '../components/ui';
import { AuthError, useAuth } from '../lib/auth';
import { DISPLAY_NAME_MAX } from '../lib/validation';
import { colors, space, type } from '../theme';

type Mode = 'signin' | 'signup';

/**
 * The only screen available while signed out. The logo intro plays every time it appears:
 * on each launch (sessions don't survive a restart) and after signing out.
 */
export default function SignInScreen() {
  const { signIn, signUp, removeAccount, accountCount, lockedForIdle } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [mode, setMode] = useState<Mode>(accountCount > 0 ? 'signin' : 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [removeArmed, setRemoveArmed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setPassword('');
    setConfirm('');
  }

  async function submit() {
    setError(null);
    setNotice(null);
    if (mode === 'signup' && password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(name, email, password);
      else await signIn(email, password);
      // On success the protected screens become available and the router moves on.
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Something went wrong. Please try again.');
      setPassword('');
      setConfirm('');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removeArmed) {
      setRemoveArmed(true);
      return;
    }
    const ok = await removeAccount(email);
    setRemoveArmed(false);
    setHelp(false);
    setPassword('');
    setNotice(ok ? 'That account and its data were removed from this device. You can create a new account.' : 'There’s no account with that email on this device.');
    if (ok) switchMode('signup');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <View style={styles.brand}>
          <Logo size={48} tagline="The right card, every time" />
        </View>

        <Text style={type.display} accessibilityRole="header">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </Text>
        <Text style={[type.body, { color: colors.textMuted, marginTop: space.sm, marginBottom: space.xl }]}>
          {lockedForIdle && mode === 'signin'
            ? 'TAPO locked after 10 minutes without activity. Sign in again to continue.'
            : mode === 'signup'
            ? 'Your account keeps your cards and spending private on this device.'
            : 'Sign in to see your cards and rewards.'}
        </Text>

        <Segmented
          label="Account"
          value={mode}
          onChange={switchMode}
          options={[
            { value: 'signin', label: 'Sign in' },
            { value: 'signup', label: 'Create account' },
          ]}
        />

        <View style={{ marginTop: space.xl }}>
          {mode === 'signup' ? (
            <Field
              label="Your name"
              value={name}
              onChangeText={(t) => setName(t.replace(/\d/g, ''))}
              maxLength={DISPLAY_NAME_MAX}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType={mode === 'signup' ? 'username' : 'emailAddress'}
            returnKeyType="next"
            maxLength={254}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!reveal}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            hint={mode === 'signup' ? 'At least 8 characters, with a letter and a number.' : undefined}
            returnKeyType={mode === 'signup' ? 'next' : 'go'}
            onSubmitEditing={mode === 'signin' ? submit : undefined}
            maxLength={128}
          />
          {mode === 'signup' ? (
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!reveal}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
              maxLength={128}
            />
          ) : null}
          <Button
            label={reveal ? 'Hide password' : 'Show password'}
            variant="ghost"
            size="sm"
            onPress={() => setReveal((r) => !r)}
            style={{ alignSelf: 'flex-start', marginBottom: space.md }}
          />

          {error ? (
            <Text style={[type.small, styles.error]} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {notice ? (
            <Text style={[type.small, styles.notice]} accessibilityRole="alert">
              {notice}
            </Text>
          ) : null}

          <Button
            label={busy ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : mode === 'signup' ? 'Create account' : 'Sign in'}
            iconRight={busy ? undefined : 'arrowRight'}
            onPress={submit}
            disabled={busy}
          />
        </View>

        {mode === 'signin' ? (
          <Button
            label="Can’t sign in?"
            variant="ghost"
            size="sm"
            onPress={() => {
              setHelp((h) => !h);
              setRemoveArmed(false);
            }}
            style={{ alignSelf: 'center', marginTop: space.md }}
          />
        ) : null}
        {help ? (
          <Panel style={{ gap: space.md, marginTop: space.sm }}>
            <Text style={type.small}>
              TAPO stores only a secure hash of your password on this device, so it can’t be recovered or reset. If you’ve
              forgotten it, you can remove the account and its data from this device, then create a new one.
            </Text>
            <Button
              label={removeArmed ? `Yes, remove ${email.trim() || 'this account'}` : 'Remove account from this device'}
              variant="danger"
              size="sm"
              onPress={remove}
              disabled={!email.trim()}
              accessibilityHint="Enter the account's email above first. This deletes its cards and spending from this device."
            />
            {!email.trim() ? <Text style={type.caption}>Enter the account’s email above first.</Text> : null}
          </Panel>
        ) : null}

        <View style={{ marginTop: space.xl }}>
          <Notice title="Encrypted on this device" icon="lock">
            Your wallet is encrypted with a key made from your password, so it can only be opened by signing in. TAPO locks
            after 10 minutes without activity. Nothing is sent to a server.
          </Notice>
        </View>
      </Screen>
      {showIntro ? <Intro onDone={() => setShowIntro(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { marginBottom: space.xl, marginTop: space.md },
  error: { color: colors.danger, fontWeight: '600', marginBottom: space.md },
  notice: { color: colors.success, fontWeight: '600', marginBottom: space.md },
});

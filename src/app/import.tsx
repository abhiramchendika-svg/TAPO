import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CATEGORY_ICON, CATEGORY_TINT, Icon } from '../components/Icon';
import { Amount } from '../components/payments';
import { Text } from '../components/Text';
import { Button, Chip, ChipGroup, Field, Notice, Panel, Screen, SectionHeader } from '../components/ui';
import { CsvImportError, EXAMPLE_CSV, importStatement, MAX_IMPORT_BYTES, type ImportResult } from '../lib/csvImport';
import { formatDate, formatRupees } from '../lib/format';
import { CATEGORY_LABELS, type Category } from '../lib/types';
import { useWallet } from '../lib/wallet';
import { colors, fonts, radius, space, type } from '../theme';

/**
 * Import spending from a bank or card statement CSV. Everything is parsed on the device and only
 * the date, a cleaned merchant name and the amount are kept.
 */
export default function ImportScreen() {
  const { data, importTransactions, removeImported } = useWallet();
  const [cardId, setCardId] = useState(data.cards[0]?.id ?? '');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const importedCount = data.transactions.filter((t) => t.source === 'imported').length;
  const card = data.cards.find((c) => c.id === cardId);

  function preview(csv: string) {
    setDone(null);
    setError(null);
    try {
      setResult(importStatement(csv, data.transactions));
    } catch (e) {
      setResult(null);
      setError(e instanceof CsvImportError ? e.message : 'Couldn’t read that file. Make sure it’s a CSV export.');
    }
  }

  async function pickFile() {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      if (asset.size && asset.size > MAX_IMPORT_BYTES) {
        setError('That file is too large. Export a shorter date range (under 2 MB).');
        return;
      }
      setBusy(true);
      const csv = asset.file ? await asset.file.text() : await new FsFile(asset.uri).text();
      setFileName(asset.name);
      setText('');
      preview(csv);
    } catch {
      setError('Couldn’t open that file. Try exporting it again as CSV.');
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    if (!result || !cardId) return;
    const n = importTransactions(cardId, result.rows);
    setDone(n);
    setResult(null);
    setText('');
    setFileName(null);
  }

  const byCategory = useMemo(() => {
    if (!result) return [];
    const m = new Map<Category, number>();
    for (const r of result.rows) m.set(r.category, (m.get(r.category) ?? 0) + r.amountRupees);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [result]);
  const total = result?.rows.reduce((s, r) => s + r.amountRupees, 0) ?? 0;
  const skipped = result ? Object.values(result.skipped).reduce((a, b) => a + b, 0) : 0;

  return (
    <Screen edges={['bottom']}>
      <Notice title="Stays on this device" icon="lock">
        Your file is read on this device and never uploaded. TAPO keeps only the date, merchant and amount of each
        purchase. Balances, reference numbers and account or card numbers are ignored, and long numbers in descriptions
        are masked.
      </Notice>

      {done !== null ? (
        <Panel style={[styles.success, { marginTop: space.lg }]}>
          <View style={styles.successIcon}>
            <Icon name="check" color={colors.success} size={22} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, gap: space.sm }}>
            <Text style={type.h2} accessibilityRole="alert">
              {done} {done === 1 ? 'purchase' : 'purchases'} imported
            </Text>
            <Text style={type.small}>See which card would have earned you more on this spending.</Text>
            <Button label="See insights" size="sm" iconRight="arrowRight" onPress={() => router.navigate('/insights')} />
          </View>
        </Panel>
      ) : null}

      <SectionHeader title="1 · Which card is this statement for?" />
      {data.cards.length === 0 ? (
        <Text style={type.small}>Add a card first, then import its statement.</Text>
      ) : (
        <ChipGroup label="Card">
          {data.cards.map((c) => (
            <Chip
              key={c.id}
              label={`${c.nickname} •• ${c.last4}`}
              selected={c.id === cardId}
              onPress={() => setCardId(c.id)}
            />
          ))}
        </ChipGroup>
      )}

      <SectionHeader title="2 · Add your statement" />
      <Panel style={{ gap: space.md }}>
        <Text style={type.small}>
          In your bank or card app, download a statement as <Text style={{ fontWeight: '700' }}>CSV</Text> (Excel
          files can be saved as CSV). TAPO finds the date, description and amount or debit columns automatically.
        </Text>
        <Button
          label={busy ? 'Reading…' : 'Choose CSV file'}
          icon="receipt"
          onPress={pickFile}
          disabled={busy}
          accessibilityHint="Opens a file picker"
        />
        {busy ? <ActivityIndicator color={colors.primary} /> : null}
        {fileName ? <Text style={type.caption}>Selected: {fileName}</Text> : null}
        <Text style={[type.caption, { textAlign: 'center' }]}>or paste the CSV text</Text>
        <Field
          label="CSV text"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={5}
          placeholder="Date,Description,Debit,Credit…"
          autoCapitalize="none"
          autoCorrect={false}
          style={{ minHeight: 110, textAlignVertical: 'top', fontFamily: fonts.mono, fontSize: 12 }}
        />
        <View style={styles.row}>
          <Button
            label="Preview"
            variant="secondary"
            size="sm"
            disabled={!text.trim()}
            onPress={() => {
              setFileName(null);
              preview(text);
            }}
            style={{ flex: 1 }}
          />
          <Button
            label="Try example"
            variant="ghost"
            size="sm"
            onPress={() => {
              setText(EXAMPLE_CSV);
              setFileName(null);
              preview(EXAMPLE_CSV);
            }}
            accessibilityHint="Fills in a short made-up statement"
            style={{ flex: 1 }}
          />
        </View>
        {error ? (
          <Text style={[type.small, { color: colors.danger }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </Panel>

      {result ? (
        <>
          <SectionHeader title="3 · Check and import" />
          <Panel style={{ gap: space.md }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={type.mono}>Purchases found</Text>
                <Text style={[type.title, { fontSize: 28 }]}>{result.rows.length}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.mono}>Total spent</Text>
                <Amount value={total} size="lg" style={{ textAlign: 'left' }} />
              </View>
            </View>
            <Text style={type.caption}>
              Columns used: {result.columns.date} · {result.columns.description} · {result.columns.amount}
            </Text>
            {skipped > 0 ? (
              <Text style={type.caption}>
                Skipped {[
                  result.skipped.credits && `${result.skipped.credits} money in`,
                  result.skipped.duplicates && `${result.skipped.duplicates} already imported`,
                  result.skipped.invalid && `${result.skipped.invalid} unreadable`,
                  result.skipped.overLimit && `${result.skipped.overLimit} over limits`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}

            {byCategory.map(([cat, amount]) => (
              <View key={cat} style={styles.catRow}>
                <View style={[styles.catIcon, { backgroundColor: CATEGORY_TINT[cat].bg }]}>
                  <Icon name={CATEGORY_ICON[cat]} color={CATEGORY_TINT[cat].fg} size={15} />
                </View>
                <Text style={[type.label, { flex: 1 }]}>{CATEGORY_LABELS[cat]}</Text>
                <Text style={type.label}>{formatRupees(amount)}</Text>
              </View>
            ))}

            <View style={styles.sample}>
              {result.rows.slice(0, 5).map((r, i) => (
                <View key={i} style={styles.sampleRow}>
                  <Text style={[type.small, { flex: 1 }]} numberOfLines={1}>
                    {r.merchant}
                  </Text>
                  <Text style={type.caption}>{formatDate(r.date)}</Text>
                  <Text style={[type.small, { minWidth: 70, textAlign: 'right' }]}>{formatRupees(r.amountRupees)}</Text>
                </View>
              ))}
              {result.rows.length > 5 ? (
                <Text style={type.caption}>and {result.rows.length - 5} more</Text>
              ) : null}
            </View>

            <Button
              label={card ? `Import to ${card.nickname}` : 'Choose a card'}
              icon="check"
              disabled={!card || result.rows.length === 0}
              onPress={confirm}
            />
          </Panel>
        </>
      ) : null}

      {importedCount > 0 ? (
        <>
          <SectionHeader title="Imported data" />
          <Panel style={{ gap: space.md }}>
            <Text style={type.small}>
              {importedCount} imported {importedCount === 1 ? 'purchase is' : 'purchases are'} stored on this device.
            </Text>
            <Button
              label="Remove imported purchases"
              variant="danger"
              size="sm"
              icon="trash"
              onPress={() => {
                removeImported();
                setDone(null);
              }}
            />
          </Panel>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  success: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', borderColor: colors.successBorder },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  catIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sample: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sampleRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
});

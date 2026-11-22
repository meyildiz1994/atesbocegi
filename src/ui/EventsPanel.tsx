import { FlatList, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config/balance';
import { analyticsConnected, useAnalyticsDebug } from '../services/analytics';
import { Sheet } from './Sheet';

const HIDDEN_PROPS = new Set(['$os', 'app_version']);

/** Test build'lerinde analitik olaylarının canlı listesi (FPS sayacına basılı tutunca açılır). */
export function EventsPanel({ onClose }: { onClose: () => void }) {
  const { recent, sent, pending } = useAnalyticsDebug();
  return (
    <Sheet title="Analytics" onClose={onClose}>
      <Text style={styles.status}>
        {analyticsConnected() ? `PostHog · sent ${sent} · queued ${pending}` : `PostHog key missing · queued ${pending}`}
      </Text>
      <FlatList
        data={recent}
        keyExtractor={(e, i) => `${e.timestamp}-${i}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.time}>{item.timestamp.slice(11, 19)}</Text>
            <View style={styles.body}>
              <Text style={styles.event}>{item.event}</Text>
              <Text style={styles.props}>
                {Object.entries(item.properties)
                  .filter(([k]) => !HIDDEN_PROPS.has(k))
                  .map(([k, v]) => `${k}=${String(v)}`)
                  .join('  ')}
              </Text>
            </View>
          </View>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  status: { color: COLORS.debugText, fontSize: 12, paddingHorizontal: 18, paddingBottom: 6 },
  list: { paddingHorizontal: 14, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: COLORS.panelBorder },
  time: { color: COLORS.hudSubText, fontSize: 11, fontVariant: ['tabular-nums'], width: 58 },
  body: { flex: 1 },
  event: { color: COLORS.hudText, fontSize: 14, fontWeight: '700' },
  props: { color: COLORS.hudSubText, fontSize: 11, marginTop: 2 },
});

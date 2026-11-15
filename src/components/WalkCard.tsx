import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Card, Row } from "@/components/ui/Layout";
import { T } from "@/components/ui/Typography";
import { formatTime } from "@/domain/dates";
import type { Marker, Trigger, WalkOccurrence } from "@/domain/types";
import { Radius, Space, useTheme } from "@/theme/theme";

export function MarkerPill({
  marker,
  trigger,
}: {
  marker: Marker;
  trigger?: Trigger;
}) {
  const theme = useTheme();
  const reactive = marker.kind === "reactive";
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: reactive ? theme.reactiveSoft : theme.successSoft },
      ]}
    >
      <View
        style={[
          styles.pillMark,
          { backgroundColor: reactive ? theme.reactive : theme.success },
        ]}
      />
      <T variant="caption">
        {trigger?.emoji} {trigger?.name ?? "Trigger"}
        {reactive ? ` · ${marker.intensity}` : " · calm"}
      </T>
    </View>
  );
}

export function WalkCard({
  occurrence,
  markers,
  triggers,
}: {
  occurrence: WalkOccurrence;
  markers: Marker[];
  triggers: Map<string, Trigger>;
}) {
  const theme = useTheme();
  const open = () =>
    router.push({ pathname: "/walk/[key]", params: { key: occurrence.key } });
  const log = (kind: "reactive" | "success") =>
    router.push({ pathname: "/marker", params: { key: occurrence.key, kind } });

  return (
    // The card itself is not pressable: only the header opens the walk, and the
    // action buttons are siblings of it. Nesting pressables would render
    // <button> inside <button> on web (invalid HTML, hydration errors).
    <Card style={occurrence.skipped ? { opacity: 0.6 } : undefined}>
      <View style={{ gap: Space.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${occurrence.title} at ${formatTime(occurrence.time)}`}
          accessibilityHint="Opens the walk"
          onPress={open}
          style={({ pressed }) => [
            { gap: Space.md },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Row style={{ justifyContent: "space-between" }}>
            <Row gap={Space.md} style={{ flex: 1 }}>
              <View
                style={[styles.time, { backgroundColor: theme.surfaceAlt }]}
              >
                <T variant="caption" style={{ fontWeight: "700" }}>
                  {formatTime(occurrence.time)}
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <T
                  variant="bodyStrong"
                  numberOfLines={1}
                  style={occurrence.skipped && styles.strike}
                >
                  {occurrence.title}
                </T>
                <Row gap={4}>
                  {occurrence.scheduleId && (
                    <Ionicons name="repeat" size={13} color={theme.textMuted} />
                  )}
                  <T variant="caption" tone="muted">
                    {occurrence.skipped
                      ? "Skipped — rest days are okay"
                      : occurrence.scheduleId
                        ? "Scheduled"
                        : "One-off walk"}
                  </T>
                </Row>
              </View>
            </Row>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.textMuted}
            />
          </Row>

          {markers.length > 0 && (
            <View style={styles.pills}>
              {markers.map((m) => (
                <MarkerPill
                  key={m.id}
                  marker={m}
                  trigger={triggers.get(m.triggerId)}
                />
              ))}
            </View>
          )}
        </Pressable>

        {!occurrence.skipped && (
          <Row gap={Space.sm}>
            <Button
              small
              kind="reactive"
              label="Reaction"
              style={{ flex: 1 }}
              onPress={() => log("reactive")}
              icon={
                <View
                  style={[styles.pillMark, { backgroundColor: theme.reactive }]}
                />
              }
            />
            <Button
              small
              kind="success"
              label="Success"
              style={{ flex: 1 }}
              onPress={() => log("success")}
              icon={
                <View
                  style={[styles.pillMark, { backgroundColor: theme.success }]}
                />
              }
            />
          </Row>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  time: {
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: "center",
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillMark: { width: 8, height: 8, borderRadius: 4 },
  strike: { textDecorationLine: "line-through" },
});

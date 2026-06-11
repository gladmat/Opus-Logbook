import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  useFocusEffect,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { Feather } from "@/components/FeatherIcon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";
import {
  acceptKeyRotation,
  forgetPin,
  getAllPins,
  type KeyPin,
} from "@/lib/keyPinningStore";
import { getTeamContacts } from "@/lib/teamContactsApi";
import { getOrCreateDeviceIdentity } from "@/lib/e2ee";
import {
  deriveSafetyNumber,
  deviceFingerprint,
  safetyNumberLines,
  type PartyKeys,
} from "@/lib/safetyNumber";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type KeyVerificationRoute = RouteProp<RootStackParamList, "KeyVerification">;

interface PinnedUserGroup {
  userId: string;
  displayName: string;
  pins: KeyPin[];
}

export default function KeyVerificationScreen() {
  const { theme } = useTheme();
  const route = useRoute<KeyVerificationRoute>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState<KeyPin[]>([]);
  const [nameByUserId, setNameByUserId] = useState<Record<string, string>>({});
  const [myIdentity, setMyIdentity] = useState<{
    deviceId: string;
    publicKey: string;
  } | null>(null);
  const [pendingRotations, setPendingRotations] = useState(
    route.params?.pendingRotations ?? [],
  );

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const [allPins, identity] = await Promise.all([
          getAllPins(),
          getOrCreateDeviceIdentity().catch(() => null),
        ]);
        if (cancelled) return;
        setPins(allPins);
        setMyIdentity(identity);
        // Contact names are a nicety — the screen still works offline.
        try {
          const contacts = await getTeamContacts();
          if (cancelled) return;
          const names: Record<string, string> = {};
          for (const contact of contacts) {
            if (contact.linkedUserId) {
              names[contact.linkedUserId] = contact.displayName;
            }
          }
          setNameByUserId(names);
        } catch {
          // Offline — show userIds instead.
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  const groups = useMemo<PinnedUserGroup[]>(() => {
    const byUser = new Map<string, KeyPin[]>();
    for (const pin of pins) {
      const list = byUser.get(pin.userId) ?? [];
      list.push(pin);
      byUser.set(pin.userId, list);
    }
    const focusUserId = route.params?.userId;
    return Array.from(byUser.entries())
      .map(([userId, userPins]) => ({
        userId,
        displayName: nameByUserId[userId] ?? "Linked colleague",
        pins: userPins.sort((a, b) => a.deviceId.localeCompare(b.deviceId)),
      }))
      .sort((a, b) => {
        if (a.userId === focusUserId) return -1;
        if (b.userId === focusUserId) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [pins, nameByUserId, route.params?.userId]);

  const safetyNumberFor = useCallback(
    (group: PinnedUserGroup): string[] | null => {
      if (!myIdentity || !user?.id) return null;
      const me: PartyKeys = {
        userId: user.id,
        devices: [myIdentity],
      };
      const them: PartyKeys = {
        userId: group.userId,
        devices: group.pins.map((p) => ({
          deviceId: p.deviceId,
          publicKey: p.publicKey,
        })),
      };
      return safetyNumberLines(deriveSafetyNumber(me, them));
    },
    [myIdentity, user?.id],
  );

  const handleAcceptRotation = useCallback(
    (rotation: {
      userId: string;
      displayName: string;
      mismatches: {
        deviceId: string;
        storedPublicKey: string;
        receivedPublicKey: string;
      }[];
    }) => {
      Alert.alert(
        "Accept new device key?",
        `Only accept if you have confirmed with ${rotation.displayName} — in person or by phone — that they changed or re-installed Opus. If they didn't, someone may be intercepting your shares.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Accept new key",
            style: "destructive",
            onPress: () => {
              void (async () => {
                for (const mismatch of rotation.mismatches) {
                  await acceptKeyRotation(
                    rotation.userId,
                    mismatch.deviceId,
                    mismatch.receivedPublicKey,
                  );
                }
                setPendingRotations((prev) =>
                  prev.filter((r) => r.userId !== rotation.userId),
                );
                setPins(await getAllPins());
                Alert.alert(
                  "Key updated",
                  `${rotation.displayName}'s new device key is now trusted. Re-save the case to share it with them.`,
                );
              })();
            },
          },
        ],
      );
    },
    [],
  );

  const handleForgetPin = useCallback((pin: KeyPin, displayName: string) => {
    Alert.alert(
      "Forget this device key?",
      `The next share with ${displayName} will trust whatever key the server returns (trust-on-first-use). Only do this if the pinned device is gone for good.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forget",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await forgetPin(pin.userId, pin.deviceId);
              setPins(await getAllPins());
            })();
          },
        },
      ],
    );
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={styles.content}
      testID="screen-keyVerification"
    >
      {pendingRotations.map((rotation) => (
        <View
          key={rotation.userId}
          style={[
            styles.card,
            {
              backgroundColor: theme.warningSurface,
              borderColor: theme.warning,
            },
          ]}
          testID={`keyVerification.card-rotation-${rotation.userId}`}
        >
          <View style={styles.cardHeaderRow}>
            <Feather name="alert-triangle" size={18} color={theme.warning} />
            <ThemedText style={styles.cardTitle}>
              Key change detected — {rotation.displayName}
            </ThemedText>
          </View>
          <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
            The device key the server returned doesn&apos;t match the one pinned
            on this phone. Sharing with {rotation.displayName} is blocked until
            you verify the change with them directly.
          </ThemedText>
          {rotation.mismatches.map((mismatch) => (
            <View key={mismatch.deviceId} style={styles.fingerprintBlock}>
              <ThemedText
                style={[styles.fingerprintLabel, { color: theme.textTertiary }]}
              >
                PINNED
              </ThemedText>
              <ThemedText style={[styles.mono, { color: theme.text }]}>
                {deviceFingerprint(mismatch.storedPublicKey)}
              </ThemedText>
              <ThemedText
                style={[styles.fingerprintLabel, { color: theme.textTertiary }]}
              >
                SERVER NOW RETURNS
              </ThemedText>
              <ThemedText style={[styles.mono, { color: theme.warning }]}>
                {deviceFingerprint(mismatch.receivedPublicKey)}
              </ThemedText>
            </View>
          ))}
          <Pressable
            onPress={() => handleAcceptRotation(rotation)}
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            accessibilityRole="button"
            accessibilityLabel={`Accept new key for ${rotation.displayName}`}
            testID={`keyVerification.btn-acceptRotation-${rotation.userId}`}
          >
            <ThemedText
              style={[styles.primaryButtonText, { color: theme.buttonText }]}
            >
              I verified with them — accept new key
            </ThemedText>
          </Pressable>
        </View>
      ))}

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <Feather name="smartphone" size={18} color={theme.link} />
          <ThemedText style={styles.cardTitle}>This device</ThemedText>
        </View>
        <ThemedText style={[styles.body, { color: theme.textSecondary }]}>
          Your device key fingerprint. A colleague verifying you can compare
          this against what their Opus shows for your device.
        </ThemedText>
        <ThemedText
          style={[styles.mono, { color: theme.text }]}
          testID="keyVerification.text-myFingerprint"
        >
          {myIdentity ? deviceFingerprint(myIdentity.publicKey) : "—"}
        </ThemedText>
      </View>

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="shield" size={48} color={theme.textTertiary} />
          <ThemedText style={styles.emptyTitle}>No pinned keys yet</ThemedText>
          <ThemedText
            style={[
              styles.body,
              { color: theme.textSecondary, textAlign: "center" },
            ]}
          >
            Device keys are pinned automatically the first time you share a case
            with a linked colleague.
          </ThemedText>
        </View>
      ) : (
        groups.map((group) => {
          const lines = safetyNumberFor(group);
          return (
            <View
              key={group.userId}
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: theme.border,
                },
              ]}
              testID={`keyVerification.card-user-${group.userId}`}
            >
              <View style={styles.cardHeaderRow}>
                <Feather name="user-check" size={18} color={theme.link} />
                <ThemedText style={styles.cardTitle}>
                  {group.displayName}
                </ThemedText>
              </View>

              {lines ? (
                <View
                  style={[
                    styles.safetyNumberBox,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.fingerprintLabel,
                      { color: theme.textTertiary },
                    ]}
                  >
                    SAFETY NUMBER
                  </ThemedText>
                  {lines.map((line) => (
                    <ThemedText
                      key={line}
                      style={[styles.safetyNumberLine, { color: theme.text }]}
                    >
                      {line}
                    </ThemedText>
                  ))}
                  <ThemedText
                    style={[styles.caption, { color: theme.textTertiary }]}
                  >
                    Read these digits to each other. If both phones show the
                    same number, the encryption between you is not being
                    intercepted.
                  </ThemedText>
                </View>
              ) : null}

              {group.pins.map((pin) => (
                <View key={pin.deviceId} style={styles.deviceRow}>
                  <View style={styles.deviceInfo}>
                    <ThemedText style={[styles.mono, { color: theme.text }]}>
                      {deviceFingerprint(pin.publicKey)}
                    </ThemedText>
                    <ThemedText
                      style={[styles.caption, { color: theme.textTertiary }]}
                    >
                      Pinned {pin.firstSeenAt.slice(0, 10)} · verified{" "}
                      {pin.lastVerifiedAt.slice(0, 10)}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => handleForgetPin(pin, group.displayName)}
                    hitSlop={8}
                    style={styles.forgetButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Forget pinned key for ${group.displayName}`}
                    testID={`keyVerification.btn-forget-${pin.deviceId}`}
                  >
                    <Feather name="trash-2" size={16} color={theme.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 48 },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  body: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  mono: { ...Typography.mono },
  fingerprintBlock: { gap: 2, marginTop: Spacing.xs },
  fingerprintLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
  },
  safetyNumberBox: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: 4,
  },
  safetyNumberLine: { ...Typography.mono, fontSize: 16, letterSpacing: 1 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  deviceInfo: { flexShrink: 1 },
  forgetButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    borderRadius: BorderRadius.sm,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: { fontSize: 15, fontWeight: "600" },
  empty: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
});

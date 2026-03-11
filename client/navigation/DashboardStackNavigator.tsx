import React, { useState, useCallback } from "react";
import { Pressable, View, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DashboardScreen from "@/screens/DashboardScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@/components/FeatherIcon";
import { getInboxCount } from "@/lib/inboxStorage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

export type DashboardStackParamList = {
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

function InboxButton() {
  const { theme } = useTheme();
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setCount(getInboxCount());
    }, []),
  );

  return (
    <Pressable
      onPress={() => rootNavigation.navigate("Inbox")}
      style={{ padding: 8, marginRight: 4 }}
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `Photo inbox, ${count} items` : "Photo inbox"
      }
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View>
        <Feather name="inbox" size={20} color={theme.textSecondary} />
        {count > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -6,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: theme.info,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                color: theme.buttonText,
                fontSize: 10,
                fontWeight: "700",
              }}
            >
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function SearchButton() {
  const { theme } = useTheme();
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      onPress={() => rootNavigation.navigate("CaseSearch")}
      style={{ padding: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Search cases"
      accessibilityHint="Opens the case search screen"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Feather name="search" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

function HeaderRight() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <InboxButton />
      <SearchButton />
    </View>
  );
}

export default function DashboardStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle />,
          headerRight: () => <HeaderRight />,
        }}
      />
    </Stack.Navigator>
  );
}

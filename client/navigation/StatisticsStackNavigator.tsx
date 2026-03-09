import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StatisticsScreen from "@/screens/StatisticsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type StatisticsStackParamList = {
  Statistics: undefined;
};

const Stack = createNativeStackNavigator<StatisticsStackParamList>();

export default function StatisticsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: "Statistics",
        }}
      />
    </Stack.Navigator>
  );
}

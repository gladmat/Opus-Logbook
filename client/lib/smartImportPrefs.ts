import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@opus_smart_import_always_delete";

/** Check if the user has opted to always delete Camera Roll originals after import. */
export async function getAlwaysDeleteAfterImport(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  return value === "true";
}

/** Set the "always delete after import" preference. */
export async function setAlwaysDeleteAfterImport(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(KEY, enabled ? "true" : "false");
}

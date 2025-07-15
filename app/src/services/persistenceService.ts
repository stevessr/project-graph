import { Store } from "@tauri-apps/plugin-store";
import { createStore } from "../utils/store";

let store: Store | null = null;

const getStore = async () => {
  if (store) {
    return store;
  }
  store = await createStore("settings.dat");
  return store;
};

export const save = async (key: string, value: any) => {
  const s = await getStore();
  await s.set(key, value);
  await s.save();
};

export const load = async <T>(key: string): Promise<T | null> => {
  const s = await getStore();
  const value = await s.get<T>(key);
  return value ?? null;
};

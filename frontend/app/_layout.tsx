import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
// Prewarm vector icons so glyphs load in Expo Go on Android.
// Keep this import; it forces the font asset to be registered early.
import "@react-native-vector-icons/material-design-icons";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { ToastProvider } from "@/src/components/toast";
import { ensureInitialized } from "@/src/local-store";

LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  useEffect(() => {
    // Prepare local (offline) data store on first launch.
    ensureInitialized().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }} />
            </ToastProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

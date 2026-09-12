import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/material-design-icons";
import { useTheme } from "@/src/theme";

type ToastKind = "success" | "error" | "info";
type ToastCtx = { show: (msg: string, kind?: ToastKind) => void };

const ToastContext = createContext<ToastCtx>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setToast(null),
    );
  }, [anim]);

  const show = useCallback(
    (msg: string, kind: ToastKind = "success") => {
      setToast({ msg, kind });
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      setTimeout(hide, 2500);
    },
    [anim, hide],
  );

  const bg =
    toast?.kind === "success" ? colors.success : toast?.kind === "error" ? colors.error : colors.info;
  const icon =
    toast?.kind === "success" ? "check-circle" : toast?.kind === "error" ? "alert-circle" : "information";

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              top: insets.top + 12,
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
              ],
            },
          ]}
          testID="toast"
        >
          <Pressable onPress={hide} style={[styles.toast, { backgroundColor: bg }]}>
            <Icon name={icon} size={20} color="#FFFFFF" />
            <Text style={styles.text}>{toast.msg}</Text>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  text: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", flexShrink: 1 },
});

# Integrated Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정적 색상 토큰을 4개 팔레트 전환 시스템으로 교체하고, 하드코딩된 rgba/hex 값을 시맨틱 토큰으로 흡수한다.

**Architecture:** `ColorScheme` 타입 + 4개 팔레트 파일 → `ThemeProvider`/`useTheme()` 컨텍스트 → `createStyles(colors)` 팩토리 패턴으로 모든 화면 마이그레이션. 팔레트 ID는 SQLite `app_meta`에 저장.

**Tech Stack:** React Native, TypeScript, React Context, expo-sqlite, Expo Router

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/shared/theme/palettes/types.ts` | ColorScheme 타입, PaletteId 타입 |
| Create | `src/shared/theme/palettes/cool-modern.ts` | 쿨 모던 팔레트 값 |
| Create | `src/shared/theme/palettes/warm-refresh.ts` | 워밍 리프레시 팔레트 값 |
| Create | `src/shared/theme/palettes/nature-fresh.ts` | 자연 프레시 팔레트 값 |
| Create | `src/shared/theme/palettes/neutral-clean.ts` | 뉴트럴 클린 팔레트 값 |
| Create | `src/shared/theme/palettes/index.ts` | 팔레트 레지스트리 + re-export |
| Create | `src/shared/theme/ThemeProvider.tsx` | ThemeContext, useTheme(), setPalette |
| Create | `app/settings/index.tsx` | 설정 화면 (팔레트 선택 UI) |
| Modify | `src/shared/theme/tokens.ts` | colors 제거, spacing/radius만 유지 |
| Modify | `src/app/AppProviders.tsx` | ThemeProvider 감싸기 |
| Modify | `app/_layout.tsx` | settings 스택 라우트 추가 |
| Modify | `app/(tabs)/profile/index.tsx` | Settings 네비게이션 추가 |
| Modify | `src/app/bootstrap/AppBootstrapGate.tsx` | useTheme 마이그레이션 |
| Modify | `src/shared/ui/AppButton.tsx` | useTheme 마이그레이션 |
| Modify | `src/shared/ui/Badge.tsx` | useTheme 마이그레이션 |
| Modify | `src/shared/ui/Panel.tsx` | useTheme 마이그레이션 |
| Modify | `src/shared/ui/Screen.tsx` | useTheme 마이그레이션 |
| Modify | `src/shared/ui/TextField.tsx` | useTheme 마이그레이션 |
| Modify | `src/shared/animation/SwipeStudyCard.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/study/components/StudyFlashcard.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/study/components/StudyHeader.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/study/components/SessionCompleteCard.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/study/screens/StudyScreen.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/home/screens/HomeScreen.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/decks/screens/MyDecksScreen.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/decks/screens/DeckEditorScreen.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/store/screens/StoreScreen.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/store/screens/BundleDetailScreen.tsx` | useTheme 마이그레이션 |
| Modify | `src/features/profile/screens/ProfileScreen.tsx` | useTheme 마이그레이션 |

---

### Task 1: ColorScheme 타입 + 4개 팔레트 정의

**Files:**
- Create: `src/shared/theme/palettes/types.ts`
- Create: `src/shared/theme/palettes/cool-modern.ts`
- Create: `src/shared/theme/palettes/warm-refresh.ts`
- Create: `src/shared/theme/palettes/nature-fresh.ts`
- Create: `src/shared/theme/palettes/neutral-clean.ts`
- Create: `src/shared/theme/palettes/index.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// src/shared/theme/palettes/types.ts
export type PaletteId = "cool-modern" | "warm-refresh" | "nature-fresh" | "neutral-clean";

export type ColorScheme = {
  canvas: string;
  surface: string;
  surfaceStrong: string;
  ink: string;
  muted: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  info: string;
  infoSoft: string;
  line: string;
  onPrimary: string;
  overlayWhite: string;
  primaryGlow: string;
  accentGlow: string;
  neutralGlow: string;
  chipAgainBg: string;
  chipAgainBorder: string;
  chipEasyBg: string;
  chipEasyBorder: string;
};
```

- [ ] **Step 2: Create cool-modern.ts**

```typescript
// src/shared/theme/palettes/cool-modern.ts
import { ColorScheme } from "@/src/shared/theme/palettes/types";

export const coolModern: ColorScheme = {
  canvas: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceStrong: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
  primary: "#6366F1",
  primarySoft: "#EEF2FF",
  accent: "#F43F5E",
  accentSoft: "#FFF1F2",
  info: "#0EA5E9",
  infoSoft: "#E0F2FE",
  line: "#E2E8F0",
  onPrimary: "#FFFFFF",
  overlayWhite: "rgba(255,255,255,0.7)",
  primaryGlow: "rgba(99,102,241,0.1)",
  accentGlow: "rgba(244,63,94,0.1)",
  neutralGlow: "rgba(15,23,42,0.08)",
  chipAgainBg: "#FFF1F2",
  chipAgainBorder: "rgba(244,63,94,0.2)",
  chipEasyBg: "#EEF2FF",
  chipEasyBorder: "rgba(99,102,241,0.2)",
};
```

- [ ] **Step 3: Create warm-refresh.ts**

```typescript
// src/shared/theme/palettes/warm-refresh.ts
import { ColorScheme } from "@/src/shared/theme/palettes/types";

export const warmRefresh: ColorScheme = {
  canvas: "#FFFBF5",
  surface: "#FFFFFF",
  surfaceStrong: "#FFFFFF",
  ink: "#1C1917",
  muted: "#78716C",
  primary: "#D97706",
  primarySoft: "#FEF3C7",
  accent: "#DC2626",
  accentSoft: "#FEE2E2",
  info: "#2563EB",
  infoSoft: "#DBEAFE",
  line: "#E7E5E4",
  onPrimary: "#FFFFFF",
  overlayWhite: "rgba(255,255,255,0.7)",
  primaryGlow: "rgba(217,119,6,0.1)",
  accentGlow: "rgba(220,38,38,0.1)",
  neutralGlow: "rgba(28,25,23,0.08)",
  chipAgainBg: "#FEE2E2",
  chipAgainBorder: "rgba(220,38,38,0.2)",
  chipEasyBg: "#FEF3C7",
  chipEasyBorder: "rgba(217,119,6,0.2)",
};
```

- [ ] **Step 4: Create nature-fresh.ts**

```typescript
// src/shared/theme/palettes/nature-fresh.ts
import { ColorScheme } from "@/src/shared/theme/palettes/types";

export const natureFresh: ColorScheme = {
  canvas: "#F0FDF4",
  surface: "#FFFFFF",
  surfaceStrong: "#FFFFFF",
  ink: "#14532D",
  muted: "#4B5563",
  primary: "#16A34A",
  primarySoft: "#DCFCE7",
  accent: "#F97316",
  accentSoft: "#FFEDD5",
  info: "#0284C7",
  infoSoft: "#E0F2FE",
  line: "#BBF7D0",
  onPrimary: "#FFFFFF",
  overlayWhite: "rgba(255,255,255,0.7)",
  primaryGlow: "rgba(22,163,74,0.1)",
  accentGlow: "rgba(249,115,22,0.1)",
  neutralGlow: "rgba(20,83,45,0.08)",
  chipAgainBg: "#FFEDD5",
  chipAgainBorder: "rgba(249,115,22,0.2)",
  chipEasyBg: "#DCFCE7",
  chipEasyBorder: "rgba(22,163,74,0.2)",
};
```

- [ ] **Step 5: Create neutral-clean.ts**

```typescript
// src/shared/theme/palettes/neutral-clean.ts
import { ColorScheme } from "@/src/shared/theme/palettes/types";

export const neutralClean: ColorScheme = {
  canvas: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceStrong: "#FFFFFF",
  ink: "#171717",
  muted: "#737373",
  primary: "#2563EB",
  primarySoft: "#DBEAFE",
  accent: "#F59E0B",
  accentSoft: "#FEF3C7",
  info: "#6366F1",
  infoSoft: "#EEF2FF",
  line: "#E5E5E5",
  onPrimary: "#FFFFFF",
  overlayWhite: "rgba(255,255,255,0.7)",
  primaryGlow: "rgba(37,99,235,0.1)",
  accentGlow: "rgba(245,158,11,0.1)",
  neutralGlow: "rgba(23,23,23,0.08)",
  chipAgainBg: "#FEF3C7",
  chipAgainBorder: "rgba(245,158,11,0.2)",
  chipEasyBg: "#DBEAFE",
  chipEasyBorder: "rgba(37,99,235,0.2)",
};
```

- [ ] **Step 6: Create index.ts registry**

```typescript
// src/shared/theme/palettes/index.ts
export type { ColorScheme, PaletteId } from "@/src/shared/theme/palettes/types";
export { coolModern } from "@/src/shared/theme/palettes/cool-modern";
export { warmRefresh } from "@/src/shared/theme/palettes/warm-refresh";
export { natureFresh } from "@/src/shared/theme/palettes/nature-fresh";
export { neutralClean } from "@/src/shared/theme/palettes/neutral-clean";

import { coolModern } from "@/src/shared/theme/palettes/cool-modern";
import { warmRefresh } from "@/src/shared/theme/palettes/warm-refresh";
import { natureFresh } from "@/src/shared/theme/palettes/nature-fresh";
import { neutralClean } from "@/src/shared/theme/palettes/neutral-clean";
import { ColorScheme, PaletteId } from "@/src/shared/theme/palettes/types";

export const DEFAULT_PALETTE_ID: PaletteId = "cool-modern";

export const palettes: Record<PaletteId, ColorScheme> = {
  "cool-modern": coolModern,
  "warm-refresh": warmRefresh,
  "nature-fresh": natureFresh,
  "neutral-clean": neutralClean,
};

export const paletteList: { id: PaletteId; name: string }[] = [
  { id: "cool-modern", name: "쿨 모던" },
  { id: "warm-refresh", name: "워밍 리프레시" },
  { id: "nature-fresh", name: "자연 프레시" },
  { id: "neutral-clean", name: "뉴트럴 클린" },
];
```

- [ ] **Step 7: Verify and commit**

Run: `npm run typecheck`

```bash
git add src/shared/theme/palettes/
git commit -m "feat: add ColorScheme type and 4 palette definitions"
```

---

### Task 2: ThemeProvider + useTheme()

**Files:**
- Create: `src/shared/theme/ThemeProvider.tsx`

- [ ] **Step 1: Create ThemeProvider**

```tsx
// src/shared/theme/ThemeProvider.tsx
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from "react";

import { getDatabaseAsync } from "@/src/core/database/client";
import {
  ColorScheme,
  DEFAULT_PALETTE_ID,
  PaletteId,
  palettes,
} from "@/src/shared/theme/palettes";

type ThemeContextValue = {
  colors: ColorScheme;
  paletteId: PaletteId;
  setPalette: (id: PaletteId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [paletteId, setPaletteId] = useState<PaletteId>(DEFAULT_PALETTE_ID);

  useEffect(() => {
    void loadPaletteIdAsync().then(setPaletteId);
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    setPaletteId(id);
    void savePaletteId(id);
  }, []);

  const value: ThemeContextValue = {
    colors: palettes[paletteId],
    paletteId,
    setPalette,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

async function savePaletteId(id: PaletteId) {
  const db = await getDatabaseAsync();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('palette_id', ?)`,
    id,
  );
}

async function loadPaletteIdAsync(): Promise<PaletteId> {
  const db = await getDatabaseAsync();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = 'palette_id'`,
  );
  if (row && row.value in palettes) {
    return row.value as PaletteId;
  }
  return DEFAULT_PALETTE_ID;
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck`

```bash
git add src/shared/theme/ThemeProvider.tsx
git commit -m "feat: add ThemeProvider with palette persistence"
```

---

### Task 3: AppProviders + Bootstrap 통합

**Files:**
- Modify: `src/app/AppProviders.tsx`
- Modify: `src/app/bootstrap/AppBootstrapGate.tsx`

- [ ] **Step 1: Add ThemeProvider to AppProviders**

`src/app/AppProviders.tsx`를 다음으로 교체한다:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, createContext, useContext, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppServices, createAppServices } from "@/src/core/services/createAppServices";
import { ThemeProvider } from "@/src/shared/theme/ThemeProvider";

const AppServicesContext = createContext<AppServices | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );
  const [services] = useState(() => createAppServices());

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppServicesContext.Provider value={services}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </AppServicesContext.Provider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function useAppServices() {
  const services = useContext(AppServicesContext);

  if (!services) {
    throw new Error("AppServicesContext is not available.");
  }

  return services;
}
```

- [ ] **Step 2: Integrate palette loading into AppBootstrapGate**

`src/app/bootstrap/AppBootstrapGate.tsx`를 다음으로 교체한다:

```tsx
import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppServices } from "@/src/app/AppProviders";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type BootstrapState = "idle" | "loading" | "ready" | "error";

export function AppBootstrapGate({ children }: PropsWithChildren) {
  const { bootstrapService } = useAppServices();
  const { colors } = useTheme();
  const [state, setState] = useState<BootstrapState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        setState("loading");
        await bootstrapService.prepareAppAsync();
        if (isMounted) {
          setState("ready");
        }
      } catch (error) {
        if (isMounted) {
          setState("error");
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to bootstrap the app.",
          );
        }
      }
    }

    void prepare();

    return () => {
      isMounted = false;
    };
  }, [bootstrapService]);

  if (state === "ready") {
    return children;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Flash Voca</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          {state === "error" ? "Startup issue" : "Preparing local-first workspace"}
        </Text>
        <Text style={[styles.message, { color: colors.muted }]}>
          {state === "error"
            ? errorMessage
            : "SQLite schema, sample data, and service boundaries are loading."}
        </Text>
        {state !== "error" ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: tokens.radius.l,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    gap: tokens.spacing.s,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  loader: {
    marginTop: tokens.spacing.s,
  },
});
```

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck`

```bash
git add src/app/AppProviders.tsx src/app/bootstrap/AppBootstrapGate.tsx
git commit -m "feat: integrate ThemeProvider into app providers and bootstrap"
```

---

### Task 4: tokens.ts에서 colors 제거

**Files:**
- Modify: `src/shared/theme/tokens.ts`

- [ ] **Step 1: Remove colors from tokens**

`src/shared/theme/tokens.ts`를 다음으로 교체한다:

```typescript
export const tokens = {
  spacing: {
    xs: 6,
    s: 12,
    m: 16,
    l: 20,
    xl: 28,
    xxl: 36,
  },
  radius: {
    s: 12,
    m: 18,
    l: 24,
    pill: 999,
  },
};
```

- [ ] **Step 2: Run typecheck to see all breakages**

Run: `npm run typecheck 2>&1 | head -50`

이 시점에서 `tokens.colors`를 참조하는 모든 파일이 에러를 발생시킨다. 이것이 예상된 동작이다. Task 5~9에서 마이그레이션한다.

- [ ] **Step 3: Commit (breaking change — will be fixed in subsequent tasks)**

```bash
git add src/shared/theme/tokens.ts
git commit -m "refactor: remove colors from tokens (migration in progress)"
```

---

### Task 5: shared UI 프리미티브 마이그레이션 (AppButton, Badge, Panel, TextField)

**Files:**
- Modify: `src/shared/ui/AppButton.tsx`
- Modify: `src/shared/ui/Badge.tsx`
- Modify: `src/shared/ui/Panel.tsx`
- Modify: `src/shared/ui/TextField.tsx`

- [ ] **Step 1: Migrate AppButton**

`src/shared/ui/AppButton.tsx`를 다음으로 교체한다:

```tsx
import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { ColorScheme } from "@/src/shared/theme/palettes";
import { tokens } from "@/src/shared/theme/tokens";

type AppButtonProps = PropsWithChildren<{
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
  disabled?: boolean;
}>;

export function AppButton({
  children,
  onPress,
  variant = "primary",
  style,
  disabled = false,
}: AppButtonProps) {
  const { colors } = useTheme();
  const variantStyles = createVariantStyles(colors);
  const labelStyles = createLabelStyles(colors);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: tokens.spacing.l,
    borderRadius: tokens.radius.m,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
});

const createVariantStyles = (colors: ColorScheme) => ({
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceStrong, borderColor: colors.line },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
});

const createLabelStyles = (colors: ColorScheme) => ({
  primary: { color: colors.onPrimary },
  secondary: { color: colors.ink },
  ghost: { color: colors.primary },
});
```

- [ ] **Step 2: Migrate Badge**

`src/shared/ui/Badge.tsx`를 다음으로 교체한다:

```tsx
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { ColorScheme } from "@/src/shared/theme/palettes";
import { tokens } from "@/src/shared/theme/tokens";

type BadgeProps = {
  children: ReactNode;
  tone?: "primary" | "accent" | "info";
};

export function Badge({ children, tone = "primary" }: BadgeProps) {
  const { colors } = useTheme();
  const toneStyle = createToneStyles(colors)[tone];
  const labelStyle = createLabelStyles(colors)[tone];

  return (
    <View style={[styles.base, toneStyle]}>
      <Text style={[styles.label, labelStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});

const createToneStyles = (colors: ColorScheme) => ({
  primary: { backgroundColor: colors.primarySoft },
  accent: { backgroundColor: colors.accentSoft },
  info: { backgroundColor: colors.infoSoft },
});

const createLabelStyles = (colors: ColorScheme) => ({
  primary: { color: colors.primary },
  accent: { color: colors.accent },
  info: { color: colors.info },
});
```

- [ ] **Step 3: Migrate Panel**

`src/shared/ui/Panel.tsx`를 다음으로 교체한다:

```tsx
import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type PanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}>;

export function Panel({ children, style, accentColor }: PanelProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderLeftColor: accentColor ?? "transparent",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.l,
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: tokens.spacing.l,
    gap: tokens.spacing.s,
  },
});
```

- [ ] **Step 4: Migrate TextField**

`src/shared/ui/TextField.tsx`를 다음으로 교체한다:

```tsx
import { TextInput, TextInputProps, StyleSheet, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

export function TextField(props: TextInputProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.frame, { borderColor: colors.line, backgroundColor: colors.surfaceStrong }]}>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.ink }]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    paddingHorizontal: tokens.spacing.m,
    paddingVertical: tokens.spacing.s,
  },
  input: {
    minHeight: 22,
    fontSize: 15,
  },
});
```

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck 2>&1 | head -30`
(아직 Screen.tsx와 다른 화면들이 에러. 예상됨.)

```bash
git add src/shared/ui/AppButton.tsx src/shared/ui/Badge.tsx src/shared/ui/Panel.tsx src/shared/ui/TextField.tsx
git commit -m "refactor: migrate shared UI primitives to useTheme"
```

---

### Task 6: Screen + SwipeStudyCard 마이그레이션

**Files:**
- Modify: `src/shared/ui/Screen.tsx`
- Modify: `src/shared/animation/SwipeStudyCard.tsx`

- [ ] **Step 1: Migrate Screen**

`src/shared/ui/Screen.tsx`를 다음으로 교체한다:

```tsx
import { PropsWithChildren, ReactNode } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedScreen } from "@/src/shared/animation/AnimatedScreen";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  scroll?: boolean;
  rightSlot?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({
  title,
  subtitle,
  scroll = true,
  rightSlot,
  contentStyle,
  children,
}: ScreenProps) {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.content, contentStyle]}>
      <AnimatedScreen style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
        </View>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </AnimatedScreen>
      <AnimatedScreen delay={80} style={styles.body}>
        {children}
      </AnimatedScreen>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: colors.canvas }]}>
      <View style={[styles.backgroundOrbA, { backgroundColor: colors.primaryGlow }]} />
      <View style={[styles.backgroundOrbB, { backgroundColor: colors.accentGlow }]} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xxl,
  },
  content: {
    flex: 1,
    paddingHorizontal: tokens.spacing.l,
    paddingTop: tokens.spacing.s,
    gap: tokens.spacing.l,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacing.s,
  },
  headerCopy: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    gap: tokens.spacing.l,
  },
  backgroundOrbA: {
    position: "absolute",
    right: -32,
    top: 12,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  backgroundOrbB: {
    position: "absolute",
    left: -48,
    top: 200,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
});
```

- [ ] **Step 2: Migrate SwipeStudyCard**

`src/shared/animation/SwipeStudyCard.tsx`에서 하드코딩된 rgba 값을 `useTheme()`으로 교체한다. 이 파일은 worklet 내부에서 React hook을 호출할 수 없으므로, 색상 값을 컴포넌트 레벨에서 추출하여 worklet에 전달한다.

파일 상단의 import를 변경한다:

기존:
```tsx
import { tokens } from "@/src/shared/theme/tokens";
```

변경:
```tsx
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
```

함수 본문 시작 부분에 `useTheme` 호출을 추가한다 (`const translateX` 선언 전):

```tsx
const { colors } = useTheme();
```

`glowStyle`의 하드코딩 rgba를 교체한다:

기존:
```tsx
    bgColor = "rgba(20, 51, 45, 0.08)";
  } else if (translateX.value >= 0) {
    bgColor = "rgba(15, 118, 110, 0.1)";
  } else {
    bgColor = "rgba(234, 88, 12, 0.1)";
```

변경:
```tsx
    bgColor = colors.neutralGlow;
  } else if (translateX.value >= 0) {
    bgColor = colors.primaryGlow;
  } else {
    bgColor = colors.accentGlow;
```

styles의 칩 색상을 교체한다. 정적 StyleSheet에서 동적 값으로 변경해야 하므로, `leftChip`, `rightChip`, `upChip`, `leftLabel`, `rightLabel`, `upLabel` 스타일에서 색상을 제거하고 인라인으로 전달한다.

`leftChip` 스타일에서 `backgroundColor`와 `borderColor`를 제거하고, JSX에서 인라인으로 전달:

기존 leftChip JSX:
```tsx
style={[styles.actionChip, styles.leftChip, leftLabelStyle]}
```
변경:
```tsx
style={[styles.actionChip, styles.leftChip, { backgroundColor: colors.chipAgainBg, borderColor: colors.chipAgainBorder }, leftLabelStyle]}
```

기존 rightChip JSX:
```tsx
style={[styles.actionChip, styles.rightChip, rightLabelStyle]}
```
변경:
```tsx
style={[styles.actionChip, styles.rightChip, { backgroundColor: colors.chipEasyBg, borderColor: colors.chipEasyBorder }, rightLabelStyle]}
```

기존 upChip JSX:
```tsx
style={[styles.actionChip, styles.upChip, upLabelStyle]}
```
변경:
```tsx
style={[styles.actionChip, styles.upChip, { backgroundColor: colors.surface, borderColor: colors.line }, upLabelStyle]}
```

leftLabel, rightLabel, upLabel Text에 인라인 색상:
```tsx
<Text style={[styles.actionLabel, { color: colors.accent }]}>{leftActionLabel}</Text>
<Text style={[styles.actionLabel, { color: colors.primary }]}>{rightActionLabel}</Text>
<Text style={[styles.actionLabel, { color: colors.ink }]}>{upActionLabel}</Text>
```

styles에서 제거할 색상 속성:
- `leftChip`: `backgroundColor`, `borderColor` 제거
- `rightChip`: `backgroundColor`, `borderColor` 제거
- `upChip`: `backgroundColor`, `borderColor` 제거
- `leftLabel`: 전체 삭제
- `rightLabel`: 전체 삭제
- `upLabel`: 전체 삭제

glow styles에서 `borderRadius`는 tokens를 사용:

기존:
```tsx
glow: {
  ...StyleSheet.absoluteFillObject,
  borderRadius: tokens.radius.l,
},
```
변경 없음 — `tokens.radius`는 그대로 사용.

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck 2>&1 | head -30`

```bash
git add src/shared/ui/Screen.tsx src/shared/animation/SwipeStudyCard.tsx
git commit -m "refactor: migrate Screen and SwipeStudyCard to useTheme"
```

---

### Task 7: study feature 마이그레이션

**Files:**
- Modify: `src/features/study/components/StudyFlashcard.tsx`
- Modify: `src/features/study/components/StudyHeader.tsx`
- Modify: `src/features/study/components/SessionCompleteCard.tsx`
- Modify: `src/features/study/screens/StudyScreen.tsx`

- [ ] **Step 1: Migrate StudyFlashcard**

`src/features/study/components/StudyFlashcard.tsx`에서:

import 변경:
```tsx
// 제거: import { tokens } from "@/src/shared/theme/tokens";
// 추가:
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
```

함수 본문 시작에 추가:
```tsx
const { colors } = useTheme();
```

styles를 정적 레이아웃과 동적 색상으로 분리한다. 색상을 사용하는 스타일은 인라인으로 전달:

```tsx
// card 스타일의 backgroundColor → 인라인
<View style={[styles.card, styles.cardFront, { backgroundColor: colors.surface, borderColor: colors.line }]}>

// cardBack의 borderColor → 인라인
<View style={[styles.card, styles.cardBack, { backgroundColor: colors.surface, borderColor: colors.accent }]}>

// masteryBadge의 backgroundColor → 인라인
<View style={[styles.masteryBadge, { backgroundColor: colors.primarySoft }]}>
  <Text style={[styles.masteryText, { color: colors.primary }]}>{masteryLabel}</Text>

// label의 color → 인라인
<Text style={[styles.label, { color: colors.primary }]}>TERM</Text>
<Text style={[styles.label, { color: colors.accent }]}>MEANING</Text>

// termText, meaningText의 color → 인라인
<Text style={[styles.termText, { color: colors.ink }]}>{card.card.term}</Text>
<Text style={[styles.meaningText, { color: colors.ink }]}>{card.card.meaning}</Text>

// hint, swipeHint의 color → 인라인
<Text style={[styles.hint, { color: colors.muted }]}>tap to flip</Text>
<Text style={[styles.swipeHint, { color: colors.muted }]}>← Again   ↑ Good   Easy →</Text>
```

styles에서 색상 속성을 모두 제거한다 (`backgroundColor`, `borderColor`, `color` 등). `tokens.spacing`과 `tokens.radius`만 남긴다.

- [ ] **Step 2: Migrate StudyHeader**

`src/features/study/components/StudyHeader.tsx`에서:

import 변경 — `tokens`에서 `useTheme` 추가:
```tsx
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
```

함수 본문에 `const { colors } = useTheme();` 추가.

동적 색상을 인라인으로:
```tsx
<Text style={[styles.title, { color: colors.ink }]}>{deckTitle}</Text>
<Text style={[styles.streak, { color: colors.primary }]}>🔥</Text>
<View style={[styles.progressTrack, { backgroundColor: colors.line }]}>
  <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
</View>
<Text style={[styles.counter, { color: colors.muted }]}>{currentIndex} / {totalCards}</Text>
<Text style={[styles.counterLabel, { color: colors.accent }]}>{dueCount} due</Text>
<Text style={[styles.counterLabel, { color: colors.primary }]}>{masteredCount} mastered</Text>
```

styles에서 색상 속성 제거.

- [ ] **Step 3: Migrate SessionCompleteCard**

`src/features/study/components/SessionCompleteCard.tsx`에서:

import 변경:
```tsx
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
```

함수 본문에 `const { colors } = useTheme();` 추가.

동적 색상을 인라인으로:
```tsx
<View style={[styles.root, { backgroundColor: colors.primarySoft }]}>
```

statsRow 카드들:
```tsx
<View style={[styles.statCard, { backgroundColor: colors.accentSoft }]}>
  <Text style={[styles.statValue, { color: colors.accent }]}>{ratingCounts.again}</Text>
  <Text style={[styles.statLabel, { color: colors.accent }]}>AGAIN</Text>
</View>
<View style={[styles.statCard, { backgroundColor: colors.surface }]}>
  <Text style={[styles.statValue, { color: colors.ink }]}>{ratingCounts.good}</Text>
  <Text style={[styles.statLabel, { color: colors.muted }]}>GOOD</Text>
</View>
<View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
  <Text style={[styles.statValue, { color: colors.primary }]}>{ratingCounts.easy}</Text>
  <Text style={[styles.statLabel, { color: colors.primary }]}>EASY</Text>
</View>
```

masteryBar:
```tsx
<View style={[styles.masteryBar, { backgroundColor: colors.overlayWhite }]}>
  <Text style={[styles.masteryLabel, { color: colors.muted }]}>MASTERY</Text>
  <Text style={[styles.masteryPercent, { color: colors.primary }]}>{masteryPercent}%</Text>
  <View style={[styles.masteryTrack, { backgroundColor: colors.line }]}>
    <View style={[styles.masteryFill, { backgroundColor: colors.primary, width: `${masteryPercent}%` }]} />
  </View>
```

title/subtitle:
```tsx
<Text style={[styles.title, { color: colors.ink }]}>세션 완료!</Text>
<Text style={[styles.subtitle, { color: colors.primary }]}>🔥 {totalCards}장 완료</Text>
```

styles에서 모든 색상 속성 제거.

- [ ] **Step 4: Migrate StudyScreen**

`src/features/study/screens/StudyScreen.tsx`에서:

import 변경 — `tokens` import 제거, `useTheme` 추가:
```tsx
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
```

함수 본문에 `const { colors } = useTheme();` 추가.

`tokens.colors.accent` 참조를 `colors.accent`로 교체:
```tsx
<Panel accentColor={colors.accent}>
```

body style의 color를 인라인:
```tsx
<Text style={[styles.body, { color: colors.muted }]}>...</Text>
```

styles에서 색상 속성 제거.

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck 2>&1 | head -30`

```bash
git add src/features/study/
git commit -m "refactor: migrate study feature to useTheme"
```

---

### Task 8: 나머지 화면 마이그레이션 (Home, Decks, Store, Profile)

**Files:**
- Modify: `src/features/home/screens/HomeScreen.tsx`
- Modify: `src/features/decks/screens/MyDecksScreen.tsx`
- Modify: `src/features/decks/screens/DeckEditorScreen.tsx`
- Modify: `src/features/store/screens/StoreScreen.tsx`
- Modify: `src/features/store/screens/BundleDetailScreen.tsx`
- Modify: `src/features/profile/screens/ProfileScreen.tsx`

모든 파일에 동일한 패턴을 적용한다:

1. `import { tokens } from "@/src/shared/theme/tokens"` 에서 tokens.colors 사용 부분을 `useTheme` 으로 교체
2. 함수 본문에 `const { colors } = useTheme();` 추가
3. `tokens.colors.X` → `colors.X` 로 교체
4. 정적 StyleSheet에서 색상 속성 제거, 인라인으로 이동

- [ ] **Step 1: Migrate HomeScreen**

`src/features/home/screens/HomeScreen.tsx`에서:

import 추가: `import { useTheme } from "@/src/shared/theme/ThemeProvider";`
함수 본문: `const { colors } = useTheme();`

교체할 참조:
- `tokens.colors.primary` → `colors.primary`
- styles의 색상 속성 → 인라인 `{ color: colors.ink }`, `{ color: colors.muted }` 등

- [ ] **Step 2: Migrate MyDecksScreen**

동일 패턴. `tokens.colors.X` → `colors.X`.

- [ ] **Step 3: Migrate DeckEditorScreen**

동일 패턴. `tokens.colors.primary` → `colors.primary`, `tokens.colors.info` → `colors.info` 등.

- [ ] **Step 4: Migrate StoreScreen**

동일 패턴.

- [ ] **Step 5: Migrate BundleDetailScreen**

동일 패턴.

- [ ] **Step 6: Migrate ProfileScreen**

동일 패턴. `tokens.colors.primary` → `colors.primary`, `tokens.colors.info` → `colors.info`.

- [ ] **Step 7: Verify all migrations complete**

Run: `npm run typecheck`
Expected: ZERO errors. `tokens.colors`를 참조하는 곳이 하나도 없어야 한다.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/home/ src/features/decks/ src/features/store/ src/features/profile/
git commit -m "refactor: migrate all feature screens to useTheme"
```

---

### Task 9: Settings 화면 + 라우팅

**Files:**
- Create: `app/settings/index.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/profile/index.tsx`

- [ ] **Step 1: Create Settings screen**

```tsx
// app/settings/index.tsx
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { ColorScheme, PaletteId, paletteList, palettes } from "@/src/shared/theme/palettes";
import { Screen } from "@/src/shared/ui/Screen";
import { tokens } from "@/src/shared/theme/tokens";

function PaletteRow({
  id,
  name,
  palette,
  selected,
  onSelect,
}: {
  id: PaletteId;
  name: string;
  palette: ColorScheme;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.paletteRow,
        {
          backgroundColor: colors.surfaceStrong,
          borderColor: selected ? colors.primary : colors.line,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.swatches}>
        <View style={[styles.swatch, { backgroundColor: palette.primary }]} />
        <View style={[styles.swatch, { backgroundColor: palette.accent }]} />
        <View style={[styles.swatch, { backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.line }]} />
      </View>
      <Text style={[styles.paletteName, { color: colors.ink }]}>{name}</Text>
      {selected ? <Text style={[styles.check, { color: colors.primary }]}>✓</Text> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, paletteId, setPalette } = useTheme();

  return (
    <Screen title="Settings" subtitle="앱 설정을 관리합니다">
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>COLOR PALETTE</Text>
      <View style={styles.paletteList}>
        {paletteList.map((item) => (
          <PaletteRow
            key={item.id}
            id={item.id}
            name={item.name}
            palette={palettes[item.id]}
            selected={paletteId === item.id}
            onSelect={() => setPalette(item.id)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  paletteList: {
    gap: tokens.spacing.s,
  },
  paletteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.s,
    padding: tokens.spacing.m,
    borderRadius: tokens.radius.m,
  },
  swatches: {
    flexDirection: "row",
    gap: 3,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  paletteName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  check: {
    fontSize: 16,
  },
});
```

- [ ] **Step 2: Add settings route to _layout.tsx**

`app/_layout.tsx`에서 `<Stack.Screen name="bundles/[bundleId]" />` 뒤에 추가:

```tsx
<Stack.Screen name="settings/index" />
```

- [ ] **Step 3: Add Settings button to ProfileScreen**

`app/(tabs)/profile/index.tsx`에서 (이 파일은 `src/features/profile/screens/ProfileScreen.tsx`를 re-export한다), `ProfileScreen.tsx`의 `Screen` 컴포넌트에 `rightSlot`을 추가한다:

```tsx
import { useRouter } from "expo-router";
```
(import 섹션에 추가)

함수 본문에:
```tsx
const router = useRouter();
```

`<Screen>` 컴포넌트에 rightSlot 추가:
```tsx
<Screen
  title="Profile"
  subtitle="..."
  rightSlot={
    <AppButton onPress={() => router.push("/settings")} variant="secondary">
      Settings
    </AppButton>
  }
>
```

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck`
Run: `npm run lint`

```bash
git add app/settings/ app/_layout.tsx src/features/profile/screens/ProfileScreen.tsx
git commit -m "feat: add Settings screen with palette selection"
```

---

### Task 10: 최종 검증 + 정리

**Files:** (none — verification only)

- [ ] **Step 1: Verify no tokens.colors references remain**

Run: `grep -r "tokens\.colors" src/` — should return ZERO results.

- [ ] **Step 2: Verify no hardcoded rgba/hex for theme colors**

Run: `grep -rn "rgba\|#[0-9A-Fa-f]\{6\}" src/shared/ src/features/ --include="*.tsx" --include="*.ts"` — should only show `tokens.ts` (no colors), palette files (expected), and seed data (expected, out of scope).

- [ ] **Step 3: Run typecheck and lint**

Run: `npm run typecheck`
Run: `npm run lint`

Expected: both pass with zero errors.

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final cleanup for color system migration"
```

Only run if there are fixes needed.

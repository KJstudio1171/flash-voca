import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  useDeckDetailQuery,
  useSaveDeckMutation,
} from "@/src/features/decks/hooks/useDeckQueries";
import { toEditableCards } from "@/src/features/decks/utils/deckEditing";
import { useT } from "@/src/shared/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { tokens } from "@/src/shared/theme/tokens";
import { AppButton } from "@/src/shared/ui/AppButton";
import { AppScreenFrame } from "@/src/shared/ui/AppScreenFrame";
import { CardSurface } from "@/src/shared/ui/CardSurface";
import { TextField } from "@/src/shared/ui/TextField";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function DeckEditorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useT();
  const params = useLocalSearchParams<{ deckId: string | string[] }>();
  const deckId = getParamValue(params.deckId);
  const isNewDeck = deckId === "new";
  const deckQuery = useDeckDetailQuery(deckId, !isNewDeck);
  const saveDeckMutation = useSaveDeckMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("ko");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (isNewDeck) {
      setTitle("");
      setDescription("");
      setSourceLanguage("en");
      setTargetLanguage("ko");
      setIsPublic(false);
      return;
    }

    if (!deckQuery.data) {
      return;
    }

    setTitle(deckQuery.data.title);
    setDescription(deckQuery.data.description ?? "");
    setSourceLanguage(deckQuery.data.sourceLanguage);
    setTargetLanguage(deckQuery.data.targetLanguage);
    setIsPublic(deckQuery.data.visibility === "public");
  }, [deckQuery.data, isNewDeck]);

  const canSave = title.trim().length > 0 && !saveDeckMutation.isPending;

  async function handleSave() {
    if (!canSave) {
      Alert.alert(t("deckEditor.saveAlertTitle"), t("deckEditor.saveAlertBody"));
      return;
    }

    const savedDeck = await saveDeckMutation.mutateAsync({
      id: isNewDeck ? undefined : deckId,
      title,
      description,
      sourceLanguage,
      targetLanguage,
      visibility: isPublic ? "public" : "private",
      cards: deckQuery.data ? toEditableCards(deckQuery.data.cards) : [],
    });

    router.replace(`/decks/${savedDeck.id}` as never);
  }

  return (
    <AppScreenFrame
      bottomInset="none"
      contentStyle={styles.content}
      headerSlot={
        <View style={[styles.topBar, { borderBottomColor: colors.line }]}>
          <HeaderButton iconName="chevron-left" onPress={() => router.back()} />
          <Text style={[styles.topTitle, { color: colors.ink }]}>
            {isNewDeck ? t("deckEditor.createTitle") : t("deckEditor.settingsTitle")}
          </Text>
          <HeaderButton iconName="check" onPress={() => void handleSave()} />
        </View>
      }
    >
      <CardSurface elevation="soft" style={styles.form}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>
          {t("deckEditor.basicInfo")}
        </Text>
        <LabeledField label={t("deckEditor.deckName")}>
          <TextField
            onChangeText={setTitle}
            placeholder={t("deckEditor.deckNamePlaceholder")}
            value={title}
          />
        </LabeledField>
        <LabeledField label={t("deckEditor.description")}>
          <TextField
            multiline
            onChangeText={setDescription}
            placeholder={t("deckEditor.descriptionPlaceholder")}
            style={styles.multilineInput}
            value={description}
          />
        </LabeledField>
        <View style={styles.languageRow}>
          <LabeledField label={t("deckEditor.sourceLanguage")}>
            <TextField
              autoCapitalize="none"
              onChangeText={setSourceLanguage}
              placeholder="en"
              value={sourceLanguage}
            />
          </LabeledField>
          <MaterialCommunityIcons
            color={colors.muted}
            name="arrow-right"
            size={22}
            style={styles.arrow}
          />
          <LabeledField label={t("deckEditor.targetLanguage")}>
            <TextField
              autoCapitalize="none"
              onChangeText={setTargetLanguage}
              placeholder="ko"
              value={targetLanguage}
            />
          </LabeledField>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isPublic }}
          onPress={() => setIsPublic((current) => !current)}
          style={[styles.visibilityRow, { borderColor: colors.line }]}
        >
          <View style={styles.visibilityCopy}>
            <Text style={[styles.label, { color: colors.ink }]}>
              {t("deckEditor.visibility")}
            </Text>
            <Text style={[styles.helpText, { color: colors.muted }]}>
              {t("deckEditor.visibilityHint")}
            </Text>
          </View>
          <View
            style={[
              styles.switchTrack,
              { backgroundColor: isPublic ? colors.primary : colors.line },
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                { backgroundColor: colors.surface, alignSelf: isPublic ? "flex-end" : "flex-start" },
              ]}
            />
          </View>
        </Pressable>
      </CardSurface>

      <View style={styles.footer}>
        <AppButton disabled={!canSave} onPress={() => void handleSave()}>
          {saveDeckMutation.isPending ? t("deckEditor.saving") : t("deckEditor.save")}
        </AppButton>
      </View>
    </AppScreenFrame>
  );
}

function HeaderButton({
  iconName,
  onPress,
}: {
  iconName: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.55 : 1 }]}
    >
      <MaterialCommunityIcons color={colors.ink} name={iconName} size={30} />
    </Pressable>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: tokens.spacing.m,
  },
  topTitle: {
    ...tokens.typography.heading,
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: {
    gap: tokens.spacing.l,
  },
  form: {
    gap: tokens.spacing.m,
  },
  sectionTitle: {
    ...tokens.typography.subheading,
  },
  field: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  label: {
    ...tokens.typography.captionBold,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  languageRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: tokens.spacing.s,
  },
  arrow: {
    marginBottom: 14,
  },
  visibilityRow: {
    alignItems: "center",
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    flexDirection: "row",
    gap: tokens.spacing.m,
    justifyContent: "space-between",
    padding: tokens.spacing.m,
  },
  visibilityCopy: {
    flex: 1,
    gap: 4,
  },
  helpText: {
    ...tokens.typography.caption,
  },
  switchTrack: {
    borderRadius: tokens.radius.pill,
    justifyContent: "center",
    padding: 3,
    width: 48,
  },
  switchThumb: {
    borderRadius: tokens.radius.pill,
    height: 20,
    width: 20,
  },
  footer: {
    marginTop: "auto",
  },
});

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { getDatabaseAsync } from "@/src/core/database/client";

export type StudyInteractionMode = "button_swipe" | "swipe_only" | "button_only";

export type StudyPreferences = {
  interactionMode: StudyInteractionMode;
  allowFrontSwipe: boolean;
};

type StudyPreferencesContextValue = StudyPreferences & {
  saveStudyPreferences: (preferences: StudyPreferences) => void;
};

const DEFAULT_STUDY_PREFERENCES: StudyPreferences = {
  interactionMode: "button_swipe",
  allowFrontSwipe: false,
};

const INTERACTION_MODES: Set<string> = new Set([
  "button_swipe",
  "swipe_only",
  "button_only",
]);

const STUDY_INTERACTION_MODE_KEY = "study_interaction_mode";
const STUDY_ALLOW_FRONT_SWIPE_KEY = "study_allow_front_swipe";

const StudyPreferencesContext = createContext<StudyPreferencesContextValue | null>(null);

export function StudyPreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<StudyPreferences>(
    DEFAULT_STUDY_PREFERENCES,
  );

  useEffect(() => {
    void loadStudyPreferencesAsync()
      .then(setPreferences)
      .catch(() => {
        setPreferences(DEFAULT_STUDY_PREFERENCES);
      });
  }, []);

  const saveStudyPreferences = useCallback((nextPreferences: StudyPreferences) => {
    setPreferences(nextPreferences);
    void saveStudyPreferencesAsync(nextPreferences);
  }, []);

  return (
    <StudyPreferencesContext.Provider
      value={{ ...preferences, saveStudyPreferences }}
    >
      {children}
    </StudyPreferencesContext.Provider>
  );
}

export function useStudyPreferences() {
  const context = useContext(StudyPreferencesContext);
  if (!context) {
    throw new Error("useStudyPreferences must be used within StudyPreferencesProvider");
  }
  return context;
}

async function loadStudyPreferencesAsync(): Promise<StudyPreferences> {
  const db = await getDatabaseAsync();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM app_meta WHERE key IN (?, ?)`,
    STUDY_INTERACTION_MODE_KEY,
    STUDY_ALLOW_FRONT_SWIPE_KEY,
  );

  const preferences = { ...DEFAULT_STUDY_PREFERENCES };

  for (const row of rows) {
    if (
      row.key === STUDY_INTERACTION_MODE_KEY &&
      INTERACTION_MODES.has(row.value)
    ) {
      preferences.interactionMode = row.value as StudyInteractionMode;
    } else if (row.key === STUDY_ALLOW_FRONT_SWIPE_KEY) {
      preferences.allowFrontSwipe = row.value === "true";
    }
  }

  return preferences;
}

async function saveStudyPreferencesAsync(preferences: StudyPreferences) {
  const db = await getDatabaseAsync();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
      STUDY_INTERACTION_MODE_KEY,
      preferences.interactionMode,
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
      STUDY_ALLOW_FRONT_SWIPE_KEY,
      String(preferences.allowFrontSwipe),
    );
  });
}

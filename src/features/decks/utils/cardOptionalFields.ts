import type { TranslationKey } from "@/src/shared/i18n/types";

import type { EditableDeckCard } from "./deckEditing";

export type OptionalFieldId =
  | "pronunciation"
  | "partOfSpeech"
  | "difficulty"
  | "example"
  | "exampleTranslation"
  | "note"
  | "tags"
  | "synonyms"
  | "antonyms"
  | "relatedExpressions"
  | "source"
  | "imageUri";

export const optionalFieldDefinitions = [
  { id: "pronunciation", labelKey: "cardEditor.pronunciation" },
  { id: "partOfSpeech", labelKey: "cardEditor.partOfSpeech" },
  { id: "difficulty", labelKey: "cardEditor.difficulty" },
  { id: "example", labelKey: "cardEditor.example" },
  { id: "exampleTranslation", labelKey: "cardEditor.exampleTranslation" },
  { id: "note", labelKey: "cardEditor.memo" },
  { id: "tags", labelKey: "cardEditor.tags" },
  { id: "synonyms", labelKey: "cardEditor.synonyms" },
  { id: "antonyms", labelKey: "cardEditor.antonyms" },
  { id: "relatedExpressions", labelKey: "cardEditor.relatedExpressions" },
  { id: "source", labelKey: "cardEditor.source" },
  { id: "imageUri", labelKey: "cardEditor.image" },
] satisfies { id: OptionalFieldId; labelKey: TranslationKey }[];

export function getInitialOptionalFields(card: EditableDeckCard) {
  const fields = new Set<OptionalFieldId>();
  if (card.pronunciation) fields.add("pronunciation");
  if (card.partOfSpeech) fields.add("partOfSpeech");
  if (card.difficulty && card.difficulty !== "medium") fields.add("difficulty");
  if (card.example) fields.add("example");
  if (card.exampleTranslation) fields.add("exampleTranslation");
  if (card.note) fields.add("note");
  if ((card.tags ?? []).length > 0) fields.add("tags");
  if (card.synonyms) fields.add("synonyms");
  if (card.antonyms) fields.add("antonyms");
  if (card.relatedExpressions) fields.add("relatedExpressions");
  if (card.source) fields.add("source");
  if (card.imageUri) fields.add("imageUri");
  return fields;
}

export function getClearedOptionalFieldPatch(
  fieldId: OptionalFieldId,
): Partial<EditableDeckCard> {
  switch (fieldId) {
    case "pronunciation":
      return { pronunciation: null };
    case "partOfSpeech":
      return { partOfSpeech: null };
    case "difficulty":
      return { difficulty: "medium" };
    case "example":
      return { example: null };
    case "exampleTranslation":
      return { exampleTranslation: null };
    case "note":
      return { note: null };
    case "tags":
      return { tags: [] };
    case "synonyms":
      return { synonyms: null };
    case "antonyms":
      return { antonyms: null };
    case "relatedExpressions":
      return { relatedExpressions: null };
    case "source":
      return { source: null };
    case "imageUri":
      return { imageUri: null };
  }
}

import type { GeneralNote } from "./note.types";

export interface BinnedNoteRecord {
  id: string;
  title: string;
  tags: string[];
  deletedAt: string;
  expiresAt: string;
  originalSection: string;
  note: GeneralNote;
  dsmDate?: string;
}

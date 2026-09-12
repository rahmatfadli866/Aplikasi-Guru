// Keep the display name readable while comparing subjects consistently.
export const LEGACY_SUBJECT = "__legacy_subject__";
export const LEGACY_SUBJECT_LABEL = "Nilai lama (belum ada mata pelajaran)";

export function cleanSubject(value?: string | null): string {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function subjectKey(value?: string | null): string {
  return cleanSubject(value).toLocaleLowerCase("id-ID");
}

export function uniqueSubjects(values: (string | undefined)[]): string[] {
  const names = new Map<string, string>();
  values.forEach((value) => {
    const name = cleanSubject(value);
    if (name && !names.has(subjectKey(name))) names.set(subjectKey(name), name);
  });
  return [...names.values()].sort((a, b) => a.localeCompare(b, "id-ID"));
}
export const accountAvatarOptions = [
  "aurora",
  "cobalt",
  "ember",
  "forest",
  "gold",
  "indigo",
  "rose",
  "sky",
] as const;

export type AccountAvatar = (typeof accountAvatarOptions)[number];

export function getDefaultAvatarForName(name: string) {
  const seed = name
    .trim()
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return accountAvatarOptions[seed % accountAvatarOptions.length] ?? "sky";
}

export function isValidAccountAvatar(value: string) {
  return accountAvatarOptions.includes(value as AccountAvatar);
}

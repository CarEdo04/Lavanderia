export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

// Lowercase letters and digits only: "D'Amico" → "damico", "Nicolò" → "nicolo".
function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Everyone's username is surname.name. It's only a starting point: residents
// with the same name get a number added (see availableUsername).
export function baseUsername(user: { firstName: string; lastName: string }) {
  return [slug(user.lastName), slug(user.firstName)].filter(Boolean).join(".") || "utente";
}

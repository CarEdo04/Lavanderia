export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

// "Giulia Esposito" → "GE", for the round avatars.
export function initials(user: { firstName: string; lastName: string }) {
  return [user.firstName, user.lastName].map((n) => n.trim().charAt(0).toUpperCase()).join("");
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

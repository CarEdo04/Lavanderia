export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

// "Giulia Esposito" → "GE", for the round avatars.
export function initials(user: { firstName: string; lastName: string }) {
  return [user.firstName, user.lastName].map((n) => n.trim().charAt(0).toUpperCase()).join("");
}

// Lowercase letters and digits only: "D'Amico" → "damico", "Nicolò" → "nicolo".
// Must match private.slug() in prisma/migrations/20261030120000_create_profile_on_signup.
function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Everyone's username is surname.name. The database picks the real one when
// the account is created (private.available_username), adding a number for
// homonyms; this is the preview shown on the sign-up form.
export function baseUsername(user: { firstName: string; lastName: string }) {
  return [slug(user.lastName), slug(user.firstName)].filter(Boolean).join(".") || "utente";
}

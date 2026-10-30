export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

// "Giulia Esposito" → "GE", for the round avatars.
export function initials(user: { firstName: string; lastName: string }) {
  return [user.firstName, user.lastName].map((n) => n.trim().charAt(0).toUpperCase()).join("");
}

// A deleted account that has past bookings: the row stays for the history,
// with the personal details replaced (see deleteAccount in src/app/actions.ts).
const DELETED = "eliminato";

export function deletedAccount(id: number) {
  return {
    authId: `${DELETED}:${id}`,
    firstName: "Account",
    lastName: DELETED,
    email: `${DELETED}-${id}@lavanderia.invalid`,
    username: null,
    room: null,
  };
}

export const isDeleted = (user: { authId: string }) => user.authId.startsWith(`${DELETED}:`);
export const notDeleted = { NOT: { authId: { startsWith: `${DELETED}:` } } };

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

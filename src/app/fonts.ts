import { IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google";

const sans = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Goes on <body>, in the layout and in the global error page.
export const fontVariables = `${sans.variable} ${mono.variable}`;

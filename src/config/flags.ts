// Single source of truth for what is switched on. A flag that is off means the
// route, nav item, button and text do not exist in the build output.
export const flags = {
  experience: false, // needs facts.md
  insights: false, // needs a verified article
  cv: false, // needs a CV file
  headshot: false, // not approved
  email: true,
  linkedin: true,
} as const;

export type FlagName = keyof typeof flags;

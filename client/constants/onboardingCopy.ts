export const copy = {
  welcome: {
    appName: "opus",
    subtitle: "surgical case logbook",
    tagline: "Your life\u2019s work, documented.",
    cta: "Get Started",
    signIn: "Already have an account? Sign in",
  },
  features: {
    skip: "Skip",
    slides: [
      {
        headline: "Log any case in under 60 seconds.",
        body: "Procedure autocomplete, smart defaults, and structured SNOMED CT coding \u2014 built for the pace of a surgical day.",
        cta: "Continue",
      },
      {
        headline: "One case. The whole team\u2019s logbook.",
        body: "Log once \u2014 every team member gets credit. Peer-verified cases, distributed logging, and no duplicate entry.",
        cta: "Continue",
      },
      {
        headline: "One logbook. Every registry. Any country.",
        body: "Opus captures a superset of data that satisfies the major plastic and hand surgery registries and training programmes worldwide. Export, filter, and sort your cases exactly as each programme requires.",
        cta: "Create Account",
      },
    ],
  },
  auth: {
    headline: "Create your account",
    subhead: "Your data is encrypted and never shared.",
    dividerLabel: "or",
    emailCta: "Continue with email",
    legal:
      "By continuing you agree to our Terms of Service and Privacy Policy.",
    termsLabel: "Terms of Service",
    privacyLabel: "Privacy Policy",
  },
  emailSignup: {
    emailPlaceholder: "Email address",
    passwordPlaceholder: "Password",
    cta: "Create Account",
    alreadyRegistered: "This email is already registered.",
    signInInstead: "Sign in instead?",
    networkError: "Unable to connect. Please check your connection.",
  },
  categories: {
    step: "1 of 4",
    headline: "What do you operate on?",
    subhead:
      "We\u2019ll surface the right procedures first. You can change this any time.",
    cta: "Continue",
    skip: "Skip for now",
  },
  training: {
    step: "2 of 4",
    headline: "Are you in a training programme?",
    subhead:
      "We\u2019ll format your exports to match your portfolio requirements.",
    cta: "Continue",
    skip: "Not in training \u2014 skip",
  },
  hospital: {
    step: "3 of 4",
    headline: "Where do you work?",
    subhead: "This helps with regional coding and audit formats.",
    searchPlaceholder: "Search hospital or institution\u2026",
    cta: "Continue",
    skip: "Skip for now",
  },
  privacy: {
    step: "4 of 4",
    headline: "Your data, your control.",
    trustPoints: [
      {
        icon: "shield" as const,
        title: "End-to-end encrypted",
        detail:
          "AES-256 at rest. TLS 1.3 in transit. Your operative record stays yours.",
      },
      {
        icon: "wifi-off" as const,
        title: "Works offline",
        detail:
          "Log cases anywhere \u2014 theatre, ward, or ward round. Syncs when you\u2019re back online.",
      },
      {
        icon: "slash" as const,
        title: "No ads. No tracking. No data sales.",
        detail: "Ever. Opus is funded by subscriptions, not your data.",
      },
      {
        icon: "heart" as const,
        title: "Built for healthcare data standards",
        detail:
          "Designed to support GDPR, HIPAA, and NZ Health Information Privacy Code requirements.",
      },
    ],
    finalLine:
      "Built by surgeons, for surgeons. Your operative record is your legacy \u2014 we treat it that way.",
    cta: "Start logging",
  },
};

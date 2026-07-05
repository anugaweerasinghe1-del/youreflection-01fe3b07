export type AgeGroup = "13-17" | "18-24" | "25-34" | "35-44" | "45+";

export const AGE_OPTIONS: readonly (AgeGroup | "Under 13")[] = [
  "Under 13",
  "13-17",
  "18-24",
  "25-34",
  "35-44",
  "45+",
] as const;

export type Question =
  | { id: string; category: string; type: "text"; prompt: string; placeholder?: string }
  | { id: string; category: string; type: "choice"; prompt: string; options: string[] }
  | { id: string; category: string; type: "scale"; prompt: string; min: number; max: number; minLabel?: string; maxLabel?: string };

// 14 questions after the age gate. Total on-screen prompts: 15.
// IDs referenced by detectSignals() must stay verbatim:
//   appearance_photo ("A loud one"), appearance_mirror, confidence_room ("Approval"),
//   confidence_scale, comparison_scale, relationships_recent ("Distant","One-sided"),
//   worth_belief, compassion_friend ("Heartbroken","Concerned").
export const QUESTIONS: Question[] = [
  // ---------- Self reflection (8) ----------
  { id: "appearance_photo", category: "Reflection", type: "choice",
    prompt: "You catch yourself in a candid photo. Your first thought is…",
    options: ["Kind of like it", "Nothing much", "A small critique", "A loud one"] },

  { id: "appearance_mirror", category: "Reflection", type: "scale",
    prompt: "When you look in the mirror, how kind is your inner voice?",
    min: 1, max: 10, minLabel: "Rarely kind", maxLabel: "Almost always kind" },

  { id: "confidence_room", category: "Reflection", type: "choice",
    prompt: "You walk into a room full of strangers. You're mostly looking for…",
    options: ["Someone to connect with", "A quiet spot", "Approval", "The exit"] },

  { id: "confidence_scale", category: "Reflection", type: "scale",
    prompt: "How often do you trust your own call without checking with someone else?",
    min: 1, max: 10, minLabel: "Rarely", maxLabel: "Almost always" },

  { id: "comparison_scale", category: "Reflection", type: "scale",
    prompt: "How much do you measure yourself against other people?",
    min: 1, max: 10, minLabel: "Barely", maxLabel: "A lot" },

  { id: "relationships_recent", category: "Reflection", type: "choice",
    prompt: "Your close relationships lately feel mostly…",
    options: ["Nourishing", "Steady", "One-sided", "Distant"] },

  { id: "worth_belief", category: "Reflection", type: "scale",
    prompt: "How much do you feel you're already enough, before achieving anything more?",
    min: 1, max: 10, minLabel: "Not really", maxLabel: "Deeply" },

  { id: "compassion_friend", category: "Reflection", type: "choice",
    prompt: "If a close friend talked to themselves the way you talk to yourself, you'd feel…",
    options: ["Proud of them", "Protective", "Concerned", "Heartbroken"] },

  // ---------- Society / beauty standards (6) ----------
  { id: "appearance_importance", category: "Society", type: "scale",
    prompt: "How important do you think appearance is in today's society?",
    min: 1, max: 5, minLabel: "Not important", maxLabel: "Extremely" },

  { id: "confidence_influence", category: "Society", type: "choice",
    prompt: "Which do you think influences people's confidence the most?",
    options: ["Family and upbringing", "Friends and peers", "Social media", "Personal achievements"] },

  { id: "platform_impact", category: "Society", type: "choice",
    prompt: "Which platform do you think affects body image the most?",
    options: ["Instagram", "TikTok", "Snapchat", "YouTube"] },

  { id: "celebrity_influence", category: "Society", type: "scale",
    prompt: "How much do celebrities and influencers shape beauty standards?",
    min: 1, max: 5, minLabel: "Barely", maxLabel: "Enormously" },

  { id: "edited_photos_labeled", category: "Society", type: "choice",
    prompt: "Should edited photos be labelled on social media?",
    options: ["Yes, always", "Only for ads", "No", "Not sure"] },

  { id: "pressure_source", category: "Society", type: "choice",
    prompt: "What do you think is the biggest source of pressure to look a certain way?",
    options: ["Social media", "Advertising", "Friends and family", "Yourself"] },
];

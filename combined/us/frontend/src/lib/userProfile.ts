// Health profile entered on Settings, shared with Predict without a
// state library. Backed by localStorage so it survives a refresh.
// Shape matches exactly what POST /api/predict-risk expects as `user`.

import type { UserProfile } from "./api";

const KEY = "breathesafe_user_profile";

const DEFAULT_PROFILE: UserProfile = {
  age: 25,
  severity: "moderate",
  allergy: false,
  smoker: false,
  condition: "none",
  outdoorExposure: false,
};

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveUserProfile(profile: Partial<UserProfile> & { allergy?: unknown; smoker?: unknown; outdoorExposure?: unknown }): UserProfile {
  const rawAllergy: unknown = profile.allergy;
  const rawSmoker: unknown = profile.smoker;
  const rawOutdoor: unknown = profile.outdoorExposure;
  const clean: UserProfile = {
    age: Number(profile.age) || DEFAULT_PROFILE.age,
    severity: (String(profile.severity || DEFAULT_PROFILE.severity).toLowerCase() as UserProfile["severity"]),
    allergy: rawAllergy === true || rawAllergy === "Yes" || rawAllergy === "yes",
    smoker: rawSmoker === true || rawSmoker === "Yes" || rawSmoker === "yes",
    condition: (String(profile.condition || DEFAULT_PROFILE.condition).toLowerCase() as UserProfile["condition"]),
    outdoorExposure: rawOutdoor === true || rawOutdoor === "Yes" || rawOutdoor === "yes",
  };
  localStorage.setItem(KEY, JSON.stringify(clean));
  return clean;
}
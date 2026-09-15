import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { defaultCareerProfile } from "./career-data";
import { allJobs } from "./career-jobs";
import type {
  CareerProfile,
  FeedbackAction,
  ProfileSuggestion,
  UserFeedback,
} from "./career-types";
import { buildSuggestions, feedbackLabel } from "./career-engine";
import { defaultProfile } from "./mock-jobs";
import type { ActivityEntry, Application, ApplicationStatus, Job, Profile } from "./types";

const KEY = "solstice-workspace-v1";

interface Persisted {
  profile: Profile;
  career: CareerProfile;
  saved: string[];
  applications: Application[];
  activity: ActivityEntry[];
  feedback: UserFeedback[];
  dismissedSuggestions: string[];
}

const seedActivity: ActivityEntry[] = [
  {
    id: "seed-3",
    jobId: "lumen-senior-product-designer",
    jobTitle: "Senior Product Designer",
    company: "Lumen Studio",
    kind: "applied",
    label: "Applied to Senior Product Designer",
    at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "seed-2",
    jobId: "northwind-lead-ux-engineer",
    jobTitle: "Lead UX Engineer",
    company: "Northwind Labs",
    kind: "status",
    label: "Status moved to In review — Northwind Labs",
    at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: "seed-1",
    jobId: "cobalt-head-of-design",
    jobTitle: "Head of Design",
    company: "Cobalt",
    kind: "saved",
    label: "Saved Head of Design",
    at: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
  },
];

const initial: Persisted = {
  profile: defaultProfile,
  career: defaultCareerProfile,
  feedback: [],
  dismissedSuggestions: [],
  saved: ["cobalt-head-of-design", "vela-principal-product-designer"],
  applications: [
    {
      jobId: "lumen-senior-product-designer",
      status: "applied",
      appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      jobId: "northwind-lead-ux-engineer",
      status: "in_review",
      appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    },
  ],
  activity: seedActivity,
};

interface Store extends Persisted {
  jobs: Job[];
  hydrated: boolean;
  suggestions: ProfileSuggestion[];
  updateProfile: (next: Profile) => void;
  updateCareer: (next: CareerProfile) => void;
  recordFeedback: (job: Job, action: FeedbackAction) => void;
  feedbackFor: (jobId: string) => FeedbackAction | undefined;
  acceptSuggestion: (suggestion: ProfileSuggestion) => void;
  dismissSuggestion: (id: string) => void;
  toggleSaved: (job: Job) => void;
  isSaved: (jobId: string) => boolean;
  apply: (job: Job) => void;
  setStatus: (job: Job, status: ApplicationStatus) => void;
  statusFor: (jobId: string) => ApplicationStatus | undefined;
}

const StoreContext = createContext<Store | null>(null);

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...(JSON.parse(raw) as Persisted) });
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const log = useCallback((entry: Omit<ActivityEntry, "id" | "at">) => {
    setState((prev) => ({
      ...prev,
      activity: [{ ...entry, id: newId(), at: new Date().toISOString() }, ...prev.activity].slice(
        0,
        60,
      ),
    }));
  }, []);

  const updateProfile = useCallback(
    (next: Profile) => {
      setState((prev) => ({ ...prev, profile: next }));
      log({
        jobId: "",
        jobTitle: "",
        company: "",
        kind: "profile",
        label: "Profile updated — matches re-scored",
      });
    },
    [log],
  );

  const toggleSaved = useCallback(
    (job: Job) => {
      setState((prev) => {
        const has = prev.saved.includes(job.id);
        return { ...prev, saved: has ? prev.saved.filter((id) => id !== job.id) : [job.id, ...prev.saved] };
      });
      const wasSaved = state.saved.includes(job.id);
      log({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        kind: wasSaved ? "unsaved" : "saved",
        label: `${wasSaved ? "Removed" : "Saved"} ${job.title} — ${job.company}`,
      });
    },
    [log, state.saved],
  );

  const apply = useCallback(
    (job: Job) => {
      setState((prev) => {
        if (prev.applications.some((a) => a.jobId === job.id)) return prev;
        return {
          ...prev,
          applications: [
            { jobId: job.id, status: "applied", appliedAt: new Date().toISOString() },
            ...prev.applications,
          ],
        };
      });
      log({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        kind: "applied",
        label: `Applied to ${job.title} — ${job.company}`,
      });
    },
    [log],
  );

  const setStatus = useCallback(
    (job: Job, status: ApplicationStatus) => {
      setState((prev) => ({
        ...prev,
        applications: prev.applications.some((a) => a.jobId === job.id)
          ? prev.applications.map((a) => (a.jobId === job.id ? { ...a, status } : a))
          : [{ jobId: job.id, status, appliedAt: new Date().toISOString() }, ...prev.applications],
      }));
      log({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        kind: "status",
        label: `Status moved to ${statusLabel(status)} — ${job.company}`,
      });
    },
    [log],
  );

  const updateCareer = useCallback(
    (next: CareerProfile) => {
      setState((prev) => ({ ...prev, career: next }));
      log({
        jobId: "",
        jobTitle: "",
        company: "",
        kind: "profile",
        label: "Career profile updated — directions and matches re-scored",
      });
    },
    [log],
  );

  const recordFeedback = useCallback(
    (job: Job, action: FeedbackAction) => {
      setState((prev) => ({
        ...prev,
        feedback: [
          {
            id: newId(),
            jobId: job.id,
            jobTitle: job.title,
            action,
            ...(job.careerDirection ? { directionId: job.careerDirection } : {}),
            at: new Date().toISOString(),
          },
          ...prev.feedback.filter((f) => !(f.jobId === job.id && f.action === action)),
        ].slice(0, 120),
      }));
      if (action !== "viewed") {
        log({
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          kind: "feedback",
          label: `${feedbackLabel(action)} — ${job.title}`,
        });
      }
    },
    [log],
  );

  const acceptSuggestion = useCallback(
    (suggestion: ProfileSuggestion) => {
      setState((prev) => {
        const key = suggestion.interestKey;
        const career = key
          ? {
              ...prev.career,
              learning: {
                ...prev.career.learning,
                [key]: Math.min(5, prev.career.learning[key] + 1),
              },
            }
          : prev.career;
        return {
          ...prev,
          career: career as CareerProfile,
          dismissedSuggestions: [...prev.dismissedSuggestions, suggestion.id],
        };
      });
      log({
        jobId: "",
        jobTitle: "",
        company: "",
        kind: "profile",
        label: "You confirmed a career profile suggestion",
      });
    },
    [log],
  );

  const dismissSuggestion = useCallback((id: string) => {
    setState((prev) => ({ ...prev, dismissedSuggestions: [...prev.dismissedSuggestions, id] }));
  }, []);

  const suggestions = useMemo(
    () =>
      buildSuggestions(state.career, state.feedback, allJobs).filter(
        (s) => !state.dismissedSuggestions.includes(s.id),
      ),
    [state.career, state.feedback, state.dismissedSuggestions],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      jobs: allJobs,
      hydrated,
      suggestions,
      updateProfile,
      updateCareer,
      recordFeedback,
      feedbackFor: (id) => state.feedback.find((f) => f.jobId === id && f.action !== "viewed")?.action,
      acceptSuggestion,
      dismissSuggestion,
      toggleSaved,
      isSaved: (id) => state.saved.includes(id),
      apply,
      setStatus,
      statusFor: (id) => state.applications.find((a) => a.jobId === id)?.status,
    }),
    [
      state,
      hydrated,
      suggestions,
      updateProfile,
      updateCareer,
      recordFeedback,
      acceptSuggestion,
      dismissSuggestion,
      toggleSaved,
      apply,
      setStatus,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

export function statusLabel(status: ApplicationStatus) {
  return {
    saved: "Saved",
    applied: "Applied",
    in_review: "In review",
    interview: "Interview",
    offer: "Offer",
    rejected: "Closed",
  }[status];
}

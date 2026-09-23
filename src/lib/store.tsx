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
import { adaptRawJobToJob } from "./job-adapter";
import { ingestAndAdaptJobs } from "./job-discovery-adapter";
import type { JobRecord } from "./job-discovery-pipeline";
import { normalizeJobConcepts } from "./job-normalize";
import type { RawJob } from "./job-source-types";
import { defaultIdentity, deriveLegacyProfile, type ProfileIdentity } from "./profile-bridge";
import type {
  ActivityEntry,
  Application,
  ApplicationStatus,
  Job,
  NormalizedJob,
  Profile,
} from "./types";

const KEY = "solstice-workspace-v1";

interface Persisted {
  /**
   * Compatibility identity only (display name, headline, salary floor).
   * `career` is the single authoritative profile — the flat `Profile` shape is
   * derived from it, never stored separately.
   */
  identity: ProfileIdentity;
  career: CareerProfile;
  saved: string[];
  applications: Application[];
  activity: ActivityEntry[];
  feedback: UserFeedback[];
  dismissedSuggestions: string[];
  importedJobRecords: JobRecord[];
}

const seedActivity: ActivityEntry[] = [
  {
    id: "seed-3",
    jobId: "shiro-ai-ecommerce-operations",
    jobTitle: "AI E-commerce Operations Specialist",
    company: "Shiro Global",
    kind: "applied",
    label: "Applied to AI E-commerce Operations Specialist",
    at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: "seed-2",
    jobId: "beacon-ai-product-research",
    jobTitle: "AI Product Research Associate",
    company: "Beacon Labs",
    kind: "status",
    label: "Status moved to In review — Beacon Labs",
    at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: "seed-1",
    jobId: "yuanli-ai-visual-designer",
    jobTitle: "AI Visual Creation Specialist",
    company: "Yuanli Studio",
    kind: "saved",
    label: "Saved AI Visual Creation Specialist",
    at: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
  },
];

const initial: Persisted = {
  identity: defaultIdentity,
  career: defaultCareerProfile,
  feedback: [],
  dismissedSuggestions: [],
  importedJobRecords: [],
  saved: ["pivot-ai-prompt-project", "yuanli-ai-visual-designer"],
  applications: [
    {
      jobId: "shiro-ai-ecommerce-operations",
      status: "applied",
      appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    },
    {
      jobId: "beacon-ai-product-research",
      status: "in_review",
      appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    },
  ],
  activity: seedActivity,
};

interface Store extends Persisted {
  jobs: NormalizedJob[];
  /** Derived compatibility view of `career`. Read-only source of truth: career. */
  profile: Profile;
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
  importRawJob: (raw: RawJob) => { added: boolean; warnings: string[] };
}

const StoreContext = createContext<Store | null>(null);

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Older saves stored a full flat profile (including a demo persona). */
function migrate(raw: string): Persisted {
  const parsed = JSON.parse(raw) as Partial<Persisted> & { profile?: Partial<Profile> };
  const legacy = parsed.profile;
  const identity: ProfileIdentity = parsed.identity ?? {
    name: legacy?.name && legacy.name !== "Maya Okonkwo" ? legacy.name : defaultIdentity.name,
    headline:
      legacy?.headline && legacy.headline !== "Product Designer"
        ? legacy.headline
        : defaultIdentity.headline,
    minSalary: legacy?.minSalary ?? defaultIdentity.minSalary,
  };
  const next = { ...initial, ...parsed, identity } as Persisted & { profile?: unknown };
  delete next.profile;
  return next;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setState(migrate(raw));
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

  const importRawJob = useCallback(
    (raw: RawJob) => {
      const existing = state.importedJobRecords.find((record) => record.raw.id === raw.id);
      const recordsWithoutCurrent = state.importedJobRecords.filter((record) => record.raw.id !== raw.id);
      const result = ingestAndAdaptJobs({ records: recordsWithoutCurrent }, [raw]);
      if (!result.records.length) return { added: false, warnings: ["The imported job could not be normalized."] };
      const latest = result.records.at(-1);
      if (!latest) return { added: false, warnings: ["The imported job could not be normalized."] };
      const normalized = normalizeJobConcepts(latest.job);
      const storedRecord: JobRecord = { raw: latest.raw, lifecycle: latest.lifecycle };
      setState((prev) => ({
        ...prev,
        importedJobRecords: [
          ...prev.importedJobRecords.filter((record) => record.raw.id !== storedRecord.raw.id),
          storedRecord,
        ],
      }));
      log({
        jobId: normalized.id,
        jobTitle: normalized.title,
        company: normalized.company,
        kind: "saved",
        label: "Imported job — " + normalized.title,
      });
      return { added: true, warnings: latest.warnings };
    },
    [log, state.importedJobRecords],
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

  /**
   * The flat profile is a compatibility view. Edits are written back onto the
   * authoritative career profile (or the display identity), so no second
   * profile can drift out of sync.
   */
  const updateProfile = useCallback(
    (next: Profile) => {
      setState((prev) => ({
        ...prev,
        identity: {
          name: next.name,
          headline: next.headline,
          minSalary: next.minSalary,
        },
        career: {
          ...prev.career,
          basics: {
            ...prev.career.basics,
            workMode: next.workModePreference,
            preferredLocations: [next.location, ...prev.career.basics.preferredLocations.slice(1)],
          },
        },
      }));
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
        return {
          ...prev,
          saved: has ? prev.saved.filter((id) => id !== job.id) : [job.id, ...prev.saved],
        };
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
      recordFeedback(job, "applied");
    },
    [log, recordFeedback],
  );

  /** Application statuses that are also behavioural signals. */
  const STATUS_FEEDBACK: Partial<Record<ApplicationStatus, FeedbackAction>> = useMemo(
    () => ({ applied: "applied", interview: "interview", rejected: "rejected", offer: "accepted" }),
    [],
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
      const action = STATUS_FEEDBACK[status];
      if (action) recordFeedback(job, action);
    },
    [log, recordFeedback, STATUS_FEEDBACK],
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

  const importedJobs = useMemo(() => state.importedJobRecords.map((record) => normalizeJobConcepts(adaptStoredRecord(record))), [state.importedJobRecords]);
  const jobs = useMemo(() => [...allJobs, ...importedJobs], [importedJobs]);

  const suggestions = useMemo(
    () =>
      buildSuggestions(state.career, state.feedback, jobs).filter(
        (s) => !state.dismissedSuggestions.includes(s.id),
      ),
    [state.career, state.feedback, state.dismissedSuggestions, jobs],
  );

  const profile = useMemo(
    () => deriveLegacyProfile(state.career, state.identity),
    [state.career, state.identity],
  );

  const value = useMemo<Store>(
    () => ({
      ...state,
      jobs,
      profile,
      hydrated,
      suggestions,
      updateProfile,
      updateCareer,
      recordFeedback,
      feedbackFor: (id) =>
        state.feedback.find((f) => f.jobId === id && f.action !== "viewed")?.action,
      acceptSuggestion,
      dismissSuggestion,
      toggleSaved,
      isSaved: (id) => state.saved.includes(id),
      apply,
      setStatus,
      statusFor: (id) => state.applications.find((a) => a.jobId === id)?.status,
      importRawJob,
    }),
    [
      state,
      profile,
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
      importRawJob,
      jobs,
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
}function adaptStoredRecord(record: JobRecord): Job {
  return adaptRawJobToJob(record.raw).job;
}

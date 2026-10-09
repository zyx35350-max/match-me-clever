import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getSupabaseClient } from "./supabase";
import type { CareerProfile } from "./career-types";
import type { ProfileIdentity } from "./profile-bridge";
import type { JobSearchCity } from "./job-search-preferences";

export interface CloudProfile {
  id: string;
  name: string | null;
  headline: string | null;
  min_salary: number | null;
  career_profile: CareerProfile;
  search_cities: JobSearchCity[];
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: { id: string; email?: string | null } | null;
  loading: boolean;
  profileLoading: boolean;
  cloudProfile: CloudProfile | null;
  profileComplete: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  saveProfile: (input: {
    identity: ProfileIdentity;
    career: CareerProfile;
    searchCities: JobSearchCity[];
    onboardingComplete: boolean;
  }) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function translateAuthError(message: string) {
  const map: Array<[string, string]> = [
    ["Invalid login credentials", "邮箱或密码不正确。"],
    ["Email not confirmed", "邮箱还没有完成验证，请先点击验证邮件。"],
    ["Password should be at least 6 characters", "密码至少需要 6 位。"],
    ["User already registered", "这个邮箱已经注册过了，直接登录即可。"],
    ["Unable to validate email address", "邮箱格式不正确。"],
    ["Email rate limit exceeded", "邮件发送太频繁，请稍后再试。"],
  ];
  return map.find(([key]) => message.includes(key))?.[1] ?? message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<CloudProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) {
      setCloudProfile(null);
      return;
    }

    setProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!error) {
      setCloudProfile((data as CloudProfile | null) ?? null);
    } else {
      console.error("Failed to load profile:", error);
    }
    setProfileLoading(false);
  }, [user]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const nextUser = data.session?.user ?? null;
      setUser(nextUser ? { id: nextUser.id, email: nextUser.email ?? null } : null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser ? { id: nextUser.id, email: nextUser.email ?? null } : null);
      if (!nextUser) setCloudProfile(null);
      setLoading(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading) void refreshProfile();
  }, [loading, user, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "登录服务暂时不可用，请刷新页面后重试。" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: translateAuthError(error.message) } : {};
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: "注册服务暂时不可用，请刷新页面后重试。" };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: translateAuthError(error.message) };
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setCloudProfile(null);
    setUser(null);
  }, []);

  const saveProfile = useCallback(
    async ({ identity, career, searchCities, onboardingComplete }: {
      identity: ProfileIdentity;
      career: CareerProfile;
      searchCities: JobSearchCity[];
      onboardingComplete: boolean;
    }) => {
      const supabase = getSupabaseClient();
      if (!supabase || !user) return { error: "当前没有登录用户。" };

      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: identity.name,
          headline: identity.headline,
          min_salary: identity.minSalary,
          career_profile: career,
          search_cities: searchCities,
          onboarding_complete: onboardingComplete,
        })
        .select("*")
        .single();

      if (error) return { error: translateAuthError(error.message) };
      setCloudProfile(data as CloudProfile);
      return {};
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      profileLoading,
      cloudProfile,
      profileComplete: Boolean(cloudProfile?.onboarding_complete),
      signIn,
      signUp,
      signOut,
      saveProfile,
      refreshProfile,
    }),
    [
      user,
      loading,
      profileLoading,
      cloudProfile,
      signIn,
      signUp,
      signOut,
      saveProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

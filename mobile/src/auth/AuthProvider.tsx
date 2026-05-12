import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "../lib/supabase";

type SignUpProfile = {
  handle?: string;
  displayName?: string;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  previewMode: boolean;
  session: Session | null;
  user: User | null;
  enterPreview: () => void;
  exitPreview: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithAppleIdToken: (identityToken: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    profile?: SignUpProfile,
  ) => Promise<string | null>;
  signOut: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabaseの環境変数が未設定です";
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      setSession(data.session);
      setPreviewMode(false);
    }
    return error?.message ?? null;
  }, []);

  const signInWithAppleIdToken = useCallback(async (identityToken: string) => {
    if (!supabase) return "Supabaseの環境変数が未設定です";
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
    });
    if (!error) {
      setSession(data.session);
      setPreviewMode(false);
    }
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, profile?: SignUpProfile) => {
      if (!supabase) return "Supabaseの環境変数が未設定です";
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: Linking.createURL("/auth/email-confirmed"),
          data: {
            handle: profile?.handle,
            display_name: profile?.displayName ?? profile?.handle,
          },
        },
      });
      if (!error) setPreviewMode(false);
      return error?.message ?? null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    setPreviewMode(false);
    if (!supabase) return "Supabaseの環境変数が未設定です";
    const { error } = await supabase.auth.signOut();
    if (!error) setSession(null);
    return error?.message ?? null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: hasSupabaseConfig,
      loading,
      previewMode,
      session,
      user: session?.user ?? null,
      enterPreview: () => setPreviewMode(true),
      exitPreview: () => setPreviewMode(false),
      signIn,
      signInWithAppleIdToken,
      signUp,
      signOut,
    }),
    [loading, previewMode, session, signIn, signInWithAppleIdToken, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

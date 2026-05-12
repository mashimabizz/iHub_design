export type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

export function hasSupabasePublicEnv(
  env: Partial<SupabasePublicEnv>,
): env is SupabasePublicEnv {
  return Boolean(env.url && env.publishableKey);
}

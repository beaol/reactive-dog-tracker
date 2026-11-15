import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json. The web app can be hosted under a sub-path — e.g. GitHub
 * Pages serves project sites from https://<user>.github.io/<repo>/ — so the
 * build reads the path from WEB_BASE_URL (set by the GitHub Actions workflow).
 * Unset = hosted at the domain root (Netlify, Cloudflare Pages, local).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.WEB_BASE_URL?.replace(/\/+$/, '');
  return {
    ...config,
    experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) },
  } as ExpoConfig;
};

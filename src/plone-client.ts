import axios, { AxiosInstance } from "axios";
import { z } from "zod";

// Environment variable names for configuration
export const ENV_BASE_URL = "PLONE_BASE_URL";
export const ENV_USERNAME = "PLONE_USERNAME";
export const ENV_PASSWORD = "PLONE_PASSWORD";
export const ENV_TOKEN = "PLONE_TOKEN";

// Helper for optional non-empty strings with environment variable fallback
export const optionalNonEmpty = (envVar: string) =>
  z
    .string()
    .optional()
    .refine((val) => !val || val.trim() !== "", {
      message: `Cannot be empty string. Omit field to use ${envVar} environment variable.`,
    });

// Helper to validate URL format
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Configuration schema - all fields are optional to allow environment variable fallback
export const ConfigSchema = z.object({
  baseUrl: optionalNonEmpty(ENV_BASE_URL).refine(
    (val) => !val || isValidUrl(val),
    {
      message: "Must be a valid URL (e.g., https://example.com)",
    },
  ),
  username: optionalNonEmpty(ENV_USERNAME),
  password: optionalNonEmpty(ENV_PASSWORD),
  token: optionalNonEmpty(ENV_TOKEN),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Resolves configuration by merging provided config with environment variables.
 * Environment variables are used as fallback when config values are not provided.
 *
 * Supported environment variables:
 * - PLONE_BASE_URL: Base URL of the Plone site
 * - PLONE_USERNAME: Username for authentication
 * - PLONE_PASSWORD: Password for authentication
 * - PLONE_TOKEN: JWT token for authentication
 */
export function resolveConfig(config: Config): Config & { baseUrl: string } {
  const baseUrl = config.baseUrl || process.env[ENV_BASE_URL];
  const username = config.username || process.env[ENV_USERNAME];
  const password = config.password || process.env[ENV_PASSWORD];
  const token = config.token || process.env[ENV_TOKEN];

  // Validate baseUrl exists and is not empty
  if (!baseUrl || baseUrl.trim() === "") {
    throw new Error(
      `Base URL is required. Provide it via config.baseUrl or ${ENV_BASE_URL} environment variable.`,
    );
  }

  if (!isValidUrl(baseUrl)) {
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }

  return {
    baseUrl,
    username,
    password,
    token,
  };
}

// Plone content interface
export interface PloneContent {
  "@type": string;
  title: string;
  blocks?: Record<string, any>;
  blocks_layout?: { items: string[] };
  [key: string]: any;
}

/**
 * HTTP client for communicating with Plone REST API
 */
export class PloneClient {
  private axios: AxiosInstance;
  public config: Config & { baseUrl: string };

  constructor(config: Config) {
    this.config = resolveConfig(config);
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");

    this.axios = axios.create({
      baseURL: `${baseUrl}/++api++`,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    // Set up authentication
    if (this.config.token) {
      this.axios.defaults.headers.common["Authorization"] =
        `Bearer ${this.config.token}`;
    } else if (this.config.username && this.config.password) {
      this.axios.defaults.auth = {
        username: this.config.username,
        password: this.config.password,
      };
    }
  }

  // IMPROVEMENT: Centralize path normalization
  normalizePath(path: string): string {
    if (!path) return "/";
    // Remove trailing slash, ensure leading slash
    let normalized = path.replace(/\/$/, "");
    if (!normalized.startsWith("/") && normalized !== "") {
      normalized = `/${normalized}`;
    }
    return normalized;
  }

  async get(path: string, params?: Record<string, any>): Promise<any> {
    const normalizedPath = this.normalizePath(path);
    const response = await this.axios.get(normalizedPath, { params });
    return response.data;
  }

  async post(path: string, data?: any): Promise<any> {
    const normalizedPath = this.normalizePath(path);
    const response = await this.axios.post(normalizedPath, data);
    return response.data;
  }

  async patch(path: string, data?: any): Promise<any> {
    const normalizedPath = this.normalizePath(path);
    const response = await this.axios.patch(normalizedPath, data);
    return response.data;
  }

  async delete(path: string): Promise<any> {
    const normalizedPath = this.normalizePath(path);
    const response = await this.axios.delete(normalizedPath);
    return response.data;
  }
}

import { supabase } from "./supabase";

const getCleanApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || "";
  if (!url || url.includes("your_") || url.includes("placeholder")) {
    return "https://wrindha-os.onrender.com";
  }
  // Remove trailing slashes
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
};

export const API_URL = getCleanApiUrl();

/**
 * Perform a fetch relative to the sanitized API_URL.
 */
export const apiFetch = (endpoint: string, options?: RequestInit) => {
  const formattedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return fetch(`${API_URL}${formattedEndpoint}`, options);
};

/**
 * Centralized authenticated fetch that appends Bearer token & User headers automatically.
 * Supports both relative endpoints (e.g., "/api/jobs") and full absolute URLs.
 */
export const authFetch = async (url: string, options: RequestInit = {}) => {
  // If url is relative (e.g. starts with '/'), prefix it with the API_URL
  let targetUrl = url;
  if (url.startsWith("/")) {
    targetUrl = `${API_URL}${url}`;
  } else if (url.startsWith("api/")) {
    targetUrl = `${API_URL}/${url}`;
  }

  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...options.headers } as Record<string, string>;
  
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  if (session?.user?.id) {
    headers["x-user-id"] = session.user.id;
    headers["x-user-email"] = session.user.email || "";
  }
  
  return fetch(targetUrl, { ...options, headers });
};

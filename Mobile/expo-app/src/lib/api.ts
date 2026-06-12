import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "pet_adoption_access_token";
const REFRESH_TOKEN_KEY = "pet_adoption_refresh_token";

let accessTokenMemory: string | null = null;
let refreshTokenMemory: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

const buildNetworkError = () =>
  new ApiError(
    `Unable to reach the API at ${API_BASE_URL}. If you're using a physical phone, start Django with 0.0.0.0:8000 and set EXPO_PUBLIC_API_URL to your computer's LAN address.`,
    0,
  );

const extractHost = (value: string) => {
  if (!value) {
    return "";
  }

  return value
    .replace(/^\w+:\/\//, "")
    .split(/[/:]/)[0]
    .trim();
};

const getExpoHost = () => {
  const expoConfigHost = extractHost(Constants.expoConfig?.hostUri || "");
  const manifest2Host = extractHost((Constants as any)?.manifest2?.extra?.expoClient?.hostUri || "");
  const debuggerHost = extractHost((Constants as any)?.manifest?.debuggerHost || "");

  return expoConfigHost || manifest2Host || debuggerHost || "";
};

const getDefaultDevHost = () => {
  if (Platform.OS === "android") {
    return Device.isDevice ? getExpoHost() || "127.0.0.1" : "10.0.2.2";
  }

  return "127.0.0.1";
};

const getDevApiBaseUrl = () => {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const host = getDefaultDevHost();
  return `http://${host}:8000/api`;
};

export const API_BASE_URL = __DEV__ ? getDevApiBaseUrl() : "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const canUseLocalStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readStorageValue = (key: string) => {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorageValue = (key: string, value: string) => {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in development.
  }
};

const removeStorageValue = (key: string) => {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures in development.
  }
};

export function getAccessToken() {
  return accessTokenMemory || readStorageValue(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return refreshTokenMemory || readStorageValue(REFRESH_TOKEN_KEY);
}

export function setTokens(access?: string, refresh?: string) {
  accessTokenMemory = access || null;
  refreshTokenMemory = refresh || null;

  if (access) {
    writeStorageValue(ACCESS_TOKEN_KEY, access);
  }

  if (refresh) {
    writeStorageValue(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearTokens() {
  accessTokenMemory = null;
  refreshTokenMemory = null;
  removeStorageValue(ACCESS_TOKEN_KEY);
  removeStorageValue(REFRESH_TOKEN_KEY);
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          url.searchParams.append(key, String(item));
        });
        return;
      }

      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { detail: text } : null;
}

function buildErrorMessage(response: Response, data: any) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data?.detail && typeof data.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return `Request failed with status ${response.status}`;
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refresh = getRefreshToken();

  if (!refresh) {
    clearTokens();
    return null;
  }

  refreshPromise = (async () => {
    let response: Response;

    try {
      response = await fetch(buildUrl("/auth/token/refresh/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      throw buildNetworkError();
    }

    const data = await parseResponse(response);

    if (!response.ok || !data?.access) {
      clearTokens();
      throw new ApiError(buildErrorMessage(response, data), response.status, data);
    }

    setTokens(data.access, refresh);
    return data.access;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiRequest(
  path: string,
  {
    method = "GET",
    data,
    params,
    headers = {},
    retry = true,
  }: {
    method?: string;
    data?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    retry?: boolean;
  } = {},
) {
  const accessToken = getAccessToken();
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: requestHeaders,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw buildNetworkError();
  }

  const responseData = await parseResponse(response);

  if (response.status === 401 && retry && getRefreshToken()) {
    try {
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        return apiRequest(path, {
          method,
          data,
          params,
          headers,
          retry: false,
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError("Session expired. Please log in again.", 401);
    }
  }

  if (!response.ok) {
    throw new ApiError(
      buildErrorMessage(response, responseData),
      response.status,
      responseData,
    );
  }

  return responseData;
}

export async function loginUser(data: { username: string; password: string }) {
  const response = await apiRequest("/auth/token/", {
    method: "POST",
    data,
  });

  if (response?.access && response?.refresh) {
    setTokens(response.access, response.refresh);
  }

  return response;
}

export async function loginWithGoogle(data: { id_token: string; role?: string }) {
  const response = await apiRequest("/auth/google/", {
    method: "POST",
    data,
  });

  if (response?.access && response?.refresh) {
    setTokens(response.access, response.refresh);
  }

  return response;
}

export async function getCurrentUser() {
  return apiRequest("/auth/me/");
}

export async function updateCurrentUser(data: {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  community_alias?: string;
  profile_photo_url?: string;
}) {
  return apiRequest("/auth/me/", {
    method: "PATCH",
    data,
  });
}

export async function registerUser(data: {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
}) {
  return apiRequest("/auth/register/", {
    method: "POST",
    data,
  });
}

export async function listPets(params: Record<string, unknown> = {}) {
  return apiRequest("/pets/", { params });
}

export async function listMyPets() {
  return apiRequest("/pets/my/");
}

export async function deletePet(id: string | number) {
  return apiRequest(`/pets/${id}/`, {
    method: "DELETE",
  });
}

export async function getPetDetail(id: string | number) {
  return apiRequest(`/pets/${id}/`);
}

export async function listWishlist() {
  return apiRequest("/wishlist/");
}

export async function addToWishlist(petId: string | number) {
  return apiRequest("/wishlist/", {
    method: "POST",
    data: { pet_id: Number(petId) },
  });
}

export async function removeFromWishlist(id: string | number) {
  return apiRequest(`/wishlist/${id}/`, {
    method: "DELETE",
  });
}

export async function listMyApplications() {
  return apiRequest("/applications/my/");
}

export async function listReceivedApplications() {
  return apiRequest("/applications/received/");
}

export async function createAdoptionApplication(data: {
  pet_id: number;
  message?: string;
  preferred_visit_date?: string;
  meeting_preference?: string;
  meeting_location_notes?: string;
}) {
  return apiRequest("/applications/create/", {
    method: "POST",
    data,
  });
}

export async function withdrawApplication(id: string | number) {
  return apiRequest(`/applications/${id}/withdraw/`, {
    method: "POST",
  });
}

export async function rejectApplication(id: string | number) {
  return apiRequest(`/applications/${id}/reject/`, {
    method: "POST",
  });
}

export async function proposeVisitPlan(
  id: string | number,
  data: {
    preferred_visit_date?: string;
    meeting_preference?: string;
    meeting_location_notes?: string;
  },
) {
  return apiRequest(`/applications/${id}/visit-plan/`, {
    method: "POST",
    data,
  });
}

export async function acceptVisitPlan(id: string | number) {
  return apiRequest(`/applications/${id}/visit-plan/accept/`, {
    method: "POST",
  });
}

export async function startConversation(petId: string | number) {
  return apiRequest("/conversations/", {
    method: "POST",
    data: { pet_id: Number(petId) },
  });
}

export async function listConversations() {
  return apiRequest("/conversations/");
}

export async function getConversationDetail(id: string | number) {
  return apiRequest(`/conversations/${id}/`);
}

export async function sendConversationMessage(
  id: string | number,
  data: { body: string },
) {
  return apiRequest(`/conversations/${id}/messages/`, {
    method: "POST",
    data,
  });
}

export async function listNotifications() {
  return apiRequest("/notifications/");
}

export async function markNotificationRead(id: string | number) {
  return apiRequest(`/notifications/${id}/read/`, {
    method: "PATCH",
  });
}

export async function getUnreadNotificationCount() {
  return apiRequest("/notifications/unread-count/");
}

export async function listCommunityPosts() {
  return apiRequest("/community/posts/");
}

export async function createCommunityPost(data: {
  body?: string;
  image_url?: string;
  category?: string;
}) {
  return apiRequest("/community/posts/", {
    method: "POST",
    data,
  });
}

export async function createCommunityComment(
  postId: string | number,
  data: {
    body?: string;
    image_url?: string;
    video_url?: string;
    sticker?: string;
  },
) {
  return apiRequest(`/community/posts/${postId}/comments/`, {
    method: "POST",
    data,
  });
}

export async function reactToCommunityPost(postId: string | number, value: "like" | "dislike") {
  return apiRequest(`/community/posts/${postId}/reaction/`, {
    method: "POST",
    data: { value },
  });
}

export async function reactToCommunityComment(commentId: string | number, value: "like" | "dislike") {
  return apiRequest(`/community/comments/${commentId}/reaction/`, {
    method: "POST",
    data: { value },
  });
}

export async function repostCommunityPost(postId: string | number, data: { body?: string } = {}) {
  return apiRequest(`/community/posts/${postId}/repost/`, {
    method: "POST",
    data,
  });
}

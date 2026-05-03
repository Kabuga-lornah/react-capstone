const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const ACCESS_TOKEN_KEY = "pet_adoption_access_token";
const REFRESH_TOKEN_KEY = "pet_adoption_refresh_token";

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access, refresh) {
  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
  }

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function buildUrl(path, params) {
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

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { detail: text } : null;
}

function buildErrorMessage(response, data) {
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
  const refresh = getRefreshToken();

  if (!refresh) {
    clearTokens();
    return null;
  }

  const response = await fetch(buildUrl("/auth/token/refresh/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  const data = await parseResponse(response);

  if (!response.ok || !data?.access) {
    clearTokens();
    throw new ApiError(
      buildErrorMessage(response, data),
      response.status,
      data,
    );
  }

  setTokens(data.access, refresh);
  return data.access;
}

export async function apiRequest(
  path,
  { method = "GET", data, params, headers = {}, retry = true } = {},
) {
  const accessToken = getAccessToken();
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

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

export async function registerUser(data) {
  return apiRequest("/auth/register/", {
    method: "POST",
    data,
  });
}

export async function loginUser(data) {
  const response = await apiRequest("/auth/token/", {
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

export async function updateCurrentUser(data) {
  return apiRequest("/auth/me/", {
    method: "PATCH",
    data,
  });
}

export async function submitRehomerVerification(data) {
  return apiRequest("/rehomer/verification/submit/", {
    method: "POST",
    data,
  });
}

export async function sendHeartbeat() {
  return apiRequest("/auth/heartbeat/", {
    method: "PATCH",
    data: {},
  });
}

export async function listPets(params = {}) {
  return apiRequest("/pets/", { params });
}

export async function listMyPets() {
  return apiRequest("/pets/my/");
}

export async function getPetDetail(id) {
  return apiRequest(`/pets/${id}/`);
}

export async function createPet(data) {
  return apiRequest("/pets/create/", {
    method: "POST",
    data,
  });
}

export async function updatePet(id, data) {
  return apiRequest(`/pets/${id}/`, {
    method: "PATCH",
    data,
  });
}

export async function deletePet(id) {
  return apiRequest(`/pets/${id}/`, {
    method: "DELETE",
  });
}

export async function createAdoptionApplication(data) {
  return apiRequest("/applications/create/", {
    method: "POST",
    data,
  });
}

export async function listMyApplications() {
  return apiRequest("/applications/my/");
}

export async function listReceivedApplications() {
  return apiRequest("/applications/received/");
}

export async function approveApplication(id) {
  return apiRequest(`/applications/${id}/approve/`, {
    method: "POST",
  });
}

export async function rejectApplication(id) {
  return apiRequest(`/applications/${id}/reject/`, {
    method: "POST",
  });
}

export async function listWishlist() {
  return apiRequest("/wishlist/");
}

export async function addToWishlist(petId) {
  return apiRequest("/wishlist/", {
    method: "POST",
    data: { pet_id: Number(petId) },
  });
}

export async function removeFromWishlist(id) {
  return apiRequest(`/wishlist/${id}/`, {
    method: "DELETE",
  });
}

export async function listNotifications() {
  return apiRequest("/notifications/");
}

export async function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read/`, {
    method: "PATCH",
    data: {},
  });
}

export async function getUnreadNotificationCount() {
  return apiRequest("/notifications/unread-count/");
}

export default {
  API_BASE_URL,
  ApiError,
  apiRequest,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  registerUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  submitRehomerVerification,
  sendHeartbeat,
  listPets,
  listMyPets,
  getPetDetail,
  createPet,
  updatePet,
  deletePet,
  createAdoptionApplication,
  listMyApplications,
  listReceivedApplications,
  approveApplication,
  rejectApplication,
  listWishlist,
  addToWishlist,
  removeFromWishlist,
  listNotifications,
  markNotificationRead,
  getUnreadNotificationCount,
};

export const safeJsonParse = (value, fallback = null) => {
  if (!value || value === "undefined" || value === "null") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const getStoredUser = () => safeJsonParse(localStorage.getItem("user"), null);

import Cookies from "js-cookie";

/**
 * Set a cookie with environment-based 'secure' attribute
 * @param name - Name of the cookie
 * @param value - Value to be stored
 * @param options - Additional cookie options (expires, sameSite, etc.)
 */
export const setCookie = (name: string, value: string, options?: Cookies.CookieAttributes) => {
  // Determine if running on localhost
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // Set the 'secure' option based on the environment
  const secureOption = options?.secure ?? !isLocalhost;

  // Merge the provided options with the 'secure' option
  const cookieOptions: Cookies.CookieAttributes = {
    ...options,
    secure: secureOption,
  };

  Cookies.set(name, value, cookieOptions);
};

/**
 * Get a cookie
 * @param name - Name of the cookie
 * @returns The value of the cookie or undefined if not found
 */
export const getCookie = (name: string): string | undefined => {
  return Cookies.get(name);
};

/**
 * Remove a cookie
 * @param name - Name of the cookie
 */
export const removeCookie = (name: string) => {
  Cookies.remove(name);
};

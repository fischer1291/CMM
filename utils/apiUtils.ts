import axios, { AxiosRequestConfig } from 'axios';

/**
 * Default timeout for API requests (10 seconds)
 */
export const DEFAULT_TIMEOUT = 10000;

/**
 * Fetch with timeout support
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds (default: 10000ms)
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }
    throw error;
  }
}

/**
 * Axios instance with default timeout
 */
export const axiosWithTimeout = axios.create({
  timeout: DEFAULT_TIMEOUT,
});

/**
 * Helper to make axios requests with custom timeout
 * @param config - Axios request config
 * @param timeout - Timeout in milliseconds (default: 10000ms)
 */
export async function axiosRequest<T = any>(
  config: AxiosRequestConfig,
  timeout: number = DEFAULT_TIMEOUT
): Promise<T> {
  const response = await axios({
    ...config,
    timeout,
  });
  return response.data;
}

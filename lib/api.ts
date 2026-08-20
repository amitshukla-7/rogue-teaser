const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const primaryUrl = API_URL ? `${API_URL}${cleanPath}` : cleanPath;
  
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const doFetch = async (targetUrl: string) => {
    const response = await fetch(targetUrl, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        errorMessage = data.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    try {
      return await response.json();
    } catch (e) {
      return null;
    }
  };

  try {
    return await doFetch(primaryUrl);
  } catch (err: any) {
    // If external backend (e.g. http://localhost:3001) failed or returned 404, fallback to Next.js route handler
    if (primaryUrl !== cleanPath) {
      try {
        return await doFetch(cleanPath);
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    throw err;
  }
}

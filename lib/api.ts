const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = API_URL ? `${API_URL}${cleanPath}` : cleanPath;
  
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
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
  } catch (err: any) {
    console.error(`API fetch error at ${url}:`, err);
    throw err;
  }
}

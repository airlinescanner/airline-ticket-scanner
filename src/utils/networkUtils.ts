/**
 * Утилита для выполнения сетевых запросов с таймаутом
 */
export async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Превышено время ожидания ответа (${timeoutMs / 1000} сек)`);
    }
    throw error;
  }
}

/**
 * Обертка для любого промиса с таймаутом
 */
export async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result as T;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

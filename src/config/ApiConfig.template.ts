// Configuration is now read from EXPO_PUBLIC_* environment variables.
// This template documents supported variables.

export const API_CONFIG = {
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
  MISTRAL_API_KEY: process.env.EXPO_PUBLIC_MISTRAL_API_KEY ?? '',
  TAVILY_API_KEY: process.env.EXPO_PUBLIC_TAVILY_API_KEY ?? '',
  MISTRAL_MODEL: process.env.EXPO_PUBLIC_MISTRAL_MODEL ?? 'mistral-small-latest',
  GROQ_MODELS: (process.env.EXPO_PUBLIC_GROQ_MODELS ?? 'llama-3.3-70b-versatile')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
};

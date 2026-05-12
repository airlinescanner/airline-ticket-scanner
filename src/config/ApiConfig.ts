const parseModels = (raw?: string): string[] => {
  if (!raw) {
    // Используем vision-модель по умолчанию для работы с изображениями
    return ['meta-llama/llama-4-scout-17b-16e-instruct'];
  }

  const models = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return models.length > 0 ? models : ['meta-llama/llama-4-scout-17b-16e-instruct'];
};

export const API_CONFIG = {
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
  MISTRAL_API_KEY: process.env.EXPO_PUBLIC_MISTRAL_API_KEY ?? '',
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  TAVILY_API_KEY: process.env.EXPO_PUBLIC_TAVILY_API_KEY ?? '',
  MISTRAL_MODEL: process.env.EXPO_PUBLIC_MISTRAL_MODEL ?? 'pixtral-12b-2409',
  GROQ_MODELS: parseModels(process.env.EXPO_PUBLIC_GROQ_MODELS),
};

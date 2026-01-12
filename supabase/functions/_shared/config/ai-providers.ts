export type AIProvider = "openai" | "gemini" | "lovable";

export function getAIProvider(): AIProvider {
  const provider = Deno.env.get("AI_PROVIDER") || "lovable";
  return provider.toLowerCase() as AIProvider;
}

export function getAIProviderConfig(provider: AIProvider) {
  switch (provider) {
    case "openai":
      return {
        apiKey: Deno.env.get("OPENAI_API_KEY"),
        model: "gpt-4o",
        endpoint: "https://api.openai.com/v1/chat/completions",
      };
    case "gemini":
      return {
        apiKey: Deno.env.get("GEMINI_API_KEY"),
        model: "gemini-2.5-flash",
        endpoint: "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
      };
    case "lovable":
      return {
        apiKey: Deno.env.get("LOVABLE_API_KEY"),
        model: "google/gemini-2.5-flash",
        endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions",
      };
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

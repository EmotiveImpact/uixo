import { defineAgent } from 'eve';

export default defineAgent({
  model: process.env.UIXO_AGENT_MODEL || 'openai/gpt-5.4-mini',
  limits: {
    sessionTimeoutMs: 600_000,
    maxInputTokensPerSession: 60_000,
    maxOutputTokensPerSession: 8_000,
    maxTokenCostUsdPerSession: 0.25,
  },
});

// Original per-project diagrams, drawn only from facts in content/projects/*.json.
import type { FlowSpec } from './flow';

export const ATHENA_CLIENTS = ['Claude Desktop', 'VS Code|(GitHub Copilot)', 'n8n workflows', 'any MCP client'];
export const ATHENA_INTEGRATIONS = ['Firefly III', 'Homebox', 'Paperless-ngx', 'Immich', 'Blinko', 'TickTick', 'Tavily', 'Uptime Kuma', 'Beszel', 'weather'];

export const athena: FlowSpec = {
  stages: [{ nodes: ATHENA_CLIENTS }, { nodes: ['Athena|MCP gateway'] }, { nodes: ATHENA_INTEGRATIONS, plain: true }],
  gap: 40,
};

export const projectFlows: Record<string, { spec: FlowSpec; alt: string }> = {
  'athena-gateway': {
    spec: athena,
    alt: 'Four kinds of client (Claude Desktop, VS Code with GitHub Copilot, n8n workflows, and any MCP client) connect to one gateway. The gateway reaches ten services: Firefly III, Homebox, Paperless-ngx, Immich, Blinko, TickTick, Tavily, Uptime Kuma, Beszel and weather.',
  },
  'myinvs-agent': {
    spec: { stages: ['Portfolio data', 'Market context', 'News|sentiment', 'Risk|calculation', 'Synthesis'].map((n) => ({ nodes: [n] })), gap: 28 },
    alt: 'An analysis agent with five steps in order: portfolio data, market context, news sentiment, risk calculation, then synthesis.',
  },
  'pfdf-pipeline': {
    spec: { stages: ['Firefly III|records', 'Forecasting', 'LLM layer|explains results', 'Explained|forecast'].map((n) => ({ nodes: [n] })), gap: 36 },
    alt: 'Records from Firefly III feed a forecasting layer. An LLM layer then explains the forecast results. The output is an explained forecast. The LLM explains the numbers; it does not produce them.',
  },
  'prompt-runner-extension': {
    spec: { stages: [{ nodes: ['Prompt'] }, { nodes: ['Agent'] }, { nodes: ['Knowledge base|(retrieval)', 'Long-term|memory', 'Tools'] }], gap: 40 },
    alt: 'A prompt goes to an agent inside the browser extension. The agent uses three separate parts: a retrieval knowledge base, long-term memory, and tools.',
  },
  'claudepilot-broker': {
    spec: { stages: [{ nodes: ['Phone client|(Android)'] }, { nodes: ['Broker'] }, { nodes: ['Claude Code|(Agent SDK)'] }], gap: 44 },
    alt: 'An Android phone client talks only to a broker. The broker drives Claude Code through the Agent SDK. The phone never talks to the agent directly.',
  },
  'imagegen-providers': {
    spec: { stages: [{ nodes: ['Callers'] }, { nodes: ['Shared|interface'] }, { nodes: ['Azure OpenAI', 'Gemini'] }], gap: 44 },
    alt: 'Callers use one shared interface. Two providers sit behind it: Azure OpenAI and Gemini. A model can be swapped without changing the callers.',
  },
  'omnitype-pipeline': {
    spec: { stages: [{ nodes: ['Speech'] }, { nodes: ['Speech-to-text'] }, { nodes: ['Text output', 'LLM voice|actions'] }], gap: 40 },
    alt: 'Speech is converted to text. The text is either output directly or passed to LLM voice actions. The speech-to-text path works on its own; the actions are layered on top.',
  },
};

export const STATUS: Record<string, string> = { active: 'Active', wip: 'In progress', prototype: 'Prototype', dormant: 'Dormant' };

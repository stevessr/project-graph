/**
 * @file defines the provider registry for the AI Engine
 * @author: Metadream
 * @since: 2023-05-01
 */

import { AIProviderInfo } from './types';

/**
 * Common interface for all AI providers, including individual providers and groups.
 */
export interface AIProvider {
  id: string;
  name: string;
  // An optional user-friendly description of the provider.
  description?: string;
}

/**
 * Represents an individual, directly usable AI provider.
 */
export interface LeafProvider extends AIProvider {
  engine: 'aipg';
  baseUrlTemplate: string;
  credentials: Array<{ key: string; label: string; value: string }>;
  requiredHeaders: Record<string, string>;
}

/**
 * Represents a collection of AI providers, which can include other groups.
 */
export interface AIProviderGroup extends AIProvider {
  providers: AnyProvider[];
}

/**
 * A type that can be either a single provider or a group of providers.
 */
export type AnyProvider = LeafProvider | AIProviderGroup;

/**
 * Type guard to check if a provider is an AIProviderGroup.
 *
 * @param provider - The provider to check.
 * @returns True if the provider is an AIProviderGroup, false otherwise.
 */
export function isProviderGroup(provider: AnyProvider): provider is AIProviderGroup {
  return 'providers' in provider;
}


export const aipgProviders: AIProviderGroup = {
    id: 'ai-gateway',
    name: 'AI Gateway',
    description: 'A collection of providers accessible through the AI Gateway.',
    providers: [
        {
            id: 'worker-ai',
            name: 'worker ai',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/workers-ai',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'Cloudflare API Token', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'amazon-bedrock',
            name: 'amazon bedrock',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/amazon-bedrock',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'AWS API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'anthropic-gateway',
            name: 'anthropic',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/anthropic',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'Anthropic API Key', value: '' },
            ],
            requiredHeaders: {
                'x-api-key': '{apiToken}',
                'anthropic-version': '2023-06-01',
            },
        },
        {
            id: 'azure-openai-gateway',
            name: 'azure openai',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/azure-openai',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'Azure API Key', value: '' },
            ],
            requiredHeaders: {
                'api-key': '{apiToken}',
            },
        },
        {
            id: 'deepseek',
            name: 'deepseek',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/deepseek',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'DeepSeek API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'google-ai-studio',
            name: 'google ai stdio',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/google-ai-studio',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'Google AI Studio API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'google-vertex-ai',
            name: 'google vertex ai',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/google-vertex-ai',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'Vertex API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'grok',
            name: 'grok',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/grok',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'Grok API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'groq',
            name: 'groq',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/groq',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'Groq API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'hugging-face',
            name: 'hugging face',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/huggingface',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'Hugging Face API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'openai-gateway',
            name: 'openai',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/openai',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'OpenAI API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
        {
            id: 'openrouter-gateway',
            name: 'openrouter',
            engine: 'aipg',
            baseUrlTemplate: 'https://gateway.ai.cloudflare.com/v1/{accountId}/{gatewayId}/openrouter',
            credentials: [
                { key: 'cloudflareAccountId', label: 'Cloudflare Account ID', value: '' },
                { key: 'aiGatewayId', label: 'AI Gateway ID', value: '' },
                { key: 'apiToken', label: 'OpenRouter API Key', value: '' },
            ],
            requiredHeaders: {
                Authorization: 'Bearer {apiToken}',
            },
        },
    ]
};
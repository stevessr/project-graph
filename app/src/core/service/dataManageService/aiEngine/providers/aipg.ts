/**
 * @file Implements the AI Platform Gateway (AIPG) engine.
 * @author: Metadream
 * @since: 2023-05-01
 */

import { AIEngine, AIEngineConfig, AIProviderInfo } from '../types';

export class AIPlatformGatewayEngine implements AIEngine {
  private providerInfo: AIProviderInfo;
  private config: AIEngineConfig;

  constructor(providerInfo: AIProviderInfo, config: AIEngineConfig) {
    this.providerInfo = providerInfo;
    this.config = config;
  }

  public async run(messages: any[], options: Record<string, any> = {}): Promise<any> {
    const baseUrl = this.buildUrl();
    const headers = this.buildHeaders();
    
    // Construct the final URL, assuming the endpoint is passed in options or part of the config
    const endpoint = options.endpoint || this.config.endpoint || '';
    const finalUrl = `${baseUrl}${endpoint}`;

    const body = {
      model: this.config.model,
      messages,
      ...options,
    };

    try {
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in AIPlatformGatewayEngine:', error);
      throw error;
    }
  }

  private buildUrl(): string {
    let url = this.providerInfo.baseUrlTemplate;
    const credentialValues = this.providerInfo.credentials.reduce((acc, cred) => {
      acc[cred.key] = this.config[cred.key] || cred.value;
      return acc;
    }, {} as Record<string, string>);

    const replacements: { [key: string]: any } = {
      ...credentialValues,
      ...this.config,
    };

    for (const key in replacements) {
      const placeholder = `{${key}}`;
      if (url.includes(placeholder)) {
        url = url.replace(new RegExp(placeholder, 'g'), replacements[key]);
      }
    }
    return url;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const { requiredHeaders, credentials } = this.providerInfo;
    const apiTokenCredential = credentials.find(c => c.key === 'apiToken');
    const apiToken = this.config.apiToken || (apiTokenCredential ? apiTokenCredential.value : '');

    for (const header in requiredHeaders) {
      headers[header] = requiredHeaders[header].replace('{apiToken}', apiToken);
    }

    return headers;
  }
}
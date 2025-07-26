/**
 * @file defines the types for the AI Engine
 * @author: Metadream
 * @since: 2023-05-01
 */

export interface AIProviderInfo {
    id: string;
    name: string;
    engine: 'aipg'; // AI Platform Gateway
    baseUrlTemplate: string;
    credentials: Array<{
      key: string;
      label: string;
      value: string;
    }>;
    requiredHeaders: Record<string, string>;
  }
  
  export interface AIEngineConfig {
    mainProviderId: string;
    subProviderId?: string | null;
    model: string;
    [key: string]: any;
  }
  
  export interface AIEngine {
    run(messages: any[], options: Record<string, any>): Promise<any>;
  }

// New Unified Configuration Types for a unified settings page
export interface AIProviderCredentials {
    [key: string]: string | undefined;
}

export interface AIProviderConfig {
    id: string;
    name: string;
    enabled: boolean;
    model?: string;
    credentials: AIProviderCredentials;
}

export interface AIAllProvidersSettings {
    defaultProviderId: string;
    providers: Record<string, AIProviderConfig>;
}
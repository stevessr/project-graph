/**
 * @file AI Engine service facade. Manages different AI provider engines.
 * @author: Metadream
 * @since: 2023-05-01
 */

import { Project, service } from '../../../Project';
import { Settings } from '../../Settings';
import { IAIEngine, ChatMessage, ChatOptions, AIModel } from './IAIEngine';
import { AIEngineConfig, AIAllProvidersSettings, AIProviderConfig } from './types';
import { aipgProviders, LeafProvider, isProviderGroup, AnyProvider } from './providerRegistry';
import { AIPlatformGatewayEngine } from './providers/aipg';

@service('aiEngine')
export class AIEngine implements IAIEngine {
    private static instances: Map<string, IAIEngine> = new Map();
    private static currentProviderId: string | null = null;

    constructor(private readonly project: Project) {
        // Watch for changes in the unified AI provider settings
        Settings.watch('aiProvidersSettings' as any, () => AIEngine.resetInstances());
    }
    
    public async updateConfig(config: Partial<AIAllProvidersSettings>): Promise<void> {
        const currentSettings = await Settings.get('aiProvidersSettings' as any) as AIAllProvidersSettings || {};
        const newSettings = { ...currentSettings, ...config };
        await Settings.set('aiProvidersSettings' as any, newSettings);
        AIEngine.resetInstances();
    }
    
    static async resetInstances(): Promise<void> {
        this.instances.clear();
        this.currentProviderId = null;
    }

    static async getInstance(providerId?: string): Promise<IAIEngine> {
        const settings: AIAllProvidersSettings = (await Settings.get('aiProvidersSettings' as any));
        if (!settings || !settings.providers) {
            throw new Error("AI provider settings are not configured.");
        }
    
        const activeProviderId = providerId || settings.defaultProviderId;
        if (!activeProviderId) {
            throw new Error("No AI provider specified or default provider set.");
        }
    
        const providerConfig = settings.providers[activeProviderId];

        if (!providerConfig || !providerConfig.enabled) {
            throw new Error(`Default provider "${activeProviderId}" is not configured or not enabled.`);
        }

        if (this.instances.has(activeProviderId)) {
            return this.instances.get(activeProviderId)!;
        }

        this.currentProviderId = activeProviderId;

        // The provider lookup logic might need adjustment based on how `aipgProviders` is structured
        // Assuming the ID in our config matches an ID in the providerRegistry.
        const providerDefinition = this.findLeafProvider(aipgProviders.providers, activeProviderId);
        
        if (!providerDefinition) {
            throw new Error(`Provider definition for "${activeProviderId}" not found in registry.`);
        }

        const config = this.buildConfigFromProviderSettings(providerConfig);
        const aipgEngine = new AIPlatformGatewayEngine(providerDefinition, config);

        const instance: IAIEngine = {
            async *chat(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string> {
                const response = await aipgEngine.run(messages, options);
                yield JSON.stringify(response); // Still non-streaming, as per original
            },
            async getModels(): Promise<AIModel[]> {
                return []; // Placeholder
            },
            async generateTTS(text: string, voiceName: string): Promise<ArrayBuffer> {
                throw new Error("TTS is not supported by the current provider.");
            },
            updateConfig: (cfg: Partial<AIEngineConfig>) => AIEngine.resetInstances(),
        };

        this.instances.set(activeProviderId, instance);
        return instance;
    }

    private static findLeafProvider(providers: AnyProvider[], id: string): LeafProvider | undefined {
        for (const provider of providers) {
            if (provider.id === id) {
                if (!isProviderGroup(provider)) {
                    return provider as LeafProvider;
                }
            }
            if (isProviderGroup(provider)) {
                const found = this.findLeafProvider(provider.providers, id);
                if (found) return found;
            }
        }
        return undefined;
    }
    
    private static buildConfigFromProviderSettings(providerConfig: AIProviderConfig): AIEngineConfig {
        // This function translates the new unified config structure to the format AIEngine expects.
        // It simplifies the previous buildConfig logic significantly.
        return {
            mainProviderId: providerConfig.id,
            model: providerConfig.model || '',
            apiToken: providerConfig.credentials.apiKey || '', // Assuming 'apiKey' is the key in credentials
            ...providerConfig.credentials, // Pass all other credentials
        };
    }

    async *chat(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string> {
        const instance = await AIEngine.getInstance(options.provider);
        for await (const chunk of instance.chat(messages, options)) {
            yield chunk;
        }
    }

    async getModels(providerId?: string): Promise<AIModel[]> {
        const instance = await AIEngine.getInstance(providerId);
        return instance.getModels();
    }

    async generateTTS(text: string, voiceName: string, providerId?: string): Promise<ArrayBuffer> {
        const instance = await AIEngine.getInstance(providerId);
        if (instance.generateTTS) {
          return instance.generateTTS(text, voiceName);
        }
        throw new Error("TTS is not supported by the current provider.");
    }
}

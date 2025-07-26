import React, { useState, useEffect, useCallback } from 'react';
import { Settings } from '../../../service/Settings';
import { AIAllProvidersSettings, AIProviderConfig } from '../../../service/dataManageService/aiEngine/types';
import Input from '../../../../components/Input'; // Assuming path to your custom Input

export const AISettingsPanel: React.FC = () => {
    const [settings, setSettings] = useState<AIAllProvidersSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            const loadedSettings = await Settings.get('aiProvidersSettings' as any);
            setSettings(loadedSettings || { defaultProviderId: '', providers: {} });
            setLoading(false);
        };
        loadSettings();
    }, []);
    
    const handleSettingsChange = useCallback((id: string, field: keyof AIProviderConfig, value: any) => {
        setSettings(prev => {
            if (!prev) return null;
            const newSettings = { ...prev };
            const provider = newSettings.providers[id];
            if (provider) {
                (provider as any)[field] = value;
            }
            return newSettings;
        });
    }, []);

    const handleCredentialChange = useCallback((id: string, credKey: string, value: string) => {
        setSettings(prev => {
            if (!prev) return null;
            const newSettings = { ...prev };
            const provider = newSettings.providers[id];
            if (provider) {
                provider.credentials[credKey] = value;
            }
            return newSettings;
        });
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        try {
            await Settings.set('aiProvidersSettings' as any, settings);
            alert('Settings saved successfully!');
        } catch (error) {
            alert('Failed to save settings.');
            console.error(error);
        }
    };

    if (loading) {
        return <div>Loading settings...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <label>Default AI Provider: </label>
                <select
                    value={settings?.defaultProviderId || ''}
                    onChange={(e) => setSettings(s => s ? { ...s, defaultProviderId: e.target.value } : null)}
                >
                    {Object.keys(settings?.providers || {}).map(id => (
                        <option key={id} value={id}>{settings?.providers[id].name}</option>
                    ))}
                </select>
            </div>

            {Object.values(settings?.providers || {}).map((provider: AIProviderConfig) => (
                <details key={provider.id} open style={{ marginBottom: '10px', border: '1px solid #ccc', padding: '10px' }}>
                    <summary>{provider.name}</summary>
                    <div>
                        <label>Enabled: </label>
                        <input
                            type="checkbox"
                            checked={provider.enabled}
                            onChange={(e) => handleSettingsChange(provider.id, 'enabled', e.target.checked)}
                        />
                    </div>
                    <div>
                        <label>Model: </label>
                        <Input
                            value={provider.model || ''}
                            onChange={(value) => handleSettingsChange(provider.id, 'model', value)}
                        />
                    </div>
                    {Object.keys(provider.credentials).map(credKey => (
                         <div key={credKey}>
                            <label>{credKey}: </label>
                            <Input
                                type="password"
                                value={provider.credentials[credKey] || ''}
                                onChange={(value) => handleCredentialChange(provider.id, credKey, value)}
                            />
                        </div>
                    ))}
                </details>
            ))}

            <button onClick={handleSave} style={{ marginTop: '16px' }}>
                Save
            </button>
        </div>
    );
};
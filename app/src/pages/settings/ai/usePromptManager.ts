// src/pages/settings/ai/usePromptManager.ts
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  AiSettings,
  PromptContentNode, // Changed PromptNode to PromptContentNode
} from "../../../types/aiSettings";
import { Dialog } from "../../../components/dialog";
import { parseLineFormat, formatNodesToLineString } from "./promptUtils";
import { useAiSettingsStore } from "../../../state/aiSettingsStore";

export function usePromptManager(currentSettings: AiSettings) {
  const { t } = useTranslation("settings");
  const [custom_promptsString, setcustom_promptsString] = useState<string>("");
  const [selectedPromptName, setSelectedPromptName] = useState<string | null>(null);
  const [selectedVersionTimestamp, setSelectedVersionTimestamp] = useState<number | null>(null);
  const [newPromptName, setNewPromptName] = useState<string>("");
  const [currentsummary_prompt, setCurrentsummary_prompt] = useState<string | null>(null);

  useEffect(() => {
    // Initialize prompt states based on currentSettings
    let initialcustom_promptsString = "";
    let initialSelectedPromptName: string | null = null;
    let initialSelectedVersionTimestamp: number | null = null;

    if (currentSettings.prompt_collections && Object.keys(currentSettings.prompt_collections).length > 0) {
      let targetPromptName = selectedPromptName;
      if (!targetPromptName || !currentSettings.prompt_collections[targetPromptName]) {
        targetPromptName = Object.keys(currentSettings.prompt_collections)[0];
      }
      initialSelectedPromptName = targetPromptName;
      const collection = currentSettings.prompt_collections[targetPromptName];

      if (collection && collection.versions.length > 0) {
        let targetVersion = collection.versions.find((v) => v.timestamp === selectedVersionTimestamp);
        if (!targetVersion) {
          targetVersion = collection.versions[0];
        }
        initialcustom_promptsString = formatNodesToLineString([targetVersion.content]);
        initialSelectedVersionTimestamp = targetVersion.timestamp;
      } else {
        initialSelectedVersionTimestamp = null;
      }
    }

    if (initialcustom_promptsString === "" && currentSettings.custom_prompts) {
      initialcustom_promptsString = currentSettings.custom_prompts;
      initialSelectedPromptName = null;
      initialSelectedVersionTimestamp = null;
    }

    setcustom_promptsString(initialcustom_promptsString);
    setSelectedPromptName(initialSelectedPromptName);
    setSelectedVersionTimestamp(initialSelectedVersionTimestamp);
    setCurrentsummary_prompt(currentSettings.summary_prompt);
  }, [currentSettings, selectedPromptName, selectedVersionTimestamp]);

  const handlesummary_promptChange = (value: string) => {
    setCurrentsummary_prompt(value === "" ? null : value);
  };

  const handlePromptSelect = (promptNameKey: string) => {
    setSelectedPromptName(promptNameKey);
    const collection = currentSettings.prompt_collections?.[promptNameKey];
    if (collection && collection.versions.length > 0) {
      const latestVersion = collection.versions[0];
      setcustom_promptsString(formatNodesToLineString([latestVersion.content]));
      setSelectedVersionTimestamp(latestVersion.timestamp);
    } else {
      setcustom_promptsString("");
      setSelectedVersionTimestamp(null);
    }
  };

  const handleVersionSelect = (timestamp: number) => {
    setSelectedVersionTimestamp(timestamp);
    if (selectedPromptName && currentSettings.prompt_collections?.[selectedPromptName]) {
      const selectedVersion = currentSettings.prompt_collections[selectedPromptName].versions.find(
        (v) => v.timestamp === timestamp,
      );
      if (selectedVersion) {
        setcustom_promptsString(formatNodesToLineString([selectedVersion.content]));
      }
    }
  };

  const handleSavePromptVersion = async () => {
    if (!selectedPromptName || !custom_promptsString.trim()) {
      await Dialog.show({ title: t("ai.selectPromptAndContentError") });
      return;
    }
    try {
      const parsedPrompts = parseLineFormat(custom_promptsString);
      if (parsedPrompts && parsedPrompts.length > 0) {
        const state = useAiSettingsStore.getState();
        const currentAiSettings = state.aiSettings;

        if (!currentAiSettings) {
          await Dialog.show({ title: t("ai.error.load.settingsNotLoadedError") });
          return;
        }

        const newVersion = {
          timestamp: Date.now(),
          content: parsedPrompts[0],
        };

        const updatedPromptCollections = { ...currentAiSettings.prompt_collections };

        if (updatedPromptCollections[selectedPromptName]) {
          // Add new version to existing collection (at the beginning)
          updatedPromptCollections[selectedPromptName].versions.unshift(newVersion);
        } else {
          // Create new collection
          updatedPromptCollections[selectedPromptName] = {
            name: selectedPromptName,
            versions: [newVersion],
          };
        }

        const newSettings = {
          ...currentAiSettings,
          prompt_collections: updatedPromptCollections,
        };

        await useAiSettingsStore.getState().saveAiSettings(newSettings);
        await Dialog.show({ title: t("ai.ok.saveSuccess") });

        // Update local state to show the new version
        setSelectedVersionTimestamp(newVersion.timestamp);
      } else {
        await Dialog.show({ title: t("ai.selectPromptToSaveVersion") });
      }
    } catch (err) {
      console.error(t("ai.saveVersionFailureConsole"), err);
      await Dialog.show({ title: t("ai.saveVersionFailure", { error: String(err) }) });
    }
  };

  const handleUpdateCurrentPromptVersion = async () => {
    if (!selectedPromptName || selectedVersionTimestamp === null) {
      await Dialog.show({ title: t("ai.selectPromptAndVersionToUpdate") });
      return;
    }
    try {
      const parsedContent = parseLineFormat(custom_promptsString);
      if (!parsedContent || parsedContent.length === 0) {
        await Dialog.show({ title: t("ai.contentCannotBeEmpty") });
        return;
      }

      const state = useAiSettingsStore.getState();
      const currentAiSettings = state.aiSettings;

      if (!currentAiSettings) {
        await Dialog.show({ title: t("ai.error.load.settingsNotLoadedError") });
        return;
      }

      const updatedPromptCollections = { ...currentAiSettings.prompt_collections };
      const collection = updatedPromptCollections[selectedPromptName];

      if (collection) {
        const versionIndex = collection.versions.findIndex((v) => v.timestamp === selectedVersionTimestamp);
        if (versionIndex !== -1) {
          // Update the content of the specific version
          collection.versions[versionIndex] = {
            ...collection.versions[versionIndex],
            content: parsedContent[0],
          };

          const newSettings = {
            ...currentAiSettings,
            prompt_collections: updatedPromptCollections,
          };

          await useAiSettingsStore.getState().saveAiSettings(newSettings);
          await Dialog.show({ title: t("ai.ok.updateVersionSuccess") });
          // No need to refreshSettingsCallback, store update should trigger effect
        } else {
          await Dialog.show({ title: t("ai.error.NotFound.version") });
        }
      } else {
        await Dialog.show({ title: t("ai.error.NotFound.prompt") });
      }
    } catch (err) {
      console.error(t("ai.updateVersionFailedConsole"), err);
      await Dialog.show({ title: t("ai.error.updateVersionFailed", { error: String(err) }) });
    }
  };

  const handleCreateNewPrompt = async () => {
    const trimmedPromptName = newPromptName.trim();
    if (!trimmedPromptName) {
      await Dialog.show({ title: t("ai.error.CannotBeEmpty") });
      return;
    }

    const state = useAiSettingsStore.getState();
    const currentAiSettings = state.aiSettings;

    if (!currentAiSettings) {
      await Dialog.show({ title: t("ai.error.load.settingsNotLoadedError") });
      return;
    }

    if (currentAiSettings.prompt_collections && currentAiSettings.prompt_collections[trimmedPromptName]) {
      await Dialog.show({ title: t("ai.promptAlreadyExists", { name: trimmedPromptName }) });
      return;
    }

    try {
      const newVersion = {
        timestamp: Date.now(),
        content: { text: t("ai.prompts.newPrompt.InitialContent") } as PromptContentNode,
      };

      const updatedPromptCollections = {
        ...currentAiSettings.prompt_collections,
        [trimmedPromptName]: {
          name: trimmedPromptName,
          versions: [newVersion],
        },
      };

      const newSettings = {
        ...currentAiSettings,
        prompt_collections: updatedPromptCollections,
      };

      await useAiSettingsStore.getState().saveAiSettings(newSettings);
      await Dialog.show({ title: t("ai.operation.created", { name: trimmedPromptName }) });

      setNewPromptName("");
      // Update local state to select the newly created prompt
      setSelectedPromptName(trimmedPromptName);
      setSelectedVersionTimestamp(newVersion.timestamp);
      setcustom_promptsString(formatNodesToLineString([newVersion.content]));
    } catch (err) {
      console.error(t("ai.createPromptFailedConsole"), err);
      await Dialog.show({ title: t("ai.prompts.newPrompt.failed", { error: String(err) }) });
    }
  };

  const handleDeleteSelectedVersion = async () => {
    if (!selectedPromptName || selectedVersionTimestamp === null) {
      await Dialog.show({ title: t("ai.selectVersionToDeleteError") });
      return;
    }
    try {
      const confirmed = await Dialog.show({
        title: t("ai.message.confirmDeleteVersion"),
        buttons: [{ text: t("ai.operation.cancel") }, { text: t("ai.operation.confirm"), color: "red" }],
      });
      if (confirmed.button === t("ai.operation.confirm")) {
        const state = useAiSettingsStore.getState();
        const currentAiSettings = state.aiSettings;

        if (!currentAiSettings) {
          await Dialog.show({ title: t("ai.error.load.settingsNotLoadedError") });
          return;
        }

        const updatedPromptCollections = { ...currentAiSettings.prompt_collections };
        const collection = updatedPromptCollections[selectedPromptName];

        if (collection) {
          const initialVersionCount = collection.versions.length;
          // Filter out the version to delete
          collection.versions = collection.versions.filter((v) => v.timestamp !== selectedVersionTimestamp);

          if (collection.versions.length === initialVersionCount) {
            // Version not found
            await Dialog.show({ title: t("ai.error.NotFound.version") });
            return;
          }

          if (collection.versions.length === 0) {
            // If no versions left, delete the collection
            delete updatedPromptCollections[selectedPromptName];
          }

          const newSettings = {
            ...currentAiSettings,
            prompt_collections: updatedPromptCollections,
            // If the deleted version was the active one, clear active_config_id (assuming prompt version deletion doesn't affect active API config, but good practice to check related IDs if they existed)
            // active_config_id: currentAiSettings.active_config_id === selectedVersionTimestamp ? null : currentAiSettings.active_config_id, // This check is likely incorrect, active_config_id is for API configs
          };

          await useAiSettingsStore.getState().saveAiSettings(newSettings);
          await Dialog.show({ title: t("ai.ok.versionDeletedSuccessfully") });

          // Update local state based on the new settings structure
          if (
            updatedPromptCollections[selectedPromptName] &&
            updatedPromptCollections[selectedPromptName].versions.length > 0
          ) {
            // If collection still exists and has versions, select the latest
            const latestVersion = updatedPromptCollections[selectedPromptName].versions[0];
            setSelectedVersionTimestamp(latestVersion.timestamp);
            setcustom_promptsString(formatNodesToLineString([latestVersion.content]));
          } else {
            // If collection was deleted or has no versions, clear selection
            setSelectedPromptName(null);
            setSelectedVersionTimestamp(null);
            setcustom_promptsString("");
          }
        } else {
          await Dialog.show({ title: t("ai.error.NotFound.prompt") });
        }
      }
    } catch (err) {
      console.error(t("ai.deleteVersionFailedConsole"), err);
      await Dialog.show({ title: t("ai.error.DeleteFailedMessage  ", { error: String(err) }) });
    }
  };

  return {
    custom_promptsString,
    setcustom_promptsString,
    selectedPromptName,
    setSelectedPromptName,
    selectedVersionTimestamp,
    setSelectedVersionTimestamp,
    newPromptName,
    setNewPromptName,
    currentsummary_prompt,
    handlesummary_promptChange,
    handlePromptSelect,
    handleVersionSelect,
    handleSavePromptVersion,
    handleUpdateCurrentPromptVersion,
    handleCreateNewPrompt,
    handleDeleteSelectedVersion,
  };
}

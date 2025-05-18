// src/pages/settings/ai/usePromptManager.ts
import { useState, useEffect } from "react";
import {
  AiSettings,
  PromptContentNode, // Changed PromptNode to PromptContentNode
} from "../../../types/aiSettings";
import { invoke } from "../../../utils/tauriApi";
import { Dialog } from "../../../components/dialog";
import { parseLineFormat, formatNodesToLineString } from "./promptUtils";
import { TFunction } from "i18next";

export function usePromptManager(
  currentSettings: AiSettings,
  refreshSettingsCallback: () => Promise<AiSettings | void>,
  t: TFunction<"settings", undefined>,
) {
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
        await invoke("save_prompt_version", { promptName: selectedPromptName, content: parsedPrompts[0] });
        await Dialog.show({ title: t("ai.saveSuccess") });
        const updatedSettings = await refreshSettingsCallback();
        if (updatedSettings && updatedSettings.prompt_collections?.[selectedPromptName]?.versions.length > 0) {
          const latestVersion = updatedSettings.prompt_collections[selectedPromptName].versions[0];
          setSelectedVersionTimestamp(latestVersion.timestamp);
        }
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
      await invoke("update_prompt_version", {
        promptName: selectedPromptName,
        timestamp: selectedVersionTimestamp,
        content: parsedContent[0],
      });
      await Dialog.show({ title: t("ai.updateVersionSuccess") });
      await refreshSettingsCallback();
    } catch (err) {
      console.error(t("ai.updateVersionFailedConsole"), err);
      await Dialog.show({ title: t("ai.updateVersionFailed", { error: String(err) }) });
    }
  };

  const handleCreateNewPrompt = async () => {
    if (!newPromptName.trim()) {
      await Dialog.show({ title: t("ai.promptNameCannotBeEmpty") });
      return;
    }
    if (currentSettings.prompt_collections && currentSettings.prompt_collections[newPromptName.trim()]) {
      await Dialog.show({ title: t("ai.promptAlreadyExists", { name: newPromptName.trim() }) });
      return;
    }
    try {
      await invoke("save_prompt_version", {
        promptName: newPromptName.trim(),
        content: { text: t("ai.newPromptInitialContent") || "New prompt initial content..." } as PromptContentNode, // Changed here
      });
      await Dialog.show({ title: t("ai.promptCreatedSuccessfully", { name: newPromptName.trim() }) });
      const newSettings = await refreshSettingsCallback();
      const createdPromptName = newPromptName.trim();
      setNewPromptName("");

      if (newSettings && newSettings.prompt_collections?.[createdPromptName]?.versions.length > 0) {
        setSelectedPromptName(createdPromptName);
        const newVersion = newSettings.prompt_collections[createdPromptName].versions[0];
        setcustom_promptsString(formatNodesToLineString([newVersion.content]));
        setSelectedVersionTimestamp(newVersion.timestamp);
      } else {
        setSelectedPromptName(createdPromptName);
        setcustom_promptsString("");
        setSelectedVersionTimestamp(null);
      }
    } catch (err) {
      console.error(t("ai.createPromptFailedConsole"), err);
      await Dialog.show({ title: t("ai.createPromptFailed", { error: String(err) }) });
    }
  };

  const handleDeleteSelectedVersion = async () => {
    if (!selectedPromptName || selectedVersionTimestamp === null) {
      await Dialog.show({ title: t("ai.selectVersionToDeleteError") });
      return;
    }
    try {
      const confirmed = await Dialog.show({
        title: t("ai.confirmDeleteVersion"),
        buttons: [{ text: t("ai.cancelButton") || "取消" }, { text: t("ai.confirmButton") || "确定", color: "red" }],
      });
      if (confirmed.button === (t("ai.confirmButton") || "确定")) {
        await invoke("delete_prompt_version", {
          promptName: selectedPromptName,
          timestamp: selectedVersionTimestamp,
        });
        await Dialog.show({ title: t("ai.versionDeletedSuccessfully") });
        const oldSelectedPromptName = selectedPromptName;
        const reloadedSettings = (await refreshSettingsCallback()) as AiSettings; // Cast to ensure we have settings

        // Check if the prompt collection itself still exists after refresh
        if (
          reloadedSettings &&
          reloadedSettings.prompt_collections &&
          reloadedSettings.prompt_collections[oldSelectedPromptName]
        ) {
          const collection = reloadedSettings.prompt_collections[oldSelectedPromptName];
          if (collection.versions.length > 0) {
            const latestVersion = collection.versions[0];
            setSelectedPromptName(oldSelectedPromptName); // Ensure prompt name selection is maintained
            setSelectedVersionTimestamp(latestVersion.timestamp);
            setcustom_promptsString(formatNodesToLineString([latestVersion.content]));
          } else {
            // Collection exists but no versions, keep prompt selected, clear version/content
            setSelectedPromptName(oldSelectedPromptName);
            setSelectedVersionTimestamp(null);
            setcustom_promptsString("");
          }
        } else {
          // Prompt collection was deleted (last version deleted), clear selection
          setSelectedPromptName(null);
          setSelectedVersionTimestamp(null);
          setcustom_promptsString("");
        }
      }
    } catch (err) {
      console.error(t("ai.deleteVersionFailedConsole"), err);
      await Dialog.show({ title: t("ai.deleteVersionFailed", { error: String(err) }) });
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

// ABOUTME: The settings a plugin declares, as a form that keeps what is entered through the plugin manager. A switch, a list and
// ABOUTME: a colour save when changed; text and numbers save when the field is left. A kind it cannot edit is said so, not drawn.

import React, { useState } from 'react';

import { usePlugins } from '@/plugins/usePlugins';
import type { LoadedPlugin, PluginSetting } from '@/plugins/types';

const FIELD_CLASS =
  'w-full px-3 py-2 border border-surface-border rounded-lg bg-surface-card text-surface-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent';

const messageOf = (failure: unknown): string => (failure instanceof Error ? failure.message : String(failure));

/** The value a setting has until something is saved: the default the plugin declares. */
const defaultsOf = (schema: readonly PluginSetting[]): Record<string, unknown> =>
  Object.fromEntries(schema.filter((setting) => setting.defaultValue !== undefined).map((setting) => [setting.key, setting.defaultValue]));

export interface PluginSettingsFormProps {
  readonly plugin: LoadedPlugin;
  /** Show the settings without letting them be changed. */
  readonly readOnly?: boolean;
}

export const PluginSettingsForm: React.FC<PluginSettingsFormProps> = ({ plugin, readOnly = false }) => {
  const { getPluginSettings, setPluginSetting } = usePlugins();
  const id = plugin.manifest.id;
  const schema = plugin.manifest.settings ?? [];

  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...defaultsOf(schema), ...getPluginSettings(id) }));
  // Text being typed into a text or number field: it is saved when the field is left, not on every key.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const save = async (setting: PluginSetting, value: unknown) => {
    setValues((current) => ({ ...current, [setting.key]: value }));
    setFailure(null);
    try {
      await setPluginSetting(id, setting.key, value);
    } catch (error) {
      setFailure(`${setting.label} could not be saved: ${messageOf(error)}`);
    }
  };

  const draftOf = (setting: PluginSetting): string => drafts[setting.key] ?? String(values[setting.key] ?? '');
  const typeInto = (setting: PluginSetting, text: string) => setDrafts((current) => ({ ...current, [setting.key]: text }));
  const leave = (setting: PluginSetting): string | undefined => {
    const typed = drafts[setting.key];
    setDrafts((current) => {
      const next = { ...current };
      delete next[setting.key];
      return next;
    });
    return typed;
  };

  const leaveNumber = (setting: PluginSetting) => {
    const typed = leave(setting);
    if (typed === undefined || typed.trim() === '') return;
    const number = Number(typed);
    const { min, max } = setting.validation ?? {};
    if (!Number.isFinite(number) || (min !== undefined && number < min) || (max !== undefined && number > max)) return;
    void save(setting, number);
  };

  const leaveText = (setting: PluginSetting) => {
    const typed = leave(setting);
    if (typed === undefined || typed === String(values[setting.key] ?? '')) return;
    void save(setting, typed);
  };

  if (schema.length === 0) {
    return <p className="text-sm text-surface-muted-fg">This plugin has no settings.</p>;
  }

  const fieldFor = (setting: PluginSetting, fieldId: string): React.ReactNode => {
    switch (setting.type) {
      case 'boolean':
        return (
          <input
            id={fieldId}
            disabled={readOnly}
            type="checkbox"
            className="h-4 w-4 rounded border-surface-border text-primary-600 focus:ring-primary-500"
            checked={Boolean(values[setting.key])}
            onChange={(event) => void save(setting, event.target.checked)}
          />
        );
      case 'number':
        return (
          <input
            id={fieldId}
            disabled={readOnly}
            type="number"
            className={FIELD_CLASS}
            min={setting.validation?.min}
            max={setting.validation?.max}
            value={draftOf(setting)}
            onChange={(event) => typeInto(setting, event.target.value)}
            onBlur={() => leaveNumber(setting)}
          />
        );
      case 'string':
        return (
          <input
            id={fieldId}
            disabled={readOnly}
            type="text"
            className={FIELD_CLASS}
            value={draftOf(setting)}
            onChange={(event) => typeInto(setting, event.target.value)}
            onBlur={() => leaveText(setting)}
          />
        );
      case 'select':
        return (
          <select
            id={fieldId}
            disabled={readOnly}
            className={FIELD_CLASS}
            value={String(values[setting.key] ?? '')}
            onChange={(event) => {
              const chosen = setting.options?.find((option) => String(option.value) === event.target.value);
              void save(setting, chosen ? chosen.value : event.target.value);
            }}
          >
            {(setting.options ?? []).map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'color':
        return (
          <input
            id={fieldId}
            disabled={readOnly}
            type="color"
            className="h-10 w-16 rounded border border-surface-border"
            value={String(values[setting.key] ?? '#000000')}
            onChange={(event) => void save(setting, event.target.value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {failure && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {failure}
        </p>
      )}

      {schema.map((setting) => {
        const fieldId = `plugin-setting-${id}-${setting.key}`;
        const field = fieldFor(setting, fieldId);
        return (
          <div key={setting.key} className="rounded-lg bg-surface-muted p-4">
            {field === null ? (
              <>
                <span className="block text-sm font-medium text-surface-foreground">{setting.label}</span>
                <p className="mt-1 text-xs text-surface-muted-fg">Not editable here yet.</p>
              </>
            ) : (
              <>
                <label htmlFor={fieldId} className="mb-2 block text-sm font-medium text-surface-foreground">
                  {setting.label}
                </label>
                {field}
              </>
            )}
            {setting.description && <p className="mt-2 text-xs text-surface-muted-fg">{setting.description}</p>}
          </div>
        );
      })}
    </div>
  );
};

export default PluginSettingsForm;

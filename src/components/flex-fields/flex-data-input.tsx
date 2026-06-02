import { useState } from 'react';
import { FormField } from '../ui/form-field';
import { FlexFieldType } from '../../types/enums';
import type { FlexFieldDefinition, FlexData } from '../../types/domain.types';

// Convert FlexData to a flat Record<field_key, string> for easy form management
function toRaw(defs: readonly FlexFieldDefinition[], data: FlexData | null): Record<string, string> {
  const raw: Record<string, string> = {};
  if (!data) return raw;
  for (const def of defs) {
    switch (def.field_type) {
      case FlexFieldType.String:  { const v = data.string_fields?.[def.field_key];  if (v !== undefined) raw[def.field_key] = v; break; }
      case FlexFieldType.Date:    { const v = data.date_fields?.[def.field_key];    if (v !== undefined) raw[def.field_key] = v; break; }
      case FlexFieldType.Numeric: { const v = data.numeric_fields?.[def.field_key]; if (v !== undefined) raw[def.field_key] = String(v); break; }
      case FlexFieldType.Enum:    { const v = data.enum_fields?.[def.field_key];    if (v !== undefined) raw[def.field_key] = v[0] ?? ''; break; }
    }
  }
  return raw;
}

// Build FlexData from flat raw values
function toFlexData(defs: readonly FlexFieldDefinition[], raw: Record<string, string>): FlexData {
  const s: Record<string, string> = {};
  const d: Record<string, string> = {};
  const n: Record<string, number> = {};
  const e: Record<string, string[]> = {};

  for (const def of defs) {
    const v = raw[def.field_key] ?? '';
    if (v === '') continue;
    switch (def.field_type) {
      case FlexFieldType.String:  s[def.field_key] = v; break;
      case FlexFieldType.Date:    d[def.field_key] = v; break;
      case FlexFieldType.Numeric: { const num = parseFloat(v); if (!isNaN(num)) n[def.field_key] = num; break; }
      case FlexFieldType.Enum:    e[def.field_key] = [v]; break;
    }
  }

  return {
    ...(Object.keys(s).length ? { string_fields:  s } : {}),
    ...(Object.keys(d).length ? { date_fields:    d } : {}),
    ...(Object.keys(n).length ? { numeric_fields: n } : {}),
    ...(Object.keys(e).length ? { enum_fields:    e } : {}),
  };
}

interface FlexDataInputProps {
  definitions: readonly FlexFieldDefinition[];
  initialData: FlexData | null;
  onChange: (data: FlexData) => void;
}

export function FlexDataInput({ definitions, initialData, onChange }: FlexDataInputProps) {
  const [raw, setRaw] = useState<Record<string, string>>(() => toRaw(definitions, initialData));

  if (definitions.length === 0) return null;

  function handleChange(fieldKey: string, value: string) {
    const next = { ...raw, [fieldKey]: value };
    setRaw(next);
    onChange(toFlexData(definitions, next));
  }

  const sorted = [...definitions].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="flex-fields-section">
      <div className="flex-fields-divider">שדות נוספים</div>
      <div className="form-row" style={{ flexWrap: 'wrap' }}>
        {sorted.map(def => (
          <FlexFieldInput
            key={def.field_key}
            definition={def}
            value={raw[def.field_key] ?? ''}
            onChange={v => handleChange(def.field_key, v)}
          />
        ))}
      </div>
    </div>
  );
}

interface FlexFieldInputProps {
  definition: FlexFieldDefinition;
  value: string;
  onChange: (v: string) => void;
}

function FlexFieldInput({ definition, value, onChange }: FlexFieldInputProps) {
  const label = definition.label + (definition.is_required ? '' : '');

  if (definition.field_type === FlexFieldType.Enum) {
    const opts = definition.enum_options ?? [];
    return (
      <FormField label={label} required={definition.is_required}>
        <select className="form-select" value={value} onChange={e => onChange(e.target.value)}>
          <option value="">בחר…</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </FormField>
    );
  }

  const inputType =
    definition.field_type === FlexFieldType.Date    ? 'date'   :
    definition.field_type === FlexFieldType.Numeric ? 'number' : 'text';

  return (
    <FormField label={label} required={definition.is_required}>
      <input
        className="form-input"
        type={inputType}
        step={definition.field_type === FlexFieldType.Numeric ? '0.01' : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </FormField>
  );
}

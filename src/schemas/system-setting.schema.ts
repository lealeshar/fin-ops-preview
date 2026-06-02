import { z } from 'zod';

const KEY_REGEX = /^[a-z][a-z0-9_]*$/;
const isValidJson = (s: string) => { try { JSON.parse(s); return true; } catch { return false; } };

export const createSettingSchema = z.object({
  key: z
    .string()
    .min(1, 'שדה חובה')
    .max(100, 'מקסימום 100 תווים')
    .regex(KEY_REGEX, 'אותיות קטנות, ספרות וקו תחתון בלבד. חייב להתחיל באות'),
  is_flag: z.boolean(),
  value_json: z.string().optional(),
  description: z.string().max(500).nullish(),
}).superRefine((v, ctx) => {
  if (!v.is_flag) {
    if (!v.value_json?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['value_json'], message: 'שדה חובה' });
    } else if (!isValidJson(v.value_json)) {
      ctx.addIssue({ code: 'custom', path: ['value_json'], message: 'JSON לא תקין' });
    }
  }
});

export const editFlagSchema = z.object({
  enabled:     z.boolean(),
  description: z.string().max(500).nullish(),
});

export const editValueSchema = z.object({
  value_json: z
    .string()
    .min(1, 'שדה חובה')
    .refine(isValidJson, 'JSON לא תקין'),
  description: z.string().max(500).nullish(),
});

export type CreateSettingFormValues = z.infer<typeof createSettingSchema>;
export type EditFlagFormValues       = z.infer<typeof editFlagSchema>;
export type EditValueFormValues      = z.infer<typeof editValueSchema>;

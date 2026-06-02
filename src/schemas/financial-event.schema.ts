import { z } from 'zod';
import { FinancialEventType } from '../types/enums';

export const appendFinancialEventSchema = z.object({
  event_type:  z.nativeEnum(FinancialEventType),
  amount:      z.number({ required_error: 'Required' }).positive('Must be > 0'),
  description: z.string().max(500).nullish(),
  metadata:    z.record(z.unknown()).nullish(),
});

export type AppendFinancialEventFormValues = z.infer<typeof appendFinancialEventSchema>;

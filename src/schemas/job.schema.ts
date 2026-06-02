import { z } from 'zod';

export const createJobSchema = z.object({
  factory_id:               z.string().uuid('Invalid factory'),
  supervisor_id:            z.string().uuid('Invalid supervisor'),
  billing_month:            z.number().int().min(1).max(12),
  billing_year:             z.number().int().min(2000).max(2100),
  factory_charge_amount:    z.number().min(0, 'Must be ≥ 0'),
  supervisor_payout_amount: z.number().min(0, 'Must be ≥ 0'),
});

export type CreateJobFormValues = z.infer<typeof createJobSchema>;

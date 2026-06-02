import { z } from 'zod';
import { PaymentType } from '../types/enums';

export const createSupervisorSchema = z.object({
  name:                 z.string().min(1, 'Required').max(200),
  national_id:          z.string().min(1, 'Required').max(20),
  payment_type:         z.nativeEnum(PaymentType),
  monthly_salary_cost:  z.number({ required_error: 'Required' }).min(0, 'Must be ≥ 0'),
  phone:                z.string().max(50).nullish(),
  email:                z.string().email('Invalid email').max(200).nullish(),
  address:              z.string().max(500).nullish(),
  bank_code:            z.string().max(10).nullish(),
  bank_branch:          z.string().max(10).nullish(),
  bank_account:         z.string().max(20).nullish(),
  bank_account_type:    z.string().max(50).nullish(),
  flex_data:            z.record(z.unknown()).nullish(),
});

export const updateSupervisorSchema = createSupervisorSchema.partial();

export type CreateSupervisorFormValues = z.infer<typeof createSupervisorSchema>;
export type UpdateSupervisorFormValues = z.infer<typeof updateSupervisorSchema>;

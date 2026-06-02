import { z } from 'zod';
import { PaymentMethod, PaymentTerms } from '../types/enums';

export const createFactorySchema = z.object({
  name:                 z.string().min(1, 'Required').max(200),
  tax_id:               z.string().min(1, 'Required').max(50),
  payment_terms:        z.nativeEnum(PaymentTerms),
  payment_method:       z.nativeEnum(PaymentMethod),
  address:              z.string().max(500).nullish(),
  contact_name:         z.string().max(200).nullish(),
  phone:                z.string().max(50).nullish(),
  email:                z.string().email('Invalid email').max(200).nullish(),
  external_customer_id: z.string().max(100).nullish(),
  flex_data:            z.record(z.unknown()).nullish(),
});

export const updateFactorySchema = createFactorySchema.partial();

export type CreateFactoryFormValues = z.infer<typeof createFactorySchema>;
export type UpdateFactoryFormValues = z.infer<typeof updateFactorySchema>;

import { z } from 'zod';
import { FlexFieldEntityType, FlexFieldType } from '../types/enums';

export const flexFieldDefinitionSchema = z.object({
  entity_type:   z.nativeEnum(FlexFieldEntityType),
  field_key:     z.string().min(1, 'Required').max(100)
    .regex(/^[a-z0-9_]+$/, 'אותיות לטיניות קטנות, מספרים וקו תחתון בלבד'),
  label:         z.string().min(1, 'Required').max(200),
  field_type:    z.nativeEnum(FlexFieldType),
  display_order: z.coerce.number().int().min(0).default(0),
  is_required:   z.boolean().default(false),
  enum_options:  z.string().nullish(),
});

export type FlexFieldDefinitionFormValues = z.infer<typeof flexFieldDefinitionSchema>;

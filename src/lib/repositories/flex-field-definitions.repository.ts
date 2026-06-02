import { BaseRepository } from './base.repository';
import type { FlexFieldDefinition, RpcResponse } from '../../types/domain.types';
import type { FlexFieldEntityType, FlexFieldType } from '../../types/enums';

export interface UpsertFlexFieldDefinitionInput {
  readonly entity_type:    FlexFieldEntityType;
  readonly field_key:      string;
  readonly label:          string;
  readonly field_type:     FlexFieldType;
  readonly display_order?: number;
  readonly is_required?:   boolean;
  readonly enum_options?:  string[] | null;
}

export class FlexFieldDefinitionsRepository extends BaseRepository {
  async list(
    entityType?: FlexFieldEntityType,
  ): Promise<RpcResponse<FlexFieldDefinition[]>> {
    return this.callReadRpc<FlexFieldDefinition[]>(
      'rpc_list_flex_field_definitions',
      { p_entity_type: entityType ?? null },
    );
  }

  async upsert(
    input: UpsertFlexFieldDefinitionInput,
    idempotencyKey: string,
  ): Promise<RpcResponse<FlexFieldDefinition>> {
    return this.callRpc<FlexFieldDefinition>(
      'rpc_upsert_flex_field_definition',
      {
        p_idempotency_key: idempotencyKey,
        p_entity_type:     input.entity_type,
        p_field_key:       input.field_key,
        p_label:           input.label,
        p_field_type:      input.field_type,
        p_display_order:   input.display_order ?? 0,
        p_is_required:     input.is_required   ?? false,
        p_enum_options:    input.enum_options  ?? null,
      },
    );
  }
}

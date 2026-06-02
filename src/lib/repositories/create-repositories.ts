import type { SupabaseClient } from '../supabase/client';
import type { RepositoryContext } from './base.repository';
import { FactoriesRepository }           from './factories.repository';
import { SupervisorsRepository }         from './supervisors.repository';
import { JobsRepository }                from './jobs.repository';
import { FinancialEventsRepository }     from './financial-events.repository';
import { FlexFieldDefinitionsRepository } from './flex-field-definitions.repository';
import { SystemSettingsRepository }      from './system-settings.repository';
import { DashboardRepository }           from './dashboard.repository';

export interface Repositories {
  readonly factories:            FactoriesRepository;
  readonly supervisors:          SupervisorsRepository;
  readonly jobs:                 JobsRepository;
  readonly financialEvents:      FinancialEventsRepository;
  readonly flexFieldDefinitions: FlexFieldDefinitionsRepository;
  readonly systemSettings:       SystemSettingsRepository;
  readonly dashboard:            DashboardRepository;
}

export function createRepositories(
  client: SupabaseClient,
  ctx: RepositoryContext,
): Repositories {
  return {
    factories:            new FactoriesRepository(client, ctx),
    supervisors:          new SupervisorsRepository(client, ctx),
    jobs:                 new JobsRepository(client, ctx),
    financialEvents:      new FinancialEventsRepository(client, ctx),
    flexFieldDefinitions: new FlexFieldDefinitionsRepository(client, ctx),
    systemSettings:       new SystemSettingsRepository(client, ctx),
    dashboard:            new DashboardRepository(client, ctx),
  };
}

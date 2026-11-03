import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { environment } from '@env/environment';
import {
  BodyWeightRepository,
  ExerciseRepository,
  RoutineRepository,
  SessionRepository,
  SettingsRepository,
} from './repositories';
import {
  LocalBodyWeightRepository,
  LocalRoutineRepository,
  LocalSessionRepository,
  LocalSettingsRepository,
  StaticExerciseRepository,
} from './local/local-repositories';
import {
  HttpBodyWeightRepository,
  HttpExerciseRepository,
  HttpRoutineRepository,
  HttpSessionRepository,
  HttpSettingsRepository,
} from './http/http-repositories';

/**
 * Binds the abstract repositories to concrete implementations.
 * Switching to a backend = set `environment.dataSource` to `'api'`.
 */
export function provideDataLayer(): EnvironmentProviders {
  const providers: Provider[] =
    environment.dataSource === 'api'
      ? [
          { provide: ExerciseRepository, useClass: HttpExerciseRepository },
          { provide: RoutineRepository, useClass: HttpRoutineRepository },
          { provide: SessionRepository, useClass: HttpSessionRepository },
          { provide: BodyWeightRepository, useClass: HttpBodyWeightRepository },
          { provide: SettingsRepository, useClass: HttpSettingsRepository },
        ]
      : [
          { provide: ExerciseRepository, useClass: StaticExerciseRepository },
          { provide: RoutineRepository, useClass: LocalRoutineRepository },
          { provide: SessionRepository, useClass: LocalSessionRepository },
          { provide: BodyWeightRepository, useClass: LocalBodyWeightRepository },
          { provide: SettingsRepository, useClass: LocalSettingsRepository },
        ];
  return makeEnvironmentProviders(providers);
}

import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { environment } from '@env/environment';
import { ExerciseRepository, RoutineRepository, SessionRepository } from './repositories';
import { LocalRoutineRepository, LocalSessionRepository, StaticExerciseRepository } from './local/local-repositories';
import { HttpExerciseRepository, HttpRoutineRepository, HttpSessionRepository } from './http/http-repositories';

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
        ]
      : [
          { provide: ExerciseRepository, useClass: StaticExerciseRepository },
          { provide: RoutineRepository, useClass: LocalRoutineRepository },
          { provide: SessionRepository, useClass: LocalSessionRepository },
        ];
  return makeEnvironmentProviders(providers);
}

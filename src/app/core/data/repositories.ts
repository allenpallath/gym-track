import { Observable } from 'rxjs';
import { Exercise, Routine, WorkoutSession } from '@shared/models';

// Data-access contracts. Components and stores depend only on these abstract
// classes (they double as DI tokens). Implementations live in `local/` (IndexedDB)
// and `http/` (REST); `provideDataLayer()` picks one from the environment.
// Everything returns Observables so the HTTP versions are a drop-in swap.

export abstract class ExerciseRepository {
  abstract getAll(): Observable<Exercise[]>;
}

export abstract class RoutineRepository {
  abstract getAll(): Observable<Routine[]>;
  /** Insert or update (upsert). Returns the stored routine. */
  abstract save(routine: Routine): Observable<Routine>;
  abstract delete(id: string): Observable<void>;
}

export abstract class SessionRepository {
  abstract getAll(): Observable<WorkoutSession[]>;
  abstract save(session: WorkoutSession): Observable<WorkoutSession>;
  abstract delete(id: string): Observable<void>;
}

import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, map, Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AppSettings, BodyWeightEntry, Exercise, Routine, WorkoutSession } from '@shared/models';
import {
  BodyWeightRepository,
  ExerciseRepository,
  RoutineRepository,
  SessionRepository,
  SettingsRepository,
} from '../repositories';
import { GymTrackDb } from './gym-track-db';

export const GYM_TRACK_DB = new InjectionToken<GymTrackDb>('GYM_TRACK_DB', {
  providedIn: 'root',
  factory: () => new GymTrackDb(),
});

/** Exercises come from the bundled static JSON (free-exercise-db). */
@Injectable()
export class StaticExerciseRepository extends ExerciseRepository {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(environment.exercisesUrl);
  }
}

@Injectable()
export class LocalRoutineRepository extends RoutineRepository {
  private readonly db = inject(GYM_TRACK_DB);

  getAll(): Observable<Routine[]> {
    return from(this.db.routines.orderBy('updatedAt').reverse().toArray());
  }

  save(routine: Routine): Observable<Routine> {
    return from(this.db.routines.put(routine)).pipe(map(() => routine));
  }

  delete(id: string): Observable<void> {
    return from(this.db.routines.delete(id));
  }
}

@Injectable()
export class LocalSessionRepository extends SessionRepository {
  private readonly db = inject(GYM_TRACK_DB);

  getAll(): Observable<WorkoutSession[]> {
    return from(this.db.sessions.orderBy('startedAt').reverse().toArray());
  }

  save(session: WorkoutSession): Observable<WorkoutSession> {
    return from(this.db.sessions.put(session)).pipe(map(() => session));
  }

  delete(id: string): Observable<void> {
    return from(this.db.sessions.delete(id));
  }
}

@Injectable()
export class LocalBodyWeightRepository extends BodyWeightRepository {
  private readonly db = inject(GYM_TRACK_DB);

  getAll(): Observable<BodyWeightEntry[]> {
    return from(this.db.bodyweight.orderBy('date').toArray());
  }

  save(entry: BodyWeightEntry): Observable<BodyWeightEntry> {
    // `date` is a unique index, so replace any existing entry for that day first.
    return from(
      this.db.transaction('rw', this.db.bodyweight, async () => {
        await this.db.bodyweight.where('date').equals(entry.date).and((e) => e.id !== entry.id).delete();
        await this.db.bodyweight.put(entry);
      }),
    ).pipe(map(() => entry));
  }

  delete(id: string): Observable<void> {
    return from(this.db.bodyweight.delete(id));
  }
}

@Injectable()
export class LocalSettingsRepository extends SettingsRepository {
  private readonly db = inject(GYM_TRACK_DB);

  get(): Observable<AppSettings | null> {
    return from(this.db.settings.get('app')).pipe(
      map((row) => {
        if (!row) return null;
        const { key: _key, ...settings } = row;
        return settings;
      }),
    );
  }

  save(settings: AppSettings): Observable<AppSettings> {
    return from(this.db.settings.put({ key: 'app', ...settings })).pipe(map(() => settings));
  }
}

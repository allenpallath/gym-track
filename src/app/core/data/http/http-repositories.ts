import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Exercise, Routine, WorkoutSession } from '@shared/models';
import { ExerciseRepository, RoutineRepository, SessionRepository } from '../repositories';

// REST implementations, activated by `environment.dataSource = 'api'`.
// Expected endpoints (JSON bodies use the same shapes as shared/models):
//   GET    /exercises
//   GET    /routines            GET /routines/:id
//   PUT    /routines/:id        (upsert)      DELETE /routines/:id
//   GET    /sessions            GET /sessions/:id
//   PUT    /sessions/:id        (upsert)      DELETE /sessions/:id

@Injectable()
export class HttpExerciseRepository extends ExerciseRepository {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(`${environment.apiBaseUrl}/exercises`);
  }
}

@Injectable()
export class HttpRoutineRepository extends RoutineRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/routines`;

  getAll(): Observable<Routine[]> {
    return this.http.get<Routine[]>(this.url);
  }

  getById(id: string): Observable<Routine | undefined> {
    return this.http.get<Routine>(`${this.url}/${encodeURIComponent(id)}`);
  }

  save(routine: Routine): Observable<Routine> {
    return this.http.put<Routine>(`${this.url}/${encodeURIComponent(routine.id)}`, routine);
  }

  delete(id: string): Observable<void> {
    return this.http.delete(`${this.url}/${encodeURIComponent(id)}`).pipe(map(() => undefined));
  }
}

@Injectable()
export class HttpSessionRepository extends SessionRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/sessions`;

  getAll(): Observable<WorkoutSession[]> {
    return this.http.get<WorkoutSession[]>(this.url);
  }

  getById(id: string): Observable<WorkoutSession | undefined> {
    return this.http.get<WorkoutSession>(`${this.url}/${encodeURIComponent(id)}`);
  }

  save(session: WorkoutSession): Observable<WorkoutSession> {
    return this.http.put<WorkoutSession>(`${this.url}/${encodeURIComponent(session.id)}`, session);
  }

  delete(id: string): Observable<void> {
    return this.http.delete(`${this.url}/${encodeURIComponent(id)}`).pipe(map(() => undefined));
  }
}

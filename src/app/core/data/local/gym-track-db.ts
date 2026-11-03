import Dexie, { type EntityTable } from 'dexie';
import { AppSettings, BodyWeightEntry, Routine, WorkoutSession } from '@shared/models';

/** Settings live as a single row under a fixed key. */
export interface SettingsRow extends AppSettings {
  key: 'app';
}

/**
 * IndexedDB schema (via Dexie). Only indexed fields are listed in `stores()`;
 * the full objects are stored regardless. Bump `version()` when indexes or tables change.
 */
export class GymTrackDb extends Dexie {
  routines!: EntityTable<Routine, 'id'>;
  sessions!: EntityTable<WorkoutSession, 'id'>;
  bodyweight!: EntityTable<BodyWeightEntry, 'id'>;
  settings!: EntityTable<SettingsRow, 'key'>;

  constructor() {
    super('gym-track');
    this.version(1).stores({
      routines: 'id, updatedAt',
      sessions: 'id, routineId, startedAt',
    });
    this.version(2).stores({
      bodyweight: 'id, &date',
      settings: 'key',
    });
  }
}

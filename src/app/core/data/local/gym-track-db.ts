import Dexie, { type EntityTable } from 'dexie';
import { Routine, WorkoutSession } from '@shared/models';

/**
 * IndexedDB schema (via Dexie). Only indexed fields are listed in `stores()`;
 * the full objects are stored regardless. Bump `version()` and add an upgrade
 * when the indexes change.
 */
export class GymTrackDb extends Dexie {
  routines!: EntityTable<Routine, 'id'>;
  sessions!: EntityTable<WorkoutSession, 'id'>;

  constructor() {
    super('gym-track');
    this.version(1).stores({
      routines: 'id, updatedAt',
      sessions: 'id, routineId, startedAt',
    });
  }
}

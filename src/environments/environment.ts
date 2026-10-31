export type DataSource = 'local' | 'api';

export interface AppEnvironment {
  /** `local` = IndexedDB (Dexie) in the browser, `api` = REST backend at `apiBaseUrl`. */
  dataSource: DataSource;
  apiBaseUrl: string;
  /** Static exercise catalogue. Swap for `${apiBaseUrl}/exercises` once a backend exists. */
  exercisesUrl: string;
  exerciseImageBaseUrl: string;
}

export const environment: AppEnvironment = {
  dataSource: 'local',
  apiBaseUrl: '/api',
  exercisesUrl: 'data/exercises.json',
  exerciseImageBaseUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/',
};

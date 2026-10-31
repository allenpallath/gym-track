import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import Fuse, { IFuseOptions } from 'fuse.js';
import { ExerciseRepository } from '@core/data/repositories';
import { allowedTypos, editDistance } from '@core/utils/text.utils';
import { Exercise, ExerciseFilters } from '@shared/models';

interface SearchRow {
  exercise: Exercise;
  /** Lower-cased name + muscles + equipment, built once for cheap substring search. */
  haystack: string;
  nameLower: string;
  nameWords: string[];
  /** Words from muscles and equipment that aren't already in the name. */
  otherWords: string[];
  /** Adjacent name words joined ("benchpress"), so a missing space still matches. */
  joinedPairs: string[];
}

export interface ExerciseSearchResult {
  items: Exercise[];
  /** How many of `items` (at the end of the list) are typo-tolerant "close matches". */
  closeMatches: number;
}

// Typo-tolerance tuning. Fuzzy matches are only added when exact matches are scarce,
// and short terms are never fuzzed (they match far too much).
const FUZZY_WHEN_FEWER_THAN = 8;
const FUZZY_MIN_TERM_LENGTH = 4;
const FUZZY_MAX_RESULTS = 40;

const FUSE_OPTIONS: IFuseOptions<SearchRow> = {
  keys: [
    { name: 'exercise.name', weight: 3 },
    { name: 'exercise.primaryMuscles', weight: 1 },
    { name: 'exercise.equipment', weight: 0.6 },
    { name: 'exercise.secondaryMuscles', weight: 0.4 },
  ],
  includeScore: true,
  ignoreLocation: true, // match anywhere in the name, not just near the start
  threshold: 0.4, // 0 = exact … 1 = anything. 0.4 lets swapped letters ("sqaut") through.
  ignoreDiacritics: true,
};

/** Gym slang → the catalogue's wording. Applied per query word before matching. */
const SYNONYMS: Record<string, string> = {
  abs: 'abdominals',
  ab: 'abdominals',
  core: 'abdominals',
  quads: 'quadriceps',
  quad: 'quadriceps',
  hams: 'hamstrings',
  hammies: 'hamstrings',
  delts: 'shoulders',
  delt: 'shoulders',
  pecs: 'chest',
  pec: 'chest',
  bis: 'biceps',
  tris: 'triceps',
  traps: 'traps',
  glute: 'glutes',
  bum: 'glutes',
  db: 'dumbbell',
  dbs: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  kbs: 'kettlebell',
  ohp: 'shoulder press',
  rdl: 'romanian deadlift',
};

@Injectable({ providedIn: 'root' })
export class ExerciseStore {
  private readonly repo = inject(ExerciseRepository);

  private readonly _exercises = signal<Exercise[]>([]);
  private readonly _status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  private loadPromise: Promise<void> | null = null;

  readonly exercises = this._exercises.asReadonly();
  readonly status = this._status.asReadonly();

  readonly byId = computed(() => new Map(this._exercises().map((e) => [e.id, e])));

  private readonly searchRows = computed<SearchRow[]>(() =>
    this._exercises().map((exercise) => {
      const haystack = [exercise.name, ...exercise.primaryMuscles, ...exercise.secondaryMuscles, exercise.equipment ?? '']
        .join(' ')
        .toLowerCase();
      const nameWords = exercise.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const joinedPairs = nameWords.slice(1).map((w, i) => nameWords[i] + w);
      const otherWords = [...new Set(haystack.split(/[^a-z0-9]+/).filter((w) => w && !nameWords.includes(w)))];
      return { exercise, nameLower: exercise.name.toLowerCase(), haystack, nameWords, otherWords, joinedPairs };
    }),
  );

  /** Fuzzy index, rebuilt only when the catalogue changes. */
  private readonly fuse = computed(() => new Fuse(this.searchRows(), FUSE_OPTIONS));

  /** Idempotent: safe to call from every component that needs the catalogue. */
  load(): Promise<void> {
    this.loadPromise ??= this.fetch();
    return this.loadPromise;
  }

  /**
   * Searches the cached catalogue. Call it inside a `computed()` so it only
   * re-runs when the filters (or the catalogue) change.
   *
   * 1. Exact: every query word appears in name/muscles/equipment. Name hits rank first.
   * 2. Close matches: if exact hits are scarce, each word (≥4 chars) is fuzzy-matched
   *    with Fuse.js and an exercise must match *every* word — so "dumbel curl" finds
   *    dumbbell curls rather than everything vaguely like "dumbel".
   */
  search(filters: ExerciseFilters): ExerciseSearchResult {
    const terms = filters.query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .flatMap((t) => (SYNONYMS[t] ?? t).split(' '))
      .filter(Boolean);
    const allowed = (e: Exercise) =>
      (!filters.muscle || e.primaryMuscles.includes(filters.muscle)) &&
      (!filters.equipment || e.equipment === filters.equipment) &&
      (!filters.level || e.level === filters.level) &&
      (!filters.category || e.category === filters.category);

    const nameHits: Exercise[] = [];
    const otherHits: Exercise[] = [];
    for (const row of this.searchRows()) {
      if (!allowed(row.exercise)) continue;
      if (!terms.every((t) => row.haystack.includes(t))) continue;
      (terms.every((t) => row.nameLower.includes(t)) ? nameHits : otherHits).push(row.exercise);
    }
    const exact = [...nameHits, ...otherHits];

    if (!terms.length || exact.length >= FUZZY_WHEN_FEWER_THAN) {
      return { items: exact, closeMatches: 0 };
    }

    const close = this.fuzzyMatches(terms, new Set(exact.map((e) => e.id))).filter(allowed);
    return { items: [...exact, ...close], closeMatches: close.length };
  }

  /**
   * Exercises matching every term approximately.
   *
   * Fuse.js finds candidates (it's fast and tolerant), then each candidate is
   * re-checked with a real edit distance against its individual words. That
   * second pass drops loose Fuse hits ("plank" → "Ankle Circles") and ranks by
   * how few typos were needed, so "sqaut" puts Squat above Skating.
   */
  private fuzzyMatches(terms: string[], exclude: Set<string>): Exercise[] {
    // Short words can't be fuzzed reliably; if the query is only short words, skip.
    if (!terms.some((t) => t.length >= FUZZY_MIN_TERM_LENGTH)) return [];

    type Hit = { row: SearchRow; typos: number; fuseScore: number };
    let hits: Map<string, Hit> | null = null;

    for (const term of terms) {
      const next = new Map<string, Hit>();
      const candidates: { row: SearchRow; fuseScore: number }[] =
        term.length < FUZZY_MIN_TERM_LENGTH
          ? this.searchRows().filter((r) => r.haystack.includes(term)).map((row) => ({ row, fuseScore: 0 }))
          : this.fuse().search(term).map((r) => ({ row: r.item, fuseScore: r.score ?? 1 }));

      for (const { row, fuseScore } of candidates) {
        const id = row.exercise.id;
        if (hits && !hits.has(id)) continue; // must match every previous term too
        const typos = term.length < FUZZY_MIN_TERM_LENGTH ? 0 : this.bestTypos(term, row);
        if (Math.floor(typos) > allowedTypos(term.length)) continue;
        const prev = hits?.get(id);
        next.set(id, {
          row,
          typos: (prev?.typos ?? 0) + typos,
          fuseScore: (prev?.fuseScore ?? 0) + fuseScore,
        });
      }
      hits = next;
      if (!hits.size) return [];
    }

    return [...(hits ?? new Map<string, Hit>()).values()]
      .filter((h) => !exclude.has(h.row.exercise.id))
      // Fewest typos first; then shorter (more basic) names, e.g. "Barbell Squat" before "... To A Bench".
      .sort((a, b) => a.typos - b.typos || a.row.nameLower.length - b.row.nameLower.length || a.fuseScore - b.fuseScore)
      .slice(0, FUZZY_MAX_RESULTS)
      .map((h) => h.row.exercise);
  }

  /**
   * Fewest typos needed to turn `term` into one of the row's words. Matches that
   * only hit muscles/equipment cost an extra 0.5, so name matches rank first
   * ("dumbel curl" → Dumbbell Bicep Curl before Hammer Curls).
   */
  private bestTypos(term: string, row: SearchRow): number {
    const limit = allowedTypos(term.length);
    const closest = (words: string[]) => {
      let best = limit + 1;
      for (const word of words) {
        // Also compare with the word's same-length start, so a half-typed "lung" ~ "lunges".
        const start = word.length > term.length ? word.slice(0, term.length) : word;
        best = Math.min(best, editDistance(term, word, limit), editDistance(term, start, limit));
        if (best === 0) break;
      }
      return best;
    };

    let inName = closest(row.nameWords);
    // Joined pairs are compared whole only; their starts would fake perfect matches
    // ("squatt" vs the start of "squat"+"to").
    for (const pair of row.joinedPairs) {
      inName = Math.min(inName, editDistance(term, pair, limit));
    }
    return inName === 0 ? 0 : Math.min(inName, closest(row.otherWords) + 0.5);
  }

  private async fetch(): Promise<void> {
    this._status.set('loading');
    try {
      const data = await firstValueFrom(this.repo.getAll());
      this._exercises.set([...data].sort((a, b) => a.name.localeCompare(b.name)));
      this._status.set('ready');
    } catch (err) {
      console.error('Failed to load exercises', err);
      this.loadPromise = null;
      this._status.set('error');
    }
  }
}

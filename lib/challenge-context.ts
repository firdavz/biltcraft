import { useHabbit, save, saveChallenge, allChallenges, type Saved } from './habbit-store';

let scope: string | null = null;
export function challengeId() {
  return scope ?? useHabbit.getState().activeId;
}
export function habitState() {
  const state = useHabbit.getState();
  if (!scope || scope === state.activeId) return state;
  const snapshot = state.challenges[scope];
  if (!snapshot) throw new Error('This challenge could not be found.');
  return { ...state, ...snapshot };
}
export function saveHabit(patch: Partial<Saved>) {
  return scope ? saveChallenge(scope, patch) : save(patch);
}
// All scoped work runs inside the engine's single serialized queue.
export async function inChallenge<T>(id: string, work: () => Promise<T>): Promise<T> {
  const previous = scope;
  scope = id;
  try {
    return await work();
  } finally {
    scope = previous;
  }
}
export async function eachChallenge(work: () => Promise<void>) {
  let failure: unknown;
  for (const [id, challenge] of Object.entries(allChallenges())) {
    if (challenge.started || id === useHabbit.getState().activeId) {
      try {
        await inChallenge(id, work);
      } catch (error) {
        // A background habit must not put its error on another habit's screen.
        if (id === useHabbit.getState().activeId) failure ??= error;
      }
    }
  }
  if (failure) throw failure;
}

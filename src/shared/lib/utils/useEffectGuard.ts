/**
 * Development-time guard to detect potential infinite loops in useEffect hooks
 * 
 * This utility helps catch infinite loop patterns during development by:
 * 1. Tracking how many times an effect runs
 * 2. Warning if an effect runs too many times in quick succession
 * 3. Providing helpful debugging information
 * 
 * Usage:
 * ```ts
 * useEffect(() => {
 *   trackEffectRun('MyComponent: syncEffect')
 *   // ... your effect code ...
 * }, [dependencies])
 * ```
 * 
 * @see docs/development/infinite-loop-guardrails.md
 */

const MAX_RUNS_PER_SECOND = 10
const WARNING_THRESHOLD = 5

interface EffectRun {
  name: string
  timestamp: number
  count: number
}

const effectRuns = new Map<string, EffectRun>()

function cleanupOldRuns() {
  const now = Date.now()
  const oneSecondAgo = now - 1000

  for (const [key, run] of effectRuns.entries()) {
    if (run.timestamp < oneSecondAgo) {
      effectRuns.delete(key)
    }
  }
}

export function trackEffectRun(effectName: string): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  cleanupOldRuns()

  const run = effectRuns.get(effectName)
  const now = Date.now()

  if (run) {
    const timeSinceLastRun = now - run.timestamp
    const runsInLastSecond = run.count

    if (timeSinceLastRun < 1000 && runsInLastSecond >= WARNING_THRESHOLD) {
       
      console.warn(
        `⚠️ [trackEffectRun] Potential infinite loop detected in "${effectName}"\n` +
          `  - Runs in last second: ${runsInLastSecond}\n` +
          `  - Time since last run: ${timeSinceLastRun}ms\n` +
          `  - Check dependency array and state updates\n` +
          `  - See: docs/development/infinite-loop-guardrails.md`
      )

      if (runsInLastSecond >= MAX_RUNS_PER_SECOND) {
         
        console.error(
          `🚨 [trackEffectRun] CRITICAL: Effect "${effectName}" is running too frequently!\n` +
            `  This will cause performance issues and may prevent page navigation.\n` +
            `  Please review the dependency array and ensure state updates are guarded.`
        )
      }
    }

    effectRuns.set(effectName, {
      name: effectName,
      timestamp: now,
      count: runsInLastSecond + 1,
    })
  } else {
    effectRuns.set(effectName, {
      name: effectName,
      timestamp: now,
      count: 1,
    })
  }
}

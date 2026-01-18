# Infinite Loop Guardrails

## Overview

This document describes common infinite loop patterns that can cause Turbopack/Next.js to continuously compile and prevent page navigation. These issues are particularly problematic during development.

## Known Issues

### 1. useEffect with State in Dependency Array That Updates That State

**Problem**: A `useEffect` hook that includes a state variable in its dependency array and also updates that same state variable can cause infinite re-renders.

**Example (BAD)**:
```typescript
const [network, setNetworkState] = useState('mainnet')

useEffect(() => {
  // This updates 'network', which is in the dependency array
  if (someCondition) {
    setNetworkState('testnet') // This triggers the effect again!
  }
}, [network]) // ❌ 'network' is in dependencies but also updated inside
```

**Solution**: Remove the state variable from dependencies if you're updating it, or use a ref to track previous values.

**Example (GOOD)**:
```typescript
const [network, setNetworkState] = useState('mainnet')
const prevNetworkRef = useRef(network)

useEffect(() => {
  if (someCondition && prevNetworkRef.current !== network) {
    setNetworkState('testnet')
    prevNetworkRef.current = 'testnet'
  }
}, [isConnected, walletConnectSession]) // ✅ Only depend on external values
```

**Location**: `src/shared/providers/NetworkProvider.tsx` (lines 35-68)

### 2. useEffect with State Object in Dependency Array

**Problem**: Including a state object (or the entire state) in a `useEffect` dependency array causes the effect to run on every state change, even if you only care about specific properties.

**Example (BAD)**:
```typescript
const [state, setState] = useState({ count: 0, name: '' })

useEffect(() => {
  // This runs every time ANY property in state changes
  console.log('State changed')
}, [state]) // ❌ Entire state object in dependencies
```

**Solution**: Only include the specific properties you need, or use an empty dependency array if the effect should only run once.

**Example (GOOD)**:
```typescript
const [state, setState] = useState({ count: 0, name: '' })

useEffect(() => {
  // Only runs when count changes
  console.log('Count changed')
}, [state.count]) // ✅ Only specific property

// OR if you only want to register once:
useEffect(() => {
  // Only runs once on mount
  listeners.push(setState)
  return () => {
    listeners.splice(listeners.indexOf(setState), 1)
  }
}, []) // ✅ Empty array for one-time setup
```

**Location**: `src/hooks/use-toast.ts` (line 177-185)

## Prevention Guidelines

### 1. Dependency Array Rules

- ✅ **DO**: Only include values that the effect actually depends on
- ✅ **DO**: Use empty array `[]` for one-time setup/cleanup
- ✅ **DO**: Use refs to track previous values instead of including them in dependencies
- ❌ **DON'T**: Include state variables that you update inside the effect
- ❌ **DON'T**: Include entire state objects if you only need specific properties
- ❌ **DON'T**: Include values that change on every render (like object/array literals)

### 2. State Updates in useEffect

- ✅ **DO**: Use refs (`useRef`) to track previous values
- ✅ **DO**: Use guards to prevent unnecessary updates
- ✅ **DO**: Use `useCallback` for functions that are used in dependencies
- ❌ **DON'T**: Update state that's in the dependency array without guards
- ❌ **DON'T**: Create new objects/arrays in the dependency array

### 3. Development-Time Checks

When developing, watch for:
- Continuous console logs from useEffect
- Browser tab becoming unresponsive
- Turbopack showing "compiling..." indefinitely
- Network requests firing repeatedly
- State updates happening in rapid succession

## ESLint Rules

The project uses ESLint with React Hooks plugin. Ensure these rules are enabled:

- `react-hooks/exhaustive-deps`: Warns about missing dependencies
- `react-hooks/rules-of-hooks`: Enforces hooks rules

Run `npm run lint` or `bun run lint` to check for issues.

## Testing for Infinite Loops

1. **Console Monitoring**: Watch for repeated console logs
2. **React DevTools**: Use the Profiler to detect excessive re-renders
3. **Network Tab**: Check for repeated API calls
4. **Performance Tab**: Look for continuous JavaScript execution

## Related Files

- `src/shared/providers/NetworkProvider.tsx` - Network state management
- `src/hooks/use-toast.ts` - Toast state management
- `src/features/trading/model/useOrderBookFilters.ts` - Filter state management

## Additional Resources

- [React Hooks FAQ](https://react.dev/reference/react/hooks#rules-of-hooks)
- [useEffect Dependencies](https://react.dev/reference/react/useEffect#specifying-reactive-dependencies)
- [ESLint React Hooks Plugin](https://www.npmjs.com/package/eslint-plugin-react-hooks)

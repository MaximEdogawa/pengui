# Storybook Setup & Build Exclusion

## How Storybook is Normally Set Up

Storybook is typically set up with **complete separation** from the application build:

### 1. **Directory Structure**
```
project-root/
├── .storybook/          # Storybook configuration
│   ├── main.ts         # Tells Storybook where to find stories
│   └── preview.ts      # Global decorators, providers, styles
├── storybook/          # Story files (outside src/)
│   ├── primitives/
│   ├── forms/
│   └── ...
├── src/                # Application code (Storybook excluded)
│   ├── app/
│   ├── shared/ui
│   └── ...
└── storybook-static/   # Built Storybook output (gitignored)
```

### 2. **Why Outside `src/`?**

- **Clear separation**: Storybook is a dev/documentation tool, not part of the app
- **Automatic exclusion**: Next.js doesn't traverse directories outside `src/` or `app/` for pages
- **Simpler config**: Less need for special build exclusions
- **Type safety**: TypeScript can exclude the entire directory easily

## How Storybook is Excluded from `bun run build`

### Method 1: TypeScript Exclusion (Primary Method) ✅

**`tsconfig.json`**:
```json
{
  "exclude": [
    "node_modules",
    ".next",
    "storybook-static",
    "storybook"  // Excludes entire storybook directory
  ]
}
```

This prevents TypeScript from type-checking Storybook files during the build.

### Method 2: Directory Location (Automatic)

Since `storybook/` is at the project root (not in `src/` or `app/`):
- Next.js **automatically ignores** it for page routing
- No special `pageExtensions` config needed
- No webpack/Turbopack exclusions needed

### Method 3: Storybook Config (For Storybook Builds)

**`.storybook/main.ts`**:
```typescript
{
  stories: [
    "../storybook/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ]
}
```

This tells Storybook where to find stories (only used when running `bun run storybook`).

## Current Setup

✅ **Storybook directory**: `storybook/` at project root  
✅ **TypeScript exclusion**: `tsconfig.json` excludes `storybook`  
✅ **Next.js**: Automatically ignores `storybook/` (not in `src/` or `app/`)  
✅ **Storybook config**: Points to `../storybook/**/*.stories.*`  

## What's NOT Needed

❌ **Webpack config**: Not needed (Next.js 16 uses Turbopack, and `storybook/` is outside `src/`)  
❌ **pageExtensions**: Not needed (no `.stories.tsx` files in `src/app/` or `src/pages/`)  
❌ **Special Next.js config**: Not needed (directory location handles it)  

## Verification

```bash
# App build (should exclude Storybook)
bun run build

# Storybook build (only builds Storybook)
bun run build-storybook
```

## TypeScript Configuration

Storybook has its own `tsconfig.json` at `storybook/tsconfig.json` that extends the root config:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "moduleResolution": "bundler",  // Required for proper type resolution
    // ... other options
  }
}
```

**Important**: The `moduleResolution` must be set to `"bundler"` (not `"node"`) to properly resolve re-exported types from `@storybook/nextjs-vite`. This allows TypeScript to correctly resolve `Meta` and `StoryObj` types.

## Writing Stories

### Import Types

Always import `Meta` and `StoryObj` from the framework package:

```typescript
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
```

❌ **Don't** import from `@storybook/react` directly - the linter will flag this.

### Stories with Custom Render Functions

When using a custom `render` function, you must still provide `args` to satisfy TypeScript's type requirements:

```typescript
export const MyStory: Story = {
  args: {
    // Dummy args - required by TypeScript but not used
    value: '',
    onChange: () => {},
    // ... other required props
  },
  render: () => {
    // Your custom render logic here
    // The actual props come from your render function, not args
    return <MyComponent value={state} onChange={setState} />
  },
}
```

**Why?** When a component has required props, `StoryObj<typeof meta>` requires `args` to be provided, even when using a custom `render` function. The `args` are placeholders to satisfy the type system; the actual props come from your custom `render` function.

### Basic Story Pattern

```typescript
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MyComponent } from '@/shared/ui'

const meta = {
  title: 'Shared UI/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // Component props here
  },
}
```

## Best Practices

1. ✅ Keep stories outside `src/` - prevents accidental inclusion
2. ✅ Exclude in root `tsconfig.json` - prevents type errors during app build
3. ✅ Use `moduleResolution: "bundler"` in `storybook/tsconfig.json` - required for type resolution
4. ✅ Import types from `@storybook/nextjs-vite` - not from `@storybook/react`
5. ✅ Provide `args` even with custom `render` functions - satisfies TypeScript requirements
6. ✅ Use path aliases in stories - `@/shared/ui` works from `storybook/`
7. ✅ Keep `.storybook/` config separate - Storybook-specific settings
8. ✅ Gitignore `storybook-static/` - build output shouldn't be committed

## Troubleshooting

### Next.js tries to compile Storybook files
1. Verify `storybook/` is in root `tsconfig.json` exclude
2. Ensure `storybook/` is at project root (not in `src/`)
3. Clear `.next` cache: `rm -rf .next`
4. Check that no app code imports from `storybook/`

### TypeScript errors: "Module has no exported member 'StoryObj'"
1. Verify `storybook/tsconfig.json` has `"moduleResolution": "bundler"`
2. Ensure you're importing from `@storybook/nextjs-vite`, not `@storybook/react`
3. Clear TypeScript cache: `rm -rf node_modules/.cache`

### TypeScript errors: "Property 'args' is missing"
When using custom `render` functions, you must provide dummy `args`:
```typescript
export const MyStory: Story = {
  args: {
    // Provide all required props as dummy values
    requiredProp: defaultValue,
    onChange: () => {},
  },
  render: () => {
    // Your custom render logic
  },
}
```

### Linter error: "Do not import renderer package directly"
Always import from the framework package:
```typescript
// ✅ Correct
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

// ❌ Wrong
import type { Meta, StoryObj } from '@storybook/react'
```

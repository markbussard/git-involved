#!/bin/bash
# Pre-push hook: runs typecheck, lint, and format check before git push

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command')

# Only run checks if this is a git push command
if ! echo "$command" | grep -q "git push"; then
  exit 0
fi

echo "Running pre-push checks..." >&2

# Typecheck
if ! pnpm tsc --noEmit 2>&1; then
  echo "Typecheck failed — blocking push" >&2
  exit 2
fi

# Lint
if ! pnpm lint 2>&1; then
  echo "Lint failed — blocking push" >&2
  exit 2
fi

# Format check
if ! pnpm format:check 2>&1; then
  echo "Format check failed — blocking push" >&2
  exit 2
fi

echo "All pre-push checks passed!" >&2
exit 0

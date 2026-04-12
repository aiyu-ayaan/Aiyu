---
name: codegraph
description: Use CodeGraph for structural code analysis and dependency tracking
compatibility: opencode
tools:
  - codegraph_search
  - codegraph_context
  - codegraph_callers
  - codegraph_callees
  - codegraph_impact
  - codegraph_node
  - codegraph_files
  - codegraph_status
---

# CodeGraph Skill

This project has CodeGraph initialized (.codegraph/ exists). CodeGraph provides a pre-indexed knowledge graph for instant code exploration.

## When to use me

- Finding functions, classes, or symbols by name
- Understanding call relationships (who calls what)
- Analyzing change impact before editing
- Finding dead code or complexity hotspots
- Exploring code architecture

## How to use

### For code exploration (better than grep):

1. Use `codegraph_search` to find symbols instantly
2. Use `codegraph_callers` / `codegraph_callees` to trace call flow
3. Use `codegraph_impact` to check blast radius before changes

### For understanding code structure:

- `codegraph_files` - Get indexed file structure (faster than filesystem)
- `codegraph_node` - Get details about a specific symbol
- `codegraph_status` - Check index health and statistics

### Rules

1. Always use codegraph tools instead of grep/glob for symbol searches
2. Trust the codegraph results - they include source code
3. Only fall back to read/grep when you need more context

## Important

This skill works with the Claude Code CodeGraph MCP server. Ensure:
1. CodeGraph is installed globally: `npm install -g @colbymchenry/codegraph`
2. MCP server is configured in ~/.claude.json
3. Project is indexed: `codegraph init -i && codegraph index`
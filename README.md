# active-surface

A quiet bar above the Claude Code prompt. It shows a single small icon; clicking
it opens a pane listing your installed plugins (with real on/off toggles,
written to `settings.json`) and the skills found in `~/.claude/skills` (shown
for visibility only — skills have no per-item toggle yet).

## Install

At the prompt of a terminal session:

```
/plugin install active-surface --marketplace Dobroduch/claude-plugin-dashboard
```

In the desktop app, where `/plugin` does not run: click **+** next to the
prompt box, then **Plugins**, **Add marketplace** with
`Dobroduch/claude-plugin-dashboard`, then **Add plugin**.

Toggling a plugin takes effect the next time that session starts, not
immediately.

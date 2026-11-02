import { atom, read, update } from 'claude-code'
import type { Register, EngineInterface } from 'claude-code'

import type { PluginEntry, SkillEntry } from '../types'

const ID = 'active-surface'
const PANE = 'active-surface'

const plugins = atom({ plugin: ID, key: 'plugins' } as const, [] as PluginEntry[], {
  shape: 'plugins-2',
})
const skills = atom({ plugin: ID, key: 'skills' } as const, [] as SkillEntry[], {
  shape: 'skills-2',
})

async function homeDir($: EngineInterface): Promise<string> {
  const profile = await $.env.get('USERPROFILE')
  if (profile) return profile
  const home = await $.env.get('HOME')
  return home ?? ''
}

async function readJson($: EngineInterface, path: string): Promise<any | null> {
  const text = await $.fs.read(path).catch(() => null)
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function settingsPath($: EngineInterface): Promise<string> {
  return `${await homeDir($)}/.claude/settings.json`
}

async function loadPlugins($: EngineInterface): Promise<PluginEntry[]> {
  const home = await homeDir($)
  const installed = await readJson($, `${home}/.claude/plugins/installed_plugins.json`)
  const settings = await readJson($, await settingsPath($))
  const enabledPlugins = (settings?.enabledPlugins ?? {}) as Record<string, unknown>
  const keys = Object.keys(installed?.plugins ?? {})

  return keys.map(key => ({
    key,
    label: key.split('@')[0],
    enabled: enabledPlugins[key] === true,
  }))
}

async function loadSkills($: EngineInterface): Promise<SkillEntry[]> {
  const home = await homeDir($)
  const entries = await $.fs.list(`${home}/.claude/skills`).catch(() => [])
  return entries.filter(entry => entry.kind === 'dir').map(entry => ({ name: entry.name }))
}

async function togglePlugin($: EngineInterface, key: string): Promise<boolean> {
  const path = await settingsPath($)
  const settings = (await readJson($, path)) ?? {}
  const enabledPlugins = { ...(settings.enabledPlugins ?? {}) }
  const nextEnabled = enabledPlugins[key] !== true
  enabledPlugins[key] = nextEnabled
  const updated = { ...settings, enabledPlugins }
  await $.fs.write(path, JSON.stringify(updated, null, 2) + '\n')
  return nextEnabled
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const [loadedPlugins, loadedSkills] = await Promise.all([loadPlugins($), loadSkills($)])
    await update($, plugins, () => loadedPlugins)
    await update($, skills, () => loadedSkills)
    await $.command.register({
      name: 'active-surface',
      description: 'Open the plugin & skill switchboard',
    })

    return next(e)
  })

  on('command.run', { command: 'active-surface' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Active Surface', focus: true })

    return { text: 'Active Surface opened.' }
  })

  // The one visible trace near the prompt: a plain, dim icon that opens the pane.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const pluginList = await read($, plugins)
    const skillList = await read($, skills)

    if (pluginList.length === 0 && skillList.length === 0) {
      return next(e)
    }

    const { Button } = $.ui.resolve(e)

    return (
      <Button
        key="open-active-surface"
        plain
        dimColor
        onPress={() => $.ui.open({ id: PANE, title: 'Active Surface', focus: true })}
      >
        AS
      </Button>
    )
  })

  // The full switchboard: real toggles for plugins, a read-only list for skills.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const pluginList = await read($, plugins)
    const skillList = await read($, skills)

    return (
      <Box flexDirection="column" gap="sm">
        <Text bold>Plugins</Text>
        {pluginList.length === 0 && <Text dimColor>None installed.</Text>}
        {pluginList.map(p => (
          <Button
            key={`toggle-${p.key}`}
            plain
            dimColor={!p.enabled}
            onPress={async () => {
              const nextEnabled = await togglePlugin($, p.key)
              await update($, plugins, cur =>
                cur.map(x => (x.key === p.key ? { ...x, enabled: nextEnabled } : x)),
              )
              $.ui.toast(
                `${p.label} ${nextEnabled ? 'enabled' : 'disabled'} — takes effect next session`,
              )
            }}
          >
            {p.enabled ? '●' : '○'} {p.label}
          </Button>
        ))}
        <Text bold>Skills</Text>
        {skillList.length === 0 && <Text dimColor>None found.</Text>}
        {skillList.map(s => (
          <Text key={`skill-${s.name}`} dimColor>
            · {s.name}
          </Text>
        ))}
        <Text dimColor>Skills aren't individually toggleable yet — this just shows what's on disk.</Text>
      </Box>
    )
  })
}

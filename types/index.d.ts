export type PluginEntry = {
  key: string
  label: string
  enabled: boolean
}

export type SkillEntry = {
  name: string
}

declare module 'claude-code' {
  interface PluginState {
    'active-surface': {
      plugins: PluginEntry[]
      skills: SkillEntry[]
    }
  }
}

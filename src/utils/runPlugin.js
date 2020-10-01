import dlv from 'dlv'

export function runPlugin(plugin, { config, ...rest } = {}) {
  try {
    ;(plugin.handler || plugin)({
      addUtilities: () => {},
      addComponents: () => {},
      addBase: () => {},
      addVariant: () => {},
      e: (x) => x,
      prefix: (x) => x,
      theme: (path, defaultValue) => dlv(config, `theme.${path}`, defaultValue),
      variants: () => [],
      config: (path, defaultValue) => dlv(config, path, defaultValue),
      corePlugins: (path) => {
        if (Array.isArray(config.corePlugins)) {
          return config.corePlugins.includes(path)
        }
        return dlv(config, `corePlugins.${path}`, true)
      },
      target: (path) => {
        if (typeof config.target === 'string') {
          return config.target
        }
        const [defaultTarget, targetOverrides] = dlv(config, 'target')
        return dlv(targetOverrides, path, defaultTarget)
      },
      ...rest,
    })
  } catch (_) {}
}

import { runPlugin } from './runPlugin'

export function getVariants({ config, postcss }) {
  let variants = [
    'responsive',
    'hover',
    'focus',
    'group-hover',
    'active',
    'focus-within',
    'default',
    'first',
    'last',
    'odd',
    'even',
    'disabled',
    'visited',
    'group-focus',
  ]

  let plugins = Array.isArray(config.plugins) ? config.plugins : []

  plugins.forEach((plugin) => {
    runPlugin(plugin, {
      postcss,
      config,
      addVariant: (name) => {
        variants.push(name)
      },
    })
  })
  console.log(variants)

  return variants
}

const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const { rollup } = require('rollup')
const { terser } = require('rollup-plugin-terser')
const path = require('path')
const fs = require('fs').promises

const plugins = ['@tailwindcss/custom-forms', '@tailwindcss/ui']

plugins.forEach(async (plugin) => {
  const pkg = require(`${plugin}/package.json`)
  const bundle = await rollup({
    input: path.resolve(__dirname, `../../node_modules/${plugin}`, pkg.main),
    plugins: [resolve({ browser: true }), commonjs(), terser()],
  })

  const { output } = await bundle.generate({
    format: 'esm',
  })

  await fs.mkdir(path.resolve(__dirname, '../../public/plugins'), {
    recursive: true,
  })

  if (plugin.includes('/')) {
    const parts = plugin.split('/')
    await fs.mkdir(
      path.resolve(
        __dirname,
        '../../public/plugins',
        ...parts.slice(0, parts.length - 1)
      ),
      {
        recursive: true,
      }
    )
  }

  await fs.writeFile(
    path.resolve(
      __dirname,
      '../../public/plugins',
      `${plugin}@${pkg.version}.js`
    ),
    output[0].code.replace(
      /import ([^ ]+) from *['"]util['"]/,
      (_m, name) => `var ${name}={deprecate:_=>_}`
    ),
    'utf8'
  )
})

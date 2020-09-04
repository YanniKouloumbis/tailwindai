const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const withTM = require('next-transpile-modules')(['monaco-editor'])
const { createLoader } = require('simple-functional-loader')
const path = require('path')
const fs = require('fs')

const externals = {
  fs: 'self.fs',
  'fs-extra': 'self.fsextra',
  resolve: 'self.resolve',
  'fs.realpath': 'self.fsrealpath',
  purgecss: 'self.purgecss',
}

module.exports = withTM({
  webpack: (config) => {
    const rule = config.module.rules
      .find((rule) => rule.oneOf)
      .oneOf.find(
        (r) =>
          // Find the global CSS loader
          r.issuer && r.issuer.include && r.issuer.include.includes('_app')
      )
    if (rule) {
      rule.issuer.include = [
        rule.issuer.include,
        // Allow `monaco-editor` to import global CSS:
        /[\\/]node_modules[\\/]monaco-editor[\\/]/,
      ]
    }

    config.plugins.push(
      new MonacoWebpackPlugin({
        languages: [
          'css',
          'typescript',
          'javascript',
          'html',
        ],
        filename: 'static/[name].worker.js',
      })
    )

    if (config.externals) {
      config.externals.push(externals)
    } else {
      config.externals = externals
    }

    config.module.rules.push({
      test: /tailwindcss\/lib\/plugins\/preflight\.js$/,
      use: [
        createLoader(function (source) {
          return source.replace(
            /_fs\.default\.readFileSync\(.*?'utf8'\)/g,
            (m) => {
              if (/normalize/.test(m)) {
                return (
                  '`' +
                  fs
                    .readFileSync(require.resolve('normalize.css'), 'utf8')
                    .replace(/`/g, '\\`') +
                  '`'
                )
              }
              if (/preflight/.test(m)) {
                return (
                  '`' +
                  fs
                    .readFileSync(
                      path.resolve(
                        __dirname,
                        'node_modules/tailwindcss/lib/plugins/css/preflight.css'
                      ),
                      'utf8'
                    )
                    .replace(/`/g, '\\`') +
                  '`'
                )
              }
              return m
            }
          )
        }),
      ],
    })

    config.output.globalObject = 'self'

    return config
  },
})

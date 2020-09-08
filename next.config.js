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
    config.module.rules
      .filter((rule) => rule.oneOf)
      .forEach((rule) => {
        rule.oneOf.forEach((r) => {
          if (
            r.issuer &&
            r.issuer.and &&
            r.issuer.and.length === 1 &&
            r.issuer.and[0] ===
              require('path').resolve(process.cwd(), 'src/pages/_app.js')
          ) {
            r.issuer.or = [
              ...r.issuer.and,
              /[\\/]node_modules[\\/]monaco-editor[\\/]/,
            ]
            delete r.issuer.and
          }
        })
      })

    config.plugins.push(
      new MonacoWebpackPlugin({
        languages: ['css', 'typescript', 'javascript', 'html'],
        filename: 'static/[name].worker.js',
      })
    )

    if (config.externals) {
      config.externals.push(externals)
    } else {
      config.externals = externals
    }

    config.module.rules.push({
      test: /language\/css\/cssWorker\.js$/,
      use: [
        createLoader(function (source) {
          return source.replace(
            "case 'css':",
            "case 'css':\ncase 'tailwindcss':"
          )
        }),
      ],
    })

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

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

function getExternal(context, request, callback) {
  if (/node_modules/.test(context) && externals[request]) {
    return callback(null, externals[request])
  }
  callback()
}

module.exports = withTM({
  async headers() {
    return [
      {
        source: '/plugins/:path*',
        headers: [
          {
            key: 'cache-control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
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
        filename: 'static/chunks/[name].worker.js',
      })
    )

    if (!isServer) {
      if (config.externals) {
        config.externals.push(getExternal)
      } else {
        config.externals = [getExternal]
      }
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

    const files = [
      {
        pattern: /normalize/,
        file: require.resolve('normalize.css'),
      },
      {
        pattern: /preflight/,
        file: path.resolve(
          __dirname,
          'node_modules/tailwindcss/lib/plugins/css/preflight.css'
        ),
      },
    ]

    config.module.rules.push({
      test: /tailwindcss\/lib\/plugins\/preflight\.js$/,
      use: [
        createLoader(function (source) {
          return source.replace(
            /_fs\.default\.readFileSync\(.*?'utf8'\)/g,
            (m) => {
              for (let i = 0; i < files.length; i++) {
                if (files[i].pattern.test(m)) {
                  return (
                    '`' +
                    fs
                      .readFileSync(files[i].file, 'utf8')
                      .replace(/`/g, '\\`') +
                    '`'
                  )
                }
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

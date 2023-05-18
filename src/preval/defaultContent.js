// @preval
const postcss = require('postcss')
const tailwindcss = require('tailwindcss')
const autoprefixer = require('autoprefixer')
const cssnano = require('cssnano')
const { loopWhile } = require('deasync')

module.exports = () => {
  const html = `<!--
  Thank you to TailwindLabs for the TailwindPlay standard!
  
  Welcome to Skylight AI Play, a Tailwind CSS playground powered by windowai.io.

  Everything here works just like it does when you're running Tailwind locally
  with a real build pipeline. You can customize your config file, use features
  like \`@apply\`, or even add third-party plugins.
-->
<div class="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
  <div class="relative py-3 sm:max-w-xl sm:mx-auto">
    <div class="absolute inset-0 bg-gradient-to-r from-teal-400 to-blue-400 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
    <div class="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
      <div class="max-w-md mx-auto">
        <div>
          <img src="/img/logo.svg" class="h-7 sm:h-8" />
        </div>
        <div class="divide-y divide-gray-200">
          <div class="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
            <p><strong>Skylight AI</strong> ✨ is the best place to find <a href="https://windowai.io/" class="text-teal-600 hover:text-teal-700">window.ai</a> applications!</p>
            <ul class="list-disc space-y-2 ml-5">
              <li>
                <p>Find apps at <a href="https://app.skylightai.io/" class="text-teal-600 hover:text-teal-700">app.skylightai.io</a></p>
              </li>
              <li>
                <p>Post apps at <a href="https://dash.skylightai.io/" class="text-teal-600 hover:text-teal-700">dash.skylightai.io</a></p>
              </li>
              <li>
                <p>Make your window.ai apps monetizable and hook into skylight's simple oauth system! <a href="https://github.com/YanniKouloumbis/skylight-template" class="text-teal-600 hover:text-teal-700">Documentation</a></p>
              </li>
            </ul>
          </div>
          <div class="pt-6 text-base leading-6 font-bold sm:leading-7">
            <p>Created by <a href="https://twitter.com/ykouloumbis" class="text-teal-600 hover:text-teal-700">Yanni</a></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


\n`
  const css = '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n'
  const config = `module.exports = {
  theme: {
    extend: {},
    variants: {},
    plugins: [],
  },
}\n`

  let compiledCss

  postcss([
    tailwindcss({
      future: {
        purgeLayersByDefault: true,
      },
      purge: {
        enabled: true,
        content: [{ raw: html }],
        options: { keyframes: true, whitelist: ['html', 'body'] },
        preserveHtmlElements: false,
      },
      theme: {
        extend: {
          spacing: {
            7: '1.75rem',
          },
          borderRadius: {
            xl: '12px',
            '2xl': '16px',
            '3xl': '24px',
          },
          rotate: {
            '-6': '-6deg',
          },
        },
      },
    }),
    autoprefixer(),
    cssnano(),
  ])
    .process(css, {
      from: undefined,
    })
    .then((result) => {
      compiledCss = result.css
    })

  loopWhile(() => !compiledCss)

  return {
    html,
    css,
    config,
    compiledCss,
  }
}

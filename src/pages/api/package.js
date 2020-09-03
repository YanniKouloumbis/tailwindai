import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import { rollup } from 'rollup'
import { terser } from 'rollup-plugin-terser'
import * as path from 'path'

export default async (req, res) => {
  let file = req.query.file

  if (!file.endsWith('.js')) {
    file = `${file}.js`
  }

  const bundle = await rollup({
    input: path.resolve(process.cwd(), `node_modules/tailwindcss/${file}`),
    plugins: [resolve(), commonjs(), terser()],
  })

  const { output } = await bundle.generate({
    format: 'esm',
  })

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/javascript')
  res.setHeader('Cache-Control', 's-maxage=31622400')
  res.end(output[0].code)
}

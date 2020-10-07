import shortid from 'shortid'

function put(item) {
  return new Promise((resolve, reject) => {
    fetch(process.env.TW_API_URL + '/api/playgrounds/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uuid: item.ID,
        html: item.html,
        css: item.css,
        config: item.config,
      }),
    })
      .then(() => {
        resolve({
          uuid: item.ID,
          html: item.html,
          css: item.css,
          config: item.config,
        })
      })
      .catch((err) => {
        reject(err)
      })
  })
}

export default async function share(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 404
    return res.end()
  }

  if (
    typeof req.body !== 'object' ||
    typeof req.body.html !== 'string' ||
    typeof req.body.css !== 'string' ||
    typeof req.body.config !== 'string'
  ) {
    res.statusCode = 400
    return res.end()
  }

  const ID = shortid.generate()

  try {
    await put({
      ID,
      html: req.body.html,
      css: req.body.css,
      config: req.body.config,
    })
    res.statusCode = 200
    res.json({ ID })
  } catch (error) {
    console.error(error)
    res.statusCode = 500
    res.json({ error: true })
  }
}

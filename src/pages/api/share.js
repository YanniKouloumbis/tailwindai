import * as AWS from 'aws-sdk'
import shortid from 'shortid'

const db = new AWS.DynamoDB.DocumentClient({
  credentials: {
    accessKeyId: process.env.TW_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.TW_AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.TW_AWS_DEFAULT_REGION,
})

function put(item) {
  return new Promise((resolve, reject) => {
    db.put(
      {
        TableName: process.env.TW_TABLE_NAME,
        Item: item,
      },
      (err, data) => {
        if (err) reject(err)
        resolve(data)
      }
    )
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

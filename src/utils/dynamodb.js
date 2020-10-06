import * as AWS from 'aws-sdk'

const database = new AWS.DynamoDB.DocumentClient({
  credentials: {
    accessKeyId: process.env.TW_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.TW_AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.TW_AWS_DEFAULT_REGION,
})

export function get(TableName, Key) {
  return new Promise((resolve, reject) => {
    database.get({ TableName, Key }, (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}

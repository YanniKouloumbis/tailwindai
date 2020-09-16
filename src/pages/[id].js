import App from './index'
import Error from 'next/error'

export default function Pen({ errorCode, initialContent }) {
  if (errorCode) {
    return <Error statusCode={errorCode} />
  }

  return <App initialContent={initialContent} />
}

export async function getServerSideProps({ params, res }) {
  const AWS = require('aws-sdk')

  const db = new AWS.DynamoDB.DocumentClient({
    credentials: {
      accessKeyId: process.env.TW_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.TW_AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.TW_AWS_DEFAULT_REGION,
  })

  function get(ID) {
    return new Promise((resolve, reject) => {
      const start = +new Date()
      db.get(
        { TableName: process.env.TW_TABLE_NAME, Key: { ID } },
        (err, data) => {
          if (err) reject(err)
          console.log((+new Date() - start) / 1000)
          resolve(data)
        }
      )
    })
  }

  try {
    const { Item: initialContent } = await get(params.id)

    if (initialContent) {
      res.setHeader(
        'cache-control',
        'public, max-age=0, must-revalidate, s-maxage=60'
      )
    }

    return {
      props: initialContent
        ? { initialContent }
        : {
            errorCode: 404,
          },
    }
  } catch (error) {
    console.error(error)
    return {
      props: {
        errorCode: 500,
      },
    }
  }
}

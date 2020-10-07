export function put(item) {
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
      .then((response) => {
        return response.json()
      })
      .then(({ uuid }) => {
        resolve({
          ID: uuid,
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

export function get(Key) {
  return new Promise((resolve, reject) => {
    fetch(process.env.TW_API_URL + '/api/playgrounds/' + Key.ID)
      .then((response) => {
        return response.json()
      })
      .then((data) => {
        resolve({
          Item: { ...data, ID: data.uuid },
        })
      })
      .catch((err) => {
        console.log(err)
        reject(err)
      })
  })
}

export function get(Key) {
  return new Promise((resolve, reject) => {
    fetch(process.env.TW_API_URL + '/api/playgrounds/' + Key.ID)
      .then((response) => {
        return response.json()
      })
      .then((data) => {
        console.log(data)
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

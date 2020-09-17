import '../css/main.css'

if (typeof window !== 'undefined') {
  require('../workers/subworkers')
}

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}

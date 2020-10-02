import '../css/main.css'
import Head from 'next/head'

if (typeof window !== 'undefined') {
  require('../workers/subworkers')
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Tailwind Play</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}

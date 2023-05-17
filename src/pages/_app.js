import '../css/main.css'
import Head from 'next/head'

const URL = 'https://tailwind.skylightai.io'
const TITLE = 'Skylight AI ✨ Tailwind Playground'
const DESCRIPTION =
  "An advanced online playground for Tailwind CSS that lets you generate Tailwind CSS code using window.ai and show it directly in the browser."

if (typeof window !== 'undefined') {
  require('../workers/subworkers')
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#00b4b6" />
        <meta name="theme-color" content="#ffffff" />
        <title>{TITLE}</title>
        <meta content={DESCRIPTION} name="description" />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={TITLE} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content={`${URL}/social-card.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@tailwindlabs" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={`${URL}/social-card.jpg`} />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

import NextDocument, { Html, Head, Main, NextScript } from 'next/document'

export default class Document extends NextDocument {
  static async getInitialProps(ctx) {
    const initialProps = await NextDocument.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html lang="en" className="h-full">
        <Head />
        <body className="min-h-full grid">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

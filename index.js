import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import Head from 'next/head'

export default function Home({ content }) {
  return (
    <>
      <Head>
        <title>{content.hero_title}</title>
        <meta name="description" content={content.hero_text} />
      </Head>
      <main className="min-h-screen bg-[#f4f1ea] text-[#36454f] font-sans">
        <section className="py-24 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-brand text-[#4b0082] font-bold">
            {content.hero_title}
          </h1>
          <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto">
            {content.hero_text}
          </p>
        </section>
      </main>
    </>
  )
}

export async function getStaticProps() {
  const file = fs.readFileSync(path.join(process.cwd(), 'content/home.md'), 'utf-8')
  const { data } = matter(file)
  return {
    props: {
      content: data,
    },
  }
}

import { json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'

export async function GET({ url }) {
  const q = url.searchParams.get('q') ?? ''
  const page = url.searchParams.get('page') ?? '1'

  if (!q.trim()) return json([])

  if (!env.UNSPLASH_ACCESS_KEY) {
    return json({ error: 'Unsplash API key not configured.' }, { status: 503 })
  }

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&page=${page}&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` } }
  )

  if (!res.ok) return json([], { status: res.status })

  const data = await res.json()
  return json(
    data.results.map((p: any) => ({
      id: p.id,
      thumb: p.urls.small,
      full: p.urls.regular,
      author: p.user.name,
      authorUrl: `${p.user.links.html}?utm_source=vitein&utm_medium=referral`
    }))
  )
}

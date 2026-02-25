import { i18n } from '$lib/i18n'
import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'

const AVAILABLE_LANGS = ['de', 'en', 'es', 'fr', 'it']
const FALLBACK_LANG = 'en'
const LANG_COOKIE = 'paraglide_lang'

// Matches paths that already carry an explicit non-German language prefix
const HAS_LANG_PREFIX = /^\/(en|fr|es|it)(\/|$)/

function detectBrowserLanguage(acceptLanguage: string): string {
	if (!acceptLanguage) return FALLBACK_LANG

	const langs = acceptLanguage
		.split(',')
		.map((l) => {
			const [tag, q] = l.trim().split(';q=')
			return {
				tag: tag.split('-')[0].toLowerCase(),
				q: q !== undefined ? parseFloat(q) : 1
			}
		})
		.filter((l) => l.tag && !isNaN(l.q))
		.sort((a, b) => b.q - a.q)

	for (const { tag } of langs) {
		if (AVAILABLE_LANGS.includes(tag)) return tag
	}
	return FALLBACK_LANG
}

const autoLanguageDetect: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url

	// Skip API routes and SvelteKit internals
	if (pathname.startsWith('/api/') || pathname.startsWith('/_')) {
		return resolve(event)
	}

	// Only redirect when:
	// 1. No language cookie (user hasn't been here before)
	// 2. URL has no explicit language prefix (currently on the German/default path)
	const cookie = event.cookies.get(LANG_COOKIE)
	if (!cookie && !HAS_LANG_PREFIX.test(pathname)) {
		const detected = detectBrowserLanguage(
			event.request.headers.get('accept-language') ?? ''
		)

		if (detected !== 'de') {
			const newPathname = pathname === '/' ? `/${detected}/` : `/${detected}${pathname}`
			const redirectUrl = new URL(event.url)
			redirectUrl.pathname = newPathname

			return new Response(null, {
				status: 302,
				headers: {
					Location: redirectUrl.href,
					Vary: 'Accept-Language'
				}
			})
		}
	}

	return resolve(event)
}

export const handle = sequence(autoLanguageDetect, i18n.handle())

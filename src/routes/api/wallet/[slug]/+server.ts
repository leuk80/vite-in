import { error } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import { supabase } from '$lib/supabase'
import { buildWalletPass } from '$lib/pass-utils'

export async function GET({ params, url }) {
	const { APPLE_CERT_PEM, APPLE_KEY_PEM, APPLE_WWDR_PEM, APPLE_PASS_TYPE_ID, APPLE_TEAM_ID } = env

	if (!APPLE_CERT_PEM || !APPLE_KEY_PEM || !APPLE_WWDR_PEM || !APPLE_PASS_TYPE_ID || !APPLE_TEAM_ID) {
		throw error(503, 'Apple Wallet not configured')
	}

	const { data: event } = await supabase.from('events').select('*').eq('slug', params.slug).single()

	if (!event) {
		throw error(404, 'Event not found')
	}

	const name = url.searchParams.get('name')
	const status = url.searchParams.get('status')

	const buffer = buildWalletPass(event, name, status, {
		wwdr: APPLE_WWDR_PEM,
		signerCert: APPLE_CERT_PEM,
		signerKey: APPLE_KEY_PEM,
		passTypeIdentifier: APPLE_PASS_TYPE_ID,
		teamIdentifier: APPLE_TEAM_ID
	})

	const filename = !name ? `${event.slug}-organizer.pkpass` : `${event.slug}-ticket.pkpass`

	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.apple.pkpass',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-cache, no-store'
		}
	})
}

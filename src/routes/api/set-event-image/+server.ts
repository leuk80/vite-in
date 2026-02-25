import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'

export async function POST({ request }) {
  const { event_id, image_url } = await request.json()

  if (!event_id) {
    return json({ error: 'Missing event_id.' }, { status: 400 })
  }

  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabaseAdmin
    .from('events')
    .update({ image_url: image_url ?? null })
    .eq('id', event_id)

  if (error) return json({ error: error.message }, { status: 500 })

  return json({ ok: true })
}

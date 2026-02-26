import { json } from '@sveltejs/kit'
import { supabase } from '$lib/supabase'

export async function PATCH({ params, request }) {
  const { status, message } = await request.json()

  if (!['yes', 'maybe', 'no'].includes(status)) {
    return json({ error: 'Ungültiger Status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('rsvps')
    .update({ status, message: message ?? '' })
    .eq('id', params.rsvp_id)

  if (error) {
    return json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 })
  }

  return json({ success: true })
}

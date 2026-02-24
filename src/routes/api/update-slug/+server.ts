import { json } from '@sveltejs/kit'
import { supabase } from '$lib/supabase'

export async function POST({ request }) {
  const { event_id, new_slug } = await request.json()

  // Prüfen ob Slug bereits vergeben
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('slug', new_slug)
    .single()

  if (existing) {
    return json({ error: 'Dieser Link ist bereits vergeben.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('events')
    .update({ slug: new_slug })
    .eq('id', event_id)

  if (error) {
    return json({ error: 'Fehler beim Speichern.' }, { status: 500 })
  }

  return json({ success: true })
}
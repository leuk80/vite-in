import { json } from '@sveltejs/kit'
import { Resend } from 'resend'
import { RESEND_API_KEY } from '$env/static/private'
import { supabase } from '$lib/supabase'

const resend = new Resend(RESEND_API_KEY)

export async function POST({ request }) {
  const { event_id, name, status, message, email } = await request.json()

const { error } = await supabase.from('rsvps').insert({
  event_id,
  name,
  status,
  message,
  email
})

  if (error) {
    return json({ success: false }, { status: 500 })
  }

  // Event-Daten holen um Ersteller-Email zu finden
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', event_id)
    .single()

  if (event) {
    const statusText = status === 'yes' ? '✅ Zusage' : status === 'maybe' ? '🤔 Vielleicht' : '❌ Absage'

    await resend.emails.send({
      from: 'vite.in <onboarding@resend.dev>',
      to: event.creator_email,
      subject: `${statusText} von ${name} – ${event.title}`,
      html: `
        <h2>Neue Rückmeldung für "${event.title}"</h2>
        <p><strong>${name}</strong> hat ${statusText} gegeben.</p>
        ${message ? `<p>Nachricht: "${message}"</p>` : ''}
        <hr>
        <p><a href="https://vite.in/event/${event.slug}">Alle Rückmeldungen ansehen</a></p>
      `
    })
  }

  return json({ success: true })
}
import { json } from '@sveltejs/kit'
import { Resend } from 'resend'
import { RESEND_API_KEY } from '$env/static/private'
import { supabase } from '$lib/supabase'

const resend = new Resend(RESEND_API_KEY)

export async function POST({ request }) {
  const { event_id } = await request.json()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', event_id)
    .single()

  if (!event?.is_paid) {
    return json({ error: 'Nur für Premium Events.' }, { status: 403 })
  }

  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('*')
    .eq('event_id', event_id)
    .eq('status', 'yes')

  const withEmail = rsvps?.filter(r => r.email) || []

  console.log('rsvps found:', rsvps?.length)
console.log('with email:', withEmail.length)
console.log('withEmail data:', JSON.stringify(withEmail))

  if (withEmail.length === 0) {
    return json({ error: 'Keine Gäste mit E-Mail Adresse.' }, { status: 400 })
  }

  console.log('starting loop, count:', withEmail.length)

for (const rsvp of withEmail) {
    const result = await resend.emails.send({
      from: 'vite.in <invite@vite.in>',
      to: rsvp.email,
      subject: `Erinnerung: ${event.title}`,
      html: `
        <h2>Erinnerung: ${event.title}</h2>
        <p>Hallo ${rsvp.name},</p>
        <p>nur eine kurze Erinnerung – du hast zugesagt!</p>
        <p>📅 ${new Date(event.date).toLocaleString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        ${event.location ? `<p>📍 ${event.location}</p>` : ''}
        <p><a href="https://vite.in/event/${event.slug}">Zur Einladung</a></p>
      `
    })
    console.log('resend result:', JSON.stringify(result))
  }

  return json({ success: true, sent: withEmail.length })
}
import { json } from '@sveltejs/kit'
import { Resend } from 'resend'
import { RESEND_API_KEY } from '$env/static/private'
import { env } from '$env/dynamic/private'
import { supabase } from '$lib/supabase'
import { buildWalletPass, buildICS } from '$lib/pass-utils'

const resend = new Resend(RESEND_API_KEY)

export async function POST({ request }) {
  const { event_id, name, status, message, email } = await request.json()

  const { data: rsvp, error: insertError } = await supabase.from('rsvps').insert({
    event_id,
    name,
    status,
    message,
    email
  }).select('id').single()

  if (insertError) {
    return json({ success: false }, { status: 500 })
  }

  const rsvpId = rsvp?.id

  // Event-Daten holen um Ersteller-Email zu finden
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', event_id)
    .single()

  if (event) {
    const statusText = status === 'yes' ? '✅ Zusage' : status === 'maybe' ? '🤔 Vielleicht' : '❌ Absage'
    const statusLabel = status === 'yes' ? 'Zugesagt' : status === 'maybe' ? 'Vielleicht' : 'Abgesagt'

    // 1. Benachrichtigung an Event-Ersteller
    await resend.emails.send({
      from: 'vite.in <invite@vite.in>',
      to: event.creator_email,
      subject: `${statusText} von ${name} – ${event.title}`,
      html: `
        <h2>Neue Rückmeldung für "${event.title}"</h2>
        <p><strong>${name}</strong> hat ${statusText} gegeben.</p>
        ${message ? `<p>Nachricht: "${message}"</p>` : ''}
        <hr>
        <p><a href="https://vite.in/event/${event.slug}/host">Alle Rückmeldungen ansehen</a></p>
      `
    })

    // 2. Bestätigungs-E-Mail an den Gast (wenn E-Mail-Adresse angegeben)
    if (email) {
      const eventDate = new Date(event.date)
      const dateFormatted = eventDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      const timeFormatted = eventDate.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
      })

      const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = []

      // ICS-Datei immer anhängen
      const icsBuffer = buildICS(event)
      attachments.push({
        filename: `${event.slug}.ics`,
        content: icsBuffer,
        contentType: 'text/calendar'
      })

      // Apple Wallet Pass anhängen (nur wenn konfiguriert)
      const { APPLE_CERT_PEM, APPLE_KEY_PEM, APPLE_WWDR_PEM, APPLE_PASS_TYPE_ID, APPLE_TEAM_ID } = env
      const walletConfigured = !!(APPLE_CERT_PEM && APPLE_KEY_PEM && APPLE_WWDR_PEM && APPLE_PASS_TYPE_ID && APPLE_TEAM_ID)

      if (walletConfigured) {
        try {
          const pkpassBuffer = buildWalletPass(event, name, status, {
            wwdr: APPLE_WWDR_PEM!,
            signerCert: APPLE_CERT_PEM!,
            signerKey: APPLE_KEY_PEM!,
            passTypeIdentifier: APPLE_PASS_TYPE_ID!,
            teamIdentifier: APPLE_TEAM_ID!
          })
          attachments.push({
            filename: `${event.slug}-ticket.pkpass`,
            content: pkpassBuffer,
            contentType: 'application/vnd.apple.pkpass'
          })
        } catch {
          // Wallet-Generierung fehlgeschlagen – E-Mail trotzdem senden
        }
      }

      const attachmentNote = walletConfigured
        ? 'Im Anhang findest du eine Kalenderdatei (.ics) sowie dein Apple Wallet Ticket (.pkpass).'
        : 'Im Anhang findest du eine Kalenderdatei zum Speichern in deinem Kalender.'

      await resend.emails.send({
        from: 'vite.in <invite@vite.in>',
        to: email,
        subject: `Bestätigung: ${event.title}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:2rem;color:#222">
            <p style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:0.5rem">Deine Anmeldung</p>
            <h2 style="font-size:1.6rem;font-weight:800;letter-spacing:-0.5px;margin:0 0 0.4rem">${event.title}</h2>
            <p style="color:#666;margin:0 0 2rem">Status: <strong>${statusLabel}</strong></p>

            <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.9rem">
              <tr>
                <td style="color:#888;padding:0.5rem 1rem 0.5rem 0;width:80px;vertical-align:top">📅 Datum</td>
                <td style="padding:0.5rem 0;font-weight:500">${dateFormatted}, ${timeFormatted} Uhr</td>
              </tr>
              ${event.location ? `
              <tr>
                <td style="color:#888;padding:0.5rem 1rem 0.5rem 0;vertical-align:top">📍 Ort</td>
                <td style="padding:0.5rem 0;font-weight:500">${event.location}</td>
              </tr>` : ''}
              ${message ? `
              <tr>
                <td style="color:#888;padding:0.5rem 1rem 0.5rem 0;vertical-align:top">💬 Nachricht</td>
                <td style="padding:0.5rem 0;color:#555;font-style:italic">${message}</td>
              </tr>` : ''}
            </table>

            ${event.description ? `<p style="color:#555;font-size:0.9rem;line-height:1.6;margin-bottom:1.5rem;padding:1rem;background:#f9f9f9;border-radius:8px">${event.description}</p>` : ''}

            <p style="font-size:0.85rem;color:#888;margin-bottom:1.5rem">${attachmentNote}</p>

            <hr style="border:none;border-top:1px solid #f0f0f0;margin:1.5rem 0">
            <a href="https://vite.in/event/${event.slug}/confirm/${rsvpId}" style="display:inline-block;padding:0.6rem 1.2rem;background:#111;color:white;text-decoration:none;border-radius:6px;font-size:0.85rem;font-weight:500">Meine Anmeldung ansehen →</a>
            <p style="font-size:0.75rem;color:#bbb;margin-top:2rem">Erstellt mit <a href="https://vite.in" style="color:#bbb">vite.in</a></p>
          </div>
        `,
        attachments
      })
    }
  }

  return json({ success: true, rsvp_id: rsvpId })
}

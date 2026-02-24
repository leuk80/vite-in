<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'

  let event: any = null
  let notFound = false
  let name = ''
  let status = 'yes'
  let message = ''
  let loading = false
  let submitted = false
  let rsvps: any[] = []

  onMount(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('slug', $page.params.slug)
      .single()

    if (!data) { notFound = true; return }
    event = data

    const { data: rsvpData } = await supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', data.id)

    rsvps = rsvpData || []
  })

  function formatDate(d: string) {
    return new Date(d).toLocaleString('de-DE', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  function downloadICS() {
    const start = new Date(event.date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `LOCATION:${event.location || ''}`,
      `DESCRIPTION:${event.description || ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n')

    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title}.ics`
    a.click()
  }

  async function handleRSVP() {
    loading = true
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, name, status, message })
    })
    if (res.ok) {
      submitted = true
      rsvps = [...rsvps, { name, status, message }]
    }
    loading = false
  }

  let copied = false

async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copied = true
  setTimeout(() => copied = false, 2000)
}

function shareWhatsApp() {
  const text = `Du bist eingeladen: ${event.title} – ${window.location.href}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

let upgradeLoading = false

async function startUpgrade() {
  upgradeLoading = true
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: event.id, slug: event.slug })
  })
  const { url } = await res.json()
  window.location.href = url
}

</script>

{#if notFound}
  <main><p class="not-found">Einladung nicht gefunden.</p></main>
{:else if !event}
  <main><p class="loading">Lädt...</p></main>
{:else}
  <div class="page">
    <div class="card">
      <div class="card-header">
        <p class="label">Du bist eingeladen</p>
        <h1>{event.title}</h1>
      </div>

      <div class="card-body">
        <div class="meta-block">
          <div class="meta-row">
            <span class="meta-icon">📅</span>
            <span>{formatDate(event.date)}</span>
          </div>
          {#if event.location}
            <div class="meta-row">
              <span class="meta-icon">📍</span>
              <span>{event.location}</span>
            </div>
          {/if}
        </div>

        {#if event.description}
          <p class="description">{event.description}</p>
        {/if}

        <button class="calendar-btn" on:click={downloadICS}>
          📅 Zum Kalender hinzufügen
        </button>
      </div>

      <div class="share-row">
  <button class="share-btn whatsapp" on:click={shareWhatsApp}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.129 1.535 5.865L.057 23.272a.75.75 0 00.916.919l5.538-1.453A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.52-5.187-1.427l-.374-.22-3.862 1.013 1.04-3.742-.243-.389A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
    WhatsApp
  </button>
  <button class="share-btn copy" on:click={copyLink}>
    {copied ? '✅ Kopiert!' : '🔗 Link kopieren'}
  </button>
</div>

      <div class="divider"></div>

      <div class="rsvp-section">
        {#if submitted}
          <div class="success">
            <span class="success-icon">🎉</span>
            <p>Danke für deine Rückmeldung!</p>
          </div>
        {:else}
          <h2>Kannst du kommen?</h2>
          <form on:submit|preventDefault={handleRSVP}>
            <label>
              Dein Name
              <input type="text" bind:value={name} required placeholder="Max Mustermann" />
            </label>

            <div class="status-buttons">
              <button type="button" class:active={status === 'yes'} on:click={() => status = 'yes'}>
                <span>✅</span> Ja
              </button>
              <button type="button" class:active={status === 'maybe'} on:click={() => status = 'maybe'}>
                <span>🤔</span> Vielleicht
              </button>
              <button type="button" class:active={status === 'no'} on:click={() => status = 'no'}>
                <span>❌</span> Nein
              </button>
            </div>

            <label>
              Nachricht <span class="optional">(optional)</span>
              <textarea bind:value={message} placeholder="Ich freue mich!"></textarea>
            </label>

            <button type="submit" class="submit-btn" disabled={loading}>
              {loading ? 'Wird gesendet...' : 'Rückmeldung senden →'}
            </button>
          </form>
        {/if}
      </div>

      {#if rsvps.length > 0}
        <div class="divider"></div>
        <div class="rsvp-list">
          <h3>Rückmeldungen <span class="count">{rsvps.length}</span></h3>
          {#each rsvps as rsvp}
            <div class="rsvp-item">
              <span class="rsvp-status">{rsvp.status === 'yes' ? '✅' : rsvp.status === 'maybe' ? '🤔' : '❌'}</span>
              <div>
                <span class="rsvp-name">{rsvp.name}</span>
                {#if rsvp.message}<p class="rsvp-message">{rsvp.message}</p>{/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}


      {#if !event.is_paid}
  <div class="upgrade-banner">
    <div>
      <p class="upgrade-title">✨ Premium – einmalig 5€</p>
      <p class="upgrade-text">Eigener Link, kein Branding, E-Mail Erinnerung</p>
    </div>
    <button class="upgrade-btn" on:click={startUpgrade} disabled={upgradeLoading}>
      {upgradeLoading ? '...' : 'Upgrade'}
    </button>
  </div>
{/if}

      <div class="card-footer">
        <a href="/">Erstellt mit vite.in</a>
      </div>
    </div>
  </div>
{/if}

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .page {
    min-height: 100vh;
    background: #f5f5f3;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2rem 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .card {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.06);
    overflow: hidden;
  }

  .card-header {
    padding: 2.5rem 2rem 2rem;
    background: #111;
    color: white;
  }
  .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #999;
    margin-bottom: 0.6rem;
  }
  .card-header h1 {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1.2;
  }

  .card-body { padding: 2rem; }

  .meta-block {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 1.5rem;
  }
  .meta-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.95rem;
    color: #444;
  }
  .meta-icon { font-size: 1rem; }

  .description {
    font-size: 0.95rem;
    line-height: 1.7;
    color: #555;
    margin-bottom: 1.5rem;
  }

  .calendar-btn {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    color: #444;
    transition: border-color 0.15s;
  }
  .calendar-btn:hover { border-color: #111; color: #111; }

  .divider { border-top: 1px solid #f0f0f0; }

  .rsvp-section { padding: 2rem; }
  .rsvp-section h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }

  form { display: flex; flex-direction: column; gap: 1.2rem; }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: #333;
  }
  .optional { font-weight: 400; color: #999; }
  input, textarea {
    padding: 0.65rem 0.8rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 0.95rem;
    transition: border-color 0.15s;
    font-family: inherit;
  }
  input:focus, textarea:focus {
    outline: none;
    border-color: #111;
  }
  textarea { min-height: 80px; resize: vertical; }

  .status-buttons { display: flex; gap: 0.5rem; }
  .status-buttons button {
    flex: 1;
    padding: 0.65rem 0.4rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 0.85rem;
    color: #444;
    transition: all 0.15s;
    font-family: inherit;
  }
  .status-buttons button.active {
    border-color: #111;
    background: #111;
    color: white;
  }

  .submit-btn {
    padding: 0.85rem;
    background: #111;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .submit-btn:hover { background: #333; }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .success {
    text-align: center;
    padding: 2rem 0;
  }
  .success-icon { font-size: 2.5rem; display: block; margin-bottom: 0.8rem; }
  .success p { font-size: 1rem; color: #444; }

  .rsvp-list { padding: 2rem; }
  .rsvp-list h3 {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #333;
  }
  .count {
    display: inline-block;
    background: #f0f0f0;
    color: #666;
    font-size: 0.75rem;
    padding: 0.1rem 0.5rem;
    border-radius: 10px;
    margin-left: 0.3rem;
  }
  .rsvp-item {
    display: flex;
    gap: 0.8rem;
    padding: 0.7rem 0;
    border-bottom: 1px solid #f5f5f5;
    align-items: flex-start;
  }
  .rsvp-status { font-size: 1rem; margin-top: 0.1rem; }
  .rsvp-name { font-size: 0.9rem; font-weight: 500; }
  .rsvp-message { font-size: 0.85rem; color: #888; margin-top: 0.2rem; }

  .card-footer {
    padding: 1.2rem 2rem;
    border-top: 1px solid #f0f0f0;
    text-align: center;
  }
  .card-footer a {
    font-size: 0.8rem;
    color: #bbb;
    text-decoration: none;
  }
  .card-footer a:hover { color: #888; }

  .not-found, .loading {
    text-align: center;
    padding: 4rem;
    color: #888;
    font-family: sans-serif;
  }

  .share-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.2rem;
}
.share-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid #e0e0e0;
  background: white;
  color: #444;
  transition: all 0.15s;
}
.share-btn:hover { border-color: #111; color: #111; }
.share-btn.whatsapp:hover { border-color: #25D366; color: #25D366; }

.upgrade-banner {
  margin: 0 2rem 1.5rem;
  padding: 1rem 1.2rem;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.upgrade-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.2rem; }
.upgrade-text { font-size: 0.8rem; color: #888; }
.upgrade-btn {
  padding: 0.5rem 1.2rem;
  background: #111;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}
.upgrade-btn:hover { background: #333; }

</style>
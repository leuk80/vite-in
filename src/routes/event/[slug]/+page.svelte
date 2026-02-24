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

async function handleRSVP() {
  loading = true

  const res = await fetch('/api/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: event.id,
      name,
      status,
      message
    })
  })

  if (res.ok) {
    submitted = true
    rsvps = [...rsvps, { name, status, message }]
  }

  loading = false
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
</script>

{#if notFound}
  <main><p>Einladung nicht gefunden.</p></main>
{:else if !event}
  <main><p>Lädt...</p></main>
{:else}
  <main>
    <h1>{event.title}</h1>
    <p class="meta">📅 {formatDate(event.date)}</p>
    {#if event.location}
      <p class="meta">📍 {event.location}</p>
    {/if}
    {#if event.description}
      <p class="description">{event.description}</p>
    {/if}
    <button class="calendar-btn" on:click={downloadICS}>
      📅 Zum Kalender hinzufügen
    </button>
    <div class="divider"></div>

    {#if submitted}
      <p class="success">✅ Danke für deine Rückmeldung!</p>
    {:else}
      <h2>Kannst du kommen?</h2>
      <form on:submit|preventDefault={handleRSVP}>
        <label>
          Dein Name *
          <input type="text" bind:value={name} required placeholder="Max Mustermann" />
        </label>

        <label>Zusage</label>
        <div class="status-buttons">
          <button type="button" class:active={status === 'yes'} on:click={() => status = 'yes'}>✅ Ja</button>
          <button type="button" class:active={status === 'maybe'} on:click={() => status = 'maybe'}>🤔 Vielleicht</button>
          <button type="button" class:active={status === 'no'} on:click={() => status = 'no'}>❌ Nein</button>
        </div>

        <label>
          Nachricht (optional)
          <textarea bind:value={message} placeholder="Ich freue mich!"></textarea>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Wird gesendet...' : 'Rückmeldung senden →'}
        </button>
      </form>
    {/if}

    {#if rsvps.length > 0}
      <div class="divider"></div>
      <h2>Rückmeldungen ({rsvps.length})</h2>
      {#each rsvps as rsvp}
        <div class="rsvp-item">
          <span>{rsvp.status === 'yes' ? '✅' : rsvp.status === 'maybe' ? '🤔' : '❌'} {rsvp.name}</span>
          {#if rsvp.message}<p class="rsvp-message">{rsvp.message}</p>{/if}
        </div>
      {/each}
    {/if}
  </main>
{/if}

<style>
  main {
    max-width: 480px;
    margin: 4rem auto;
    padding: 0 1rem;
    font-family: sans-serif;
  }
  h1 { font-size: 2rem; margin-bottom: 1rem; }
  h2 { font-size: 1.2rem; margin-bottom: 1rem; }
  .meta { color: #555; margin: 0.4rem 0; }
  .description { margin-top: 1.5rem; line-height: 1.6; }
  .divider { border-top: 1px solid #eee; margin: 2rem 0; }
  form { display: flex; flex-direction: column; gap: 1.2rem; }
  label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; }
  input, textarea {
    padding: 0.6rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
  }
  textarea { min-height: 80px; }
  .status-buttons { display: flex; gap: 0.5rem; }
  .status-buttons button {
    flex: 1;
    padding: 0.6rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .status-buttons button.active {
    border-color: black;
    background: black;
    color: white;
  }
  button[type="submit"] {
    padding: 0.8rem;
    background: black;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
  }
  button[type="submit"]:disabled { opacity: 0.5; }
  .success { color: green; font-size: 1.1rem; }
  .rsvp-item { padding: 0.6rem 0; border-bottom: 1px solid #f0f0f0; }
  .rsvp-message { color: #666; font-size: 0.9rem; margin: 0.2rem 0 0 1.5rem; }

  .calendar-btn {
  margin-top: 1rem;
  padding: 0.6rem 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
.calendar-btn:hover { border-color: black; }
</style>
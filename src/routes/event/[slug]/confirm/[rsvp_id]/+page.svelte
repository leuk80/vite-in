<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import { languageTag } from '$lib/paraglide/runtime'

  let event: any = null
  let rsvp: any = null
  let notFound = false

  let editing = false
  let editStatus = ''
  let editMessage = ''
  let saving = false
  let saveError = ''
  let saveSuccess = false

  onMount(async () => {
    const { data: rsvpData } = await supabase
      .from('rsvps')
      .select('*')
      .eq('id', $page.params.rsvp_id)
      .single()

    if (!rsvpData) { notFound = true; return }
    rsvp = rsvpData

    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', rsvpData.event_id)
      .single()

    if (!eventData || eventData.slug !== $page.params.slug) { notFound = true; return }
    event = eventData
  })

  function formatDate(d: string) {
    return new Date(d).toLocaleString(languageTag(), {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  function downloadICS() {
    const start = new Date(event.date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `SUMMARY:${event.title}`, `DTSTART:${start}`, `DTEND:${end}`,
      `LOCATION:${event.location || ''}`, `DESCRIPTION:${event.description || ''}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title}.ics`
    a.click()
  }

  function startEditing() {
    editStatus = rsvp.status
    editMessage = rsvp.message ?? ''
    saveError = ''
    saveSuccess = false
    editing = true
  }

  function cancelEditing() {
    editing = false
    saveError = ''
  }

  async function saveChanges() {
    saving = true
    saveError = ''
    const res = await fetch(`/api/rsvp/${rsvp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: editStatus, message: editMessage })
    })
    const data = await res.json()
    if (!res.ok) {
      saveError = data.error ?? 'Fehler beim Speichern.'
      saving = false
      return
    }
    rsvp = { ...rsvp, status: editStatus, message: editMessage }
    saveSuccess = true
    saving = false
    setTimeout(() => {
      saveSuccess = false
      editing = false
    }, 1200)
  }

  $: statusLabel = rsvp?.status === 'yes' ? 'Zugesagt' : rsvp?.status === 'maybe' ? 'Vielleicht' : 'Abgesagt'
  $: statusIcon  = rsvp?.status === 'yes' ? '✅' : rsvp?.status === 'maybe' ? '🤔' : '❌'
</script>

{#if notFound}
  <div class="page"><p class="not-found">Anmeldung nicht gefunden.</p></div>
{:else if !event || !rsvp}
  <div class="page"><p class="not-found">Lädt...</p></div>
{:else}
  <div class="page">
    <div class="card">

      <!-- Event Header -->
      <div
        class="card-header"
        class:card-header-image={!!event.image_url}
        style={event.image_url
          ? `background: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url('${event.image_url}') center/cover no-repeat`
          : ''}
      >
        <p class="label">Deine Anmeldung</p>
        <h1>{event.title}</h1>
      </div>

      {#if editing}
        <!-- ── Edit mode ── -->
        <div class="edit-section">
          <p class="edit-heading">Anmeldung bearbeiten</p>

          <div class="field-label">Teilnahme</div>
          <div class="status-buttons">
            <button
              type="button"
              class:active={editStatus === 'yes'}
              class:btn-yes={editStatus === 'yes'}
              on:click={() => editStatus = 'yes'}
            >✅ Ja</button>
            <button
              type="button"
              class:active={editStatus === 'maybe'}
              class:btn-maybe={editStatus === 'maybe'}
              on:click={() => editStatus = 'maybe'}
            >🤔 Vielleicht</button>
            <button
              type="button"
              class:active={editStatus === 'no'}
              class:btn-no={editStatus === 'no'}
              on:click={() => editStatus = 'no'}
            >❌ Nein</button>
          </div>

          <div class="field-label" style="margin-top:1rem">Nachricht <span class="optional">(optional)</span></div>
          <textarea
            bind:value={editMessage}
            placeholder="Deine Nachricht an den Gastgeber..."
            rows="3"
          ></textarea>

          {#if saveError}
            <p class="error-text">{saveError}</p>
          {/if}

          <div class="edit-actions">
            <button class="btn-cancel" on:click={cancelEditing} disabled={saving}>Abbrechen</button>
            <button class="btn-save" on:click={saveChanges} disabled={saving}>
              {#if saveSuccess}✅ Gespeichert{:else if saving}Speichern...{:else}Speichern →{/if}
            </button>
          </div>
        </div>

      {:else}
        <!-- ── View mode ── -->
        <div class="status-section">
          <div
            class="status-pill"
            class:pill-yes={rsvp.status === 'yes'}
            class:pill-maybe={rsvp.status === 'maybe'}
            class:pill-no={rsvp.status === 'no'}
          >
            <span>{statusIcon}</span>
            <span>{statusLabel}</span>
          </div>
          <p class="guest-name">{rsvp.name}</p>
        </div>

        <div class="divider"></div>

        <div class="details-section">
          <div class="detail-row">
            <span class="detail-icon">📅</span>
            <div>
              <p class="detail-label">Datum & Uhrzeit</p>
              <p class="detail-value">{formatDate(event.date)}</p>
            </div>
          </div>
          {#if event.location}
            <div class="detail-row">
              <span class="detail-icon">📍</span>
              <div>
                <p class="detail-label">Ort</p>
                <p class="detail-value">{event.location}</p>
              </div>
            </div>
          {/if}
          {#if rsvp.message}
            <div class="detail-row">
              <span class="detail-icon">💬</span>
              <div>
                <p class="detail-label">Deine Nachricht</p>
                <p class="detail-value detail-message">"{rsvp.message}"</p>
              </div>
            </div>
          {/if}
          {#if event.description}
            <p class="event-description">{event.description}</p>
          {/if}
        </div>

        <div class="divider"></div>

        <div class="actions-section">
          <button class="calendar-btn" on:click={downloadICS}>📅 Zum Kalender hinzufügen</button>
          <button class="edit-btn" on:click={startEditing}>✏️ Anmeldung bearbeiten</button>
          <a class="back-link" href="/event/{event.slug}">Zur Einladungsseite →</a>
        </div>
      {/if}

      {#if !event.is_paid}
        <div class="card-footer">
          <a href="/">Erstellt mit vite.in</a>
        </div>
      {/if}

    </div>
  </div>
{/if}

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .page { min-height: 100vh; background: #f5f5f3; display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .card { background: white; border-radius: 16px; width: 100%; max-width: 420px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; }

  /* Header */
  .card-header { padding: 2.5rem 2rem 2rem; background: #111; color: white; }
  .card-header-image { padding: 3.5rem 2rem 2rem; }
  .label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.55); margin-bottom: 0.5rem; }
  .card-header h1 { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2; }

  /* View: status */
  .status-section { padding: 1.8rem 2rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; }
  .status-pill { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1.2rem; border-radius: 999px; font-size: 1rem; font-weight: 600; }
  .pill-yes { background: #dcfce7; color: #16a34a; }
  .pill-maybe { background: #fef9c3; color: #a16207; }
  .pill-no { background: #fee2e2; color: #dc2626; }
  .guest-name { font-size: 1.3rem; font-weight: 700; color: #111; letter-spacing: -0.3px; }

  .divider { border-top: 1px solid #f0f0f0; }

  /* View: details */
  .details-section { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.1rem; }
  .detail-row { display: flex; align-items: flex-start; gap: 0.8rem; }
  .detail-icon { font-size: 1.1rem; margin-top: 0.1rem; flex-shrink: 0; }
  .detail-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.8px; color: #aaa; margin-bottom: 0.2rem; }
  .detail-value { font-size: 0.95rem; color: #222; font-weight: 500; }
  .detail-message { font-style: italic; color: #666; font-weight: 400; }
  .event-description { font-size: 0.9rem; color: #666; line-height: 1.6; padding: 1rem; background: #f9f9f9; border-radius: 8px; }

  /* View: actions */
  .actions-section { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 0.7rem; }
  .calendar-btn { width: 100%; padding: 0.75rem 1rem; background: #111; color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: background 0.15s; }
  .calendar-btn:hover { background: #333; }
  .edit-btn { width: 100%; padding: 0.72rem 1rem; background: white; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; cursor: pointer; font-family: inherit; color: #444; transition: all 0.15s; }
  .edit-btn:hover { border-color: #111; color: #111; }
  .back-link { display: block; text-align: center; font-size: 0.85rem; color: #bbb; text-decoration: none; margin-top: 0.2rem; }
  .back-link:hover { color: #666; }

  /* Edit mode */
  .edit-section { padding: 1.8rem 2rem; display: flex; flex-direction: column; gap: 0; }
  .edit-heading { font-size: 1rem; font-weight: 700; color: #111; margin-bottom: 1.4rem; }
  .field-label { font-size: 0.78rem; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 0.5rem; }
  .optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #bbb; }

  .status-buttons { display: flex; gap: 0.5rem; }
  .status-buttons button { flex: 1; padding: 0.6rem 0.3rem; border: 1.5px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; font-size: 0.85rem; color: #555; transition: all 0.15s; font-family: inherit; }
  .status-buttons button.active { font-weight: 600; }
  .btn-yes { border-color: #16a34a !important; background: #dcfce7 !important; color: #15803d !important; }
  .btn-maybe { border-color: #d97706 !important; background: #fef9c3 !important; color: #a16207 !important; }
  .btn-no { border-color: #dc2626 !important; background: #fee2e2 !important; color: #b91c1c !important; }

  textarea { width: 100%; padding: 0.65rem 0.8rem; border: 1.5px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem; font-family: inherit; resize: vertical; transition: border-color 0.15s; }
  textarea:focus { outline: none; border-color: #111; }

  .error-text { font-size: 0.85rem; color: #dc2626; margin-top: 0.8rem; }

  .edit-actions { display: flex; gap: 0.5rem; margin-top: 1.4rem; }
  .btn-cancel { flex: 1; padding: 0.72rem; background: white; border: 1.5px solid #e0e0e0; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-family: inherit; color: #555; transition: all 0.15s; }
  .btn-cancel:hover:not(:disabled) { border-color: #999; color: #333; }
  .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-save { flex: 2; padding: 0.72rem; background: #111; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-weight: 500; font-family: inherit; transition: background 0.15s; }
  .btn-save:hover:not(:disabled) { background: #333; }
  .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Footer */
  .card-footer { padding: 1.2rem 2rem; border-top: 1px solid #f0f0f0; text-align: center; }
  .card-footer a { font-size: 0.8rem; color: #bbb; text-decoration: none; }
  .card-footer a:hover { color: #888; }
  .not-found { color: #888; font-size: 1rem; margin-top: 4rem; }
</style>

<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import * as m from '$lib/paraglide/messages'
  import { languageTag } from '$lib/paraglide/runtime'
  import { i18n } from '$lib/i18n'

  let event: any = null
  let notFound = false
  let name = ''
  let status = 'yes'
  let message = ''
  let loading = false
  let submitted = false
  let rsvps: any[] = []
  let rsvpEmail = ''
  let copied = false
  let upgradeLoading = false
  let showSlugModal = false
  let newSlug = ''
  let slugError = ''
  let slugLoading = false
  let slugSuccess = false
  let remindLoading = false
  let remindSent = false
  let remindError = ''

  // Image feature
  let showImageModal = false
  let imageTab: 'upload' | 'unsplash' = 'upload'
  let imageFiles: FileList | undefined = undefined
  let imageUploading = false
  let imageSaved = false
  let unsplashQuery = ''
  let imageSearching = false
  let unsplashResults: Array<{ id: string; thumb: string; full: string; author: string; authorUrl: string }> = []
  let selectedPhoto: { id: string; thumb: string; full: string; author: string; authorUrl: string } | null = null

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

    if (typeof window !== 'undefined' && window.location.search.includes('upgraded=true')) {
      showSlugModal = true
      window.history.replaceState({}, '', window.location.pathname)
    }
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

  async function handleRSVP() {
    loading = true
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, name, status, message, email: rsvpEmail })
    })
    if (res.ok) {
      submitted = true
      rsvps = [...rsvps, { name, status, message }]
    }
    loading = false
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    copied = true
    setTimeout(() => copied = false, 2000)
  }

  function shareWhatsApp() {
    const text = `${event.title} – ${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function startUpgrade() {
    upgradeLoading = true
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, slug: event.slug, lang: languageTag() })
    })
    const { url } = await res.json()
    window.location.href = url
  }

  async function updateSlug() {
    slugLoading = true
    slugError = ''
    if (!/^[a-z0-9-]+$/.test(newSlug)) {
      slugError = 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt.'
      slugLoading = false
      return
    }
    const res = await fetch('/api/update-slug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, new_slug: newSlug })
    })
    const data = await res.json()
    if (data.error) {
      slugError = data.error
      slugLoading = false
      return
    }
    slugSuccess = true
    setTimeout(() => { window.location.href = i18n.resolveRoute(`/event/${newSlug}`, languageTag()) }, 1500)
  }

  async function sendReminder() {
    remindLoading = true
    remindError = ''
    const res = await fetch('/api/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id })
    })
    const data = await res.json()
    if (data.error) { remindError = data.error } else { remindSent = true }
    remindLoading = false
  }

  // --- Image feature ---

  function openImageModal() {
    imageTab = 'upload'
    imageFiles = undefined
    imageSaved = false
    unsplashResults = []
    selectedPhoto = null
    unsplashQuery = ''
    showImageModal = true
  }

  async function uploadImage() {
    if (!imageFiles?.length) return
    imageUploading = true
    imageSaved = false

    const formData = new FormData()
    formData.append('file', imageFiles[0])
    formData.append('event_id', event.id)

    const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
    const data = await res.json()

    if (data.url) {
      event = { ...event, image_url: data.url }
      imageSaved = true
      setTimeout(() => { imageSaved = false; showImageModal = false }, 1500)
    }
    imageUploading = false
  }

  async function searchUnsplash() {
    if (!unsplashQuery.trim()) return
    imageSearching = true
    unsplashResults = []
    selectedPhoto = null

    const res = await fetch(`/api/unsplash?q=${encodeURIComponent(unsplashQuery)}`)
    unsplashResults = await res.json()
    imageSearching = false
  }

  async function saveUnsplashImage() {
    if (!selectedPhoto) return
    imageUploading = true
    imageSaved = false

    const res = await fetch('/api/set-event-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, image_url: selectedPhoto.full })
    })

    if (res.ok) {
      event = { ...event, image_url: selectedPhoto.full }
      imageSaved = true
      setTimeout(() => { imageSaved = false; showImageModal = false }, 1500)
    }
    imageUploading = false
  }

  async function removeImage() {
    const res = await fetch('/api/set-event-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: event.id, image_url: null })
    })
    if (res.ok) {
      event = { ...event, image_url: null }
      showImageModal = false
    }
  }
</script>

{#if notFound}
  <main><p class="not-found">{m.not_found()}</p></main>
{:else if !event}
  <main><p class="loading">{m.loading()}</p></main>
{:else}
  {#if showSlugModal}
    <div class="modal-overlay">
      <div class="modal">
        <h2>🎉 Upgrade erfolgreich!</h2>
        <p>Wähle deinen persönlichen Link:</p>
        <div class="slug-input-row">
          <span class="slug-prefix">vite.in/event/</span>
          <input type="text" bind:value={newSlug} placeholder="julias-party" disabled={slugLoading || slugSuccess} />
        </div>
        {#if slugError}<p class="slug-error">{slugError}</p>{/if}
        {#if slugSuccess}
          <p class="slug-success">✅ Link gespeichert! Weiterleitung...</p>
        {:else}
          <div class="modal-buttons">
            <button class="modal-skip" on:click={() => showSlugModal = false}>Überspringen</button>
            <button class="modal-save" on:click={updateSlug} disabled={slugLoading || !newSlug}>
              {slugLoading ? '...' : 'Speichern →'}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if showImageModal}
    <div class="modal-overlay" on:click|self={() => showImageModal = false}>
      <div class="modal image-modal">
        <h2>🖼️ {m.image_btn()}</h2>

        <div class="tab-bar">
          <button
            type="button"
            class="tab-btn"
            class:tab-active={imageTab === 'upload'}
            on:click={() => imageTab = 'upload'}
          >{m.image_tab_upload()}</button>
          <button
            type="button"
            class="tab-btn"
            class:tab-active={imageTab === 'unsplash'}
            on:click={() => imageTab = 'unsplash'}
          >{m.image_tab_unsplash()}</button>
        </div>

        {#if imageTab === 'upload'}
          <div class="tab-content">
            <label class="file-label">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                bind:files={imageFiles}
                class="file-input"
              />
              <span class="file-btn">📁 Datei auswählen</span>
              {#if imageFiles?.length}
                <span class="file-name">{imageFiles[0].name}</span>
              {/if}
            </label>
            {#if imageSaved}
              <p class="img-success">✅ {m.image_saved()}</p>
            {:else}
              <button
                class="modal-save"
                on:click={uploadImage}
                disabled={!imageFiles?.length || imageUploading}
              >
                {imageUploading ? m.image_uploading() : m.image_save()}
              </button>
            {/if}
          </div>

        {:else}
          <div class="tab-content">
            <div class="search-row">
              <input
                type="text"
                bind:value={unsplashQuery}
                placeholder={m.image_unsplash_placeholder()}
                on:keydown={(e) => e.key === 'Enter' && searchUnsplash()}
              />
              <button type="button" class="search-btn" on:click={searchUnsplash} disabled={imageSearching}>
                {imageSearching ? m.image_searching() : m.image_search()}
              </button>
            </div>

            {#if unsplashResults.length > 0}
              <div class="photo-grid">
                {#each unsplashResults as photo}
                  <button
                    type="button"
                    class="photo-item"
                    class:photo-selected={selectedPhoto?.id === photo.id}
                    on:click={() => selectedPhoto = photo}
                  >
                    <img src={photo.thumb} alt={photo.author} loading="lazy" />
                  </button>
                {/each}
              </div>

              {#if selectedPhoto}
                <p class="photo-credit">
                  Foto von <a href={selectedPhoto.authorUrl} target="_blank" rel="noopener">{selectedPhoto.author}</a> auf Unsplash
                </p>
              {/if}

              {#if imageSaved}
                <p class="img-success">✅ {m.image_saved()}</p>
              {:else}
                <button
                  class="modal-save"
                  on:click={saveUnsplashImage}
                  disabled={!selectedPhoto || imageUploading}
                >
                  {imageUploading ? m.image_uploading() : m.image_save()}
                </button>
              {/if}
            {/if}
          </div>
        {/if}

        <div class="modal-buttons modal-buttons-image">
          {#if event.image_url}
            <button type="button" class="modal-remove" on:click={removeImage}>
              {m.image_remove()}
            </button>
          {/if}
          <button type="button" class="modal-skip" on:click={() => showImageModal = false}>
            {m.image_close()}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="page">
    <div class="card">
      <div
        class="card-header"
        class:card-header-image={!!event.image_url}
        style={event.image_url
          ? `background: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url('${event.image_url}') center/cover no-repeat`
          : ''}
      >
        <p class="label">{m.invited()}</p>
        <h1>{event.title}</h1>
        {#if event.image_url && event.image_url.includes('unsplash.com')}
          <p class="header-credit">Photo: Unsplash</p>
        {/if}
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
        <button class="calendar-btn" on:click={downloadICS}>📅 {m.add_to_calendar()}</button>
        <div class="share-row">
          <button class="share-btn whatsapp" on:click={shareWhatsApp}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.129 1.535 5.865L.057 23.272a.75.75 0 00.916.919l5.538-1.453A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.667-.52-5.187-1.427l-.374-.22-3.862 1.013 1.04-3.742-.243-.389A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            {m.share_whatsapp()}
          </button>
          <button class="share-btn copy" on:click={copyLink}>
            {copied ? m.copied() : `🔗 ${m.copy_link()}`}
          </button>
        </div>
      </div>

      <div class="divider"></div>

      <div class="rsvp-section">
        {#if submitted}
          <div class="success">
            <span class="success-icon">🎉</span>
            <p>{m.thank_you()}</p>
          </div>
        {:else}
          <h2>{m.can_you_come()}</h2>
          <form on:submit|preventDefault={handleRSVP}>
            <label>
              {m.your_name()}
              <input type="text" bind:value={name} required placeholder="Max Mustermann" />
            </label>
            <div class="status-buttons">
              <button type="button" class:active={status === 'yes'} on:click={() => status = 'yes'}>✅ {m.yes()}</button>
              <button type="button" class:active={status === 'maybe'} on:click={() => status = 'maybe'}>🤔 {m.maybe()}</button>
              <button type="button" class:active={status === 'no'} on:click={() => status = 'no'}>❌ {m.no()}</button>
            </div>
            <label>
              {m.email_for_reminders()}
              <input type="email" bind:value={rsvpEmail} placeholder="du@beispiel.de" />
            </label>
            <label>
              {m.message_optional()}
              <textarea bind:value={message} placeholder="Ich freue mich!"></textarea>
            </label>
            <button type="submit" class="submit-btn" disabled={loading}>
              {loading ? m.sending() : m.send_rsvp()}
            </button>
          </form>
        {/if}
      </div>

      {#if rsvps.length > 0}
        <div class="divider"></div>
        <div class="rsvp-list">
          <h3>{m.responses()} <span class="count">{rsvps.length}</span></h3>
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
            <p class="upgrade-title">✨ {m.upgrade_title()}</p>
            <p class="upgrade-text">{m.upgrade_text()}</p>
          </div>
          <button class="upgrade-btn" on:click={startUpgrade} disabled={upgradeLoading}>
            {upgradeLoading ? '...' : m.upgrade_btn()}
          </button>
        </div>
      {/if}

      {#if event.is_paid}
        <div class="remind-section">
          <button class="remind-btn" on:click={sendReminder} disabled={remindLoading || remindSent}>
            {#if remindSent}✅ {m.remind_sent()}
            {:else if remindLoading}{m.remind_sending()}
            {:else}🔔 {m.remind_btn()}{/if}
          </button>
          {#if remindError}<p class="remind-error">{remindError}</p>{/if}
        </div>

        <div class="image-section">
          <button class="image-edit-btn" on:click={openImageModal}>
            🖼️ {m.image_btn()}
          </button>
        </div>
      {/if}

      {#if !event.is_paid}
        <div class="card-footer">
          <a href="/">{m.created_with()}</a>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .page { min-height: 100vh; background: #f5f5f3; display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .card { background: white; border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; }
  .card-header { padding: 2.5rem 2rem 2rem; background: #111; color: white; transition: padding 0.2s; }
  .card-header-image { padding: 3.5rem 2rem 2rem; }
  .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; color: #999; margin-bottom: 0.6rem; }
  .card-header-image .label { color: rgba(255,255,255,0.7); }
  .card-header h1 { font-size: 2rem; font-weight: 800; letter-spacing: -1px; line-height: 1.2; }
  .header-credit { font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 0.8rem; }
  .card-body { padding: 2rem; }
  .meta-block { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
  .meta-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; color: #444; }
  .meta-icon { font-size: 1rem; }
  .description { font-size: 0.95rem; line-height: 1.7; color: #555; margin-bottom: 1.5rem; }
  .calendar-btn { padding: 0.5rem 1rem; background: white; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #444; transition: border-color 0.15s; }
  .calendar-btn:hover { border-color: #111; color: #111; }
  .divider { border-top: 1px solid #f0f0f0; }
  .rsvp-section { padding: 2rem; }
  .rsvp-section h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1.5rem; }
  form { display: flex; flex-direction: column; gap: 1.2rem; }
  label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.85rem; font-weight: 500; color: #333; }
  input, textarea { padding: 0.65rem 0.8rem; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem; transition: border-color 0.15s; font-family: inherit; }
  input:focus, textarea:focus { outline: none; border-color: #111; }
  textarea { min-height: 80px; resize: vertical; }
  .status-buttons { display: flex; gap: 0.5rem; }
  .status-buttons button { flex: 1; padding: 0.65rem 0.4rem; border: 1px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; font-size: 0.85rem; color: #444; transition: all 0.15s; font-family: inherit; }
  .status-buttons button.active { border-color: #111; background: #111; color: white; }
  .submit-btn { padding: 0.85rem; background: #111; color: white; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 500; cursor: pointer; font-family: inherit; transition: background 0.15s; }
  .submit-btn:hover { background: #333; }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .success { text-align: center; padding: 2rem 0; }
  .success-icon { font-size: 2.5rem; display: block; margin-bottom: 0.8rem; }
  .success p { font-size: 1rem; color: #444; }
  .rsvp-list { padding: 2rem; }
  .rsvp-list h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; color: #333; }
  .count { display: inline-block; background: #f0f0f0; color: #666; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 10px; margin-left: 0.3rem; }
  .rsvp-item { display: flex; gap: 0.8rem; padding: 0.7rem 0; border-bottom: 1px solid #f5f5f5; align-items: flex-start; }
  .rsvp-status { font-size: 1rem; margin-top: 0.1rem; }
  .rsvp-name { font-size: 0.9rem; font-weight: 500; }
  .rsvp-message { font-size: 0.85rem; color: #888; margin-top: 0.2rem; }
  .upgrade-banner { margin: 0 2rem 1.5rem; padding: 1rem 1.2rem; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .upgrade-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.2rem; }
  .upgrade-text { font-size: 0.8rem; color: #888; }
  .upgrade-btn { padding: 0.5rem 1.2rem; background: #111; color: white; border: none; border-radius: 6px; font-size: 0.85rem; cursor: pointer; white-space: nowrap; font-family: inherit; }
  .upgrade-btn:hover { background: #333; }
  .remind-section { margin: 0 2rem 0.5rem; }
  .remind-btn { width: 100%; padding: 0.7rem; background: white; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-family: inherit; color: #444; transition: all 0.15s; }
  .remind-btn:hover { border-color: #111; color: #111; }
  .remind-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .remind-error { font-size: 0.85rem; color: red; margin-top: 0.5rem; }
  .image-section { margin: 0.5rem 2rem 1.5rem; }
  .image-edit-btn { width: 100%; padding: 0.7rem; background: white; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; font-size: 0.9rem; font-family: inherit; color: #444; transition: all 0.15s; }
  .image-edit-btn:hover { border-color: #111; color: #111; }
  .card-footer { padding: 1.2rem 2rem; border-top: 1px solid #f0f0f0; text-align: center; }
  .card-footer a { font-size: 0.8rem; color: #bbb; text-decoration: none; }
  .card-footer a:hover { color: #888; }
  .not-found, .loading { text-align: center; padding: 4rem; color: #888; font-family: sans-serif; }
  .share-row { display: flex; gap: 0.5rem; margin-top: 1.2rem; }
  .share-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-family: inherit; border: 1px solid #e0e0e0; background: white; color: #444; transition: all 0.15s; }
  .share-btn:hover { border-color: #111; color: #111; }
  .share-btn.whatsapp:hover { border-color: #25D366; color: #25D366; }

  /* Modals */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
  .modal { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 420px; }
  .modal h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.5rem; }
  .modal p { font-size: 0.9rem; color: #555; margin-bottom: 1.2rem; }
  .slug-input-row { display: flex; align-items: center; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 1rem; }
  .slug-prefix { padding: 0.65rem 0.8rem; background: #f5f5f5; font-size: 0.85rem; color: #888; white-space: nowrap; }
  .slug-input-row input { border: none; border-radius: 0; flex: 1; padding: 0.65rem 0.8rem; }
  .slug-input-row input:focus { outline: none; }
  .slug-error { color: red; font-size: 0.85rem; margin-bottom: 1rem; }
  .slug-success { color: green; font-size: 0.85rem; }
  .modal-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .modal-skip { padding: 0.6rem 1rem; background: white; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: inherit; }
  .modal-save { padding: 0.6rem 1.2rem; background: #111; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: inherit; }
  .modal-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .modal-remove { padding: 0.6rem 1rem; background: white; border: 1px solid #e0e0e0; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: inherit; color: #c00; border-color: #fcc; }
  .modal-remove:hover { background: #fff5f5; border-color: #c00; }

  /* Image modal specifics */
  .image-modal { max-height: 90vh; overflow-y: auto; }
  .tab-bar { display: flex; gap: 0.3rem; margin-bottom: 1.2rem; background: #f5f5f5; border-radius: 8px; padding: 0.25rem; }
  .tab-btn { flex: 1; padding: 0.5rem; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: inherit; color: #666; transition: all 0.15s; }
  .tab-active { background: white; color: #111; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .tab-content { margin-bottom: 1.2rem; }
  .file-label { display: flex; flex-direction: column; gap: 0.6rem; cursor: pointer; }
  .file-input { display: none; }
  .file-btn { display: inline-block; padding: 0.65rem 1rem; border: 1px dashed #ccc; border-radius: 8px; font-size: 0.9rem; color: #555; text-align: center; transition: border-color 0.15s; cursor: pointer; }
  .file-btn:hover { border-color: #111; color: #111; }
  .file-name { font-size: 0.8rem; color: #888; }
  .search-row { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
  .search-row input { flex: 1; }
  .search-btn { padding: 0.65rem 1rem; background: #111; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-family: inherit; white-space: nowrap; }
  .search-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; max-height: 260px; overflow-y: auto; margin-bottom: 0.8rem; border-radius: 8px; }
  .photo-item { padding: 0; border: 2px solid transparent; border-radius: 6px; overflow: hidden; cursor: pointer; background: #f0f0f0; aspect-ratio: 4/3; }
  .photo-item:hover { border-color: #888; }
  .photo-selected { border-color: #111 !important; }
  .photo-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .photo-credit { font-size: 0.75rem; color: #aaa; margin-bottom: 0.8rem; }
  .photo-credit a { color: #888; }
  .img-success { color: green; font-size: 0.9rem; font-weight: 500; text-align: center; padding: 0.5rem 0; }
  .modal-buttons-image { margin-top: 0.5rem; justify-content: space-between; }
</style>

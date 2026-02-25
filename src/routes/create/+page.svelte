<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { goto } from '$app/navigation'
  import * as m from '$lib/paraglide/messages'

  let title = ''
  let date = ''
  let location = ''
  let description = ''
  let email = ''
  let loading = false
  let error = ''

  function generateSlug() {
    return Math.random().toString(36).substring(2, 8)
  }

  async function handleSubmit() {
    loading = true
    error = ''

    const slug = generateSlug()

    const { error: err } = await supabase.from('events').insert({
      slug,
      title,
      date,
      location,
      description,
      creator_email: email,
      is_paid: false
    })

    if (err) {
      error = m.error_generic()
      loading = false
      return
    }

    goto(`/event/${slug}`)
  }
</script>

<main>
  <h1>{m.create_title()}</h1>

  <form on:submit|preventDefault={handleSubmit}>
    <label>
      {m.event_title()} *
      <input type="text" bind:value={title} required placeholder={m.placeholder_title()} />
    </label>

    <label>
      {m.event_date()} *
      <input type="datetime-local" bind:value={date} required />
    </label>

    <label>
      {m.event_location()}
      <input type="text" bind:value={location} placeholder={m.placeholder_location()} />
    </label>

    <label>
      {m.event_description()}
      <textarea bind:value={description} placeholder={m.placeholder_description()}></textarea>
    </label>

    <label>
      {m.your_email()} *
      <input type="email" bind:value={email} required placeholder={m.placeholder_email()} />
    </label>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button type="submit" disabled={loading}>
      {loading ? m.creating() : m.create_btn()}
    </button>
  </form>
</main>

<style>
  main {
    max-width: 480px;
    margin: 4rem auto;
    padding: 0 1rem;
    font-family: sans-serif;
  }
  h1 { margin-bottom: 2rem; }
  form { display: flex; flex-direction: column; gap: 1.2rem; }
  label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; }
  input, textarea {
    padding: 0.6rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
  }
  textarea { min-height: 100px; }
  button {
    padding: 0.8rem;
    background: black;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
  }
  button:disabled { opacity: 0.5; }
  .error { color: red; font-size: 0.9rem; }
</style>
import { json } from '@sveltejs/kit'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'

const BUCKET = 'event-images'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST({ request }) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const eventId = formData.get('event_id') as string

  if (!file || !eventId) {
    return json({ error: 'Missing file or event_id.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({ error: 'Only JPEG, PNG, WebP and GIF allowed.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return json({ error: 'File too large. Max 5 MB.' }, { status: 400 })
  }

  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filename = `${eventId}-${Date.now()}.${ext}`

  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(filename)

  // Persist URL on the event row
  await supabaseAdmin
    .from('events')
    .update({ image_url: publicUrl })
    .eq('id', eventId)

  return json({ url: publicUrl })
}

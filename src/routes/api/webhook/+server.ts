import { json } from '@sveltejs/kit'
import Stripe from 'stripe'
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private'
import { supabase } from '$lib/supabase'

const stripe = new Stripe(STRIPE_SECRET_KEY)

export async function POST({ request }) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch {
    return json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const { event_id } = session.metadata

    await supabase
      .from('events')
      .update({ is_paid: true })
      .eq('id', event_id)
  }

  return json({ received: true })
}
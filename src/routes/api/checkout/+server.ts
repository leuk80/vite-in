import { json } from '@sveltejs/kit'
import Stripe from 'stripe'
import { STRIPE_SECRET_KEY } from '$env/static/private'
import { i18n } from '$lib/i18n'

const stripe = new Stripe(STRIPE_SECRET_KEY)

export async function POST({ request }) {
  const { event_id, slug, lang } = await request.json()

  console.log('checkout - event_id:', event_id, 'slug:', slug, 'lang:', lang)

  const eventPath = i18n.resolveRoute(`/event/${slug}`, lang ?? 'en')

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: 'price_1T4LlAL2eTpw4wCCRh4wkMOb', // deine Price ID hier eintragen
        quantity: 1
      }
    ],
    mode: 'payment',
    success_url: `https://vite.in${eventPath}?upgraded=true`,
    cancel_url: `https://vite.in${eventPath}`,
    metadata: { event_id, slug }
  })

  return json({ url: session.url })
}
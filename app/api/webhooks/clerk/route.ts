import { Webhook } from 'svix'
import { WebhookEvent } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SubscriptionWebhookEvent {
  data: any // Using `any` to handle nested and variable structures
}

export async function POST(req: Request) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET
    if (!WEBHOOK_SECRET) throw new Error('Missing CLERK_WEBHOOK_SIGNING_SECRET')

    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature)
      return new Response('Missing Svix headers', { status: 400 })

    const payload = await req.text()
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: WebhookEvent
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature
      }) as WebhookEvent
    } catch (err) {
      console.error('Webhook verification failed:', err)
      return new Response('Invalid webhook signature', { status: 400 })
    }

    const eventType = evt.type
    const subscription = evt as unknown as SubscriptionWebhookEvent

    // Extract common data safely
    const isItemEvent = eventType.startsWith('subscriptionItem')
    const firstItem = subscription.data.items?.[0] || {}

    const subscriptionData = {
      id: subscription.data.id,
      user_id: subscription.data.payer?.user_id || null, // nested
      organization_id: subscription.data.organization_id || null,
      status: subscription.data.status,
      plan_id: isItemEvent ? firstItem.plan?.id || null : firstItem.plan?.id || null,
      created_at: subscription.data.created_at || null,
      updated_at: subscription.data.updated_at || null,
      current_period_start: firstItem.period_start || null,
      current_period_end: firstItem.period_end || null,
      subscription_id: isItemEvent ? firstItem.id || null : null
    }

    switch (eventType) {
      // Top-level subscription events
      case 'subscription.created': {
        const { error } = await supabase.from('subscriptions').insert(subscriptionData)
        if (error) {
          console.error('Insert error:', error)
          return new Response('Database error', { status: 500 })
        }
        console.log('Subscription created:', subscriptionData)
        break
      }

      case 'subscription.updated':
      case 'subscription.active':
      case 'subscription.pastDue': {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: subscriptionData.status,
            plan_id: subscriptionData.plan_id,
            updated_at: subscriptionData.updated_at,
            current_period_start: subscriptionData.current_period_start,
            current_period_end: subscriptionData.current_period_end
          })
          .eq('id', subscriptionData.id)
        if (error) {
          console.error(`${eventType} update error:`, error)
          return new Response('Database error', { status: 500 })
        }
        console.log(`Subscription ${eventType}:`, subscriptionData)
        break
      }

      // Subscription item events
      case 'subscriptionItem.updated':
      case 'subscriptionItem.active':
      case 'subscriptionItem.canceled':
      case 'subscriptionItem.upcoming':
      case 'subscriptionItem.ended':
      case 'subscriptionItem.abandoned':
      case 'subscriptionItem.incomplete':
      case 'subscriptionItem.pastDue':
      case 'subscriptionItem.freeTrialEnding': {
        const { error } = await supabase
          .from('subscriptions')
          .upsert(subscriptionData, { onConflict: 'id' })
        if (error) {
          console.error(`${eventType} upsert error:`, error)
          return new Response('Database error', { status: 500 })
        }
        console.log(`Subscription item ${eventType}:`, subscriptionData)
        break
      }

      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    return new Response('Webhook processed', { status: 200 })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response(
      `Webhook error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      { status: 400 }
    )
  }
}

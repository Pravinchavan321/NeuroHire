const router = require('express').Router();
const pool   = require('../db/pg');
const auth   = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const STRIPE_DISABLED = process.env.STRIPE_DISABLED === 'true' || process.env.ENABLE_STRIPE === 'false' || !process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_DISABLED ? null : require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /api/billing/create-checkout - Create Stripe checkout session
router.post('/create-checkout', auth, tenantGuard, async (req, res) => {
  try {
    if (STRIPE_DISABLED) {
      return res.json({
        success: true,
        message: 'Billing disabled in local/dev mode',
        mock: true,
        data: { checkout_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing?mock=true` }
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?canceled=true`,
      metadata: {
        company_id: req.companyId.toString()
      }
    });

    res.json({ success: true, data: { checkout_url: session.url } });
  } catch (e) {
    console.error('Stripe session creation failed:', e);
    res.status(500).json({ success: false, error: 'Failed to initiate payment' });
  }
});

router.post('/create-subscription', auth, tenantGuard, async (req, res) => {
  try {
    if (STRIPE_DISABLED) {
      return res.json({ success: true, message: 'Billing disabled in local/dev mode', mock: true });
    }

    return res.status(400).json({ success: false, error: 'Use /create-checkout for subscription checkout' });
  } catch (e) {
    console.error('Stripe subscription creation failed:', e);
    res.status(500).json({ success: false, error: 'Failed to initiate subscription' });
  }
});

// POST /api/billing/webhook - Stripe Webhook (Raw body handler)
router.post('/webhook', async (req, res) => {
  if (STRIPE_DISABLED) {
    return res.status(200).json({ success: true, received: true, mock: true });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const session = event.data.object;

    if (event.type === 'checkout.session.completed') {
      const companyId = session.metadata.company_id;
      const stripeCustomerId = session.customer;
      const stripeSubId = session.subscription;
      
      // Get period end
      const subscription = await stripe.subscriptions.retrieve(stripeSubId);
      const periodEnd = new Date(subscription.current_period_end * 1000);

      await pool.query(
        `INSERT INTO subscriptions (company_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
         VALUES ($1, $2, $3, 'pro', 'active', $4)
         ON CONFLICT (company_id) DO UPDATE SET 
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         stripe_subscription_id = EXCLUDED.stripe_subscription_id,
         plan = 'pro', status = 'active', 
         current_period_end = EXCLUDED.current_period_end`,
        [companyId, stripeCustomerId, stripeSubId, periodEnd]
      );
    }

    if (event.type === 'customer.subscription.deleted') {
      await pool.query(
        "UPDATE subscriptions SET plan = 'free', status = 'cancelled' WHERE stripe_subscription_id = $1",
        [session.id]
      );
    }

    if (event.type === 'invoice.payment_failed') {
      await pool.query(
        "UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1",
        [session.subscription]
      );
    }

    res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook processing failed:', e);
    res.status(500).send('Internal server error');
  }
});

// GET /api/billing/status - Get current subscription and usage
router.get('/status', auth, tenantGuard, async (req, res) => {
  try {
    const { rows: [sub] } = await pool.query(
      'SELECT * FROM subscriptions WHERE company_id = $1',
      [req.companyId]
    );

    const { rows: [{ job_count }] } = await pool.query(
      'SELECT COUNT(*) as job_count FROM jobs WHERE company_id = $1',
      [req.companyId]
    );

    const { rows: [{ cand_count }] } = await pool.query(
      'SELECT COUNT(*) as cand_count FROM candidates WHERE company_id = $1',
      [req.companyId]
    );

    res.json({
      success: true,
      data: {
        plan: sub?.plan || 'free',
        status: sub?.status || 'active',
        current_period_end: sub?.current_period_end,
        usage: {
          jobs: parseInt(job_count),
          candidates: parseInt(cand_count)
        }
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch billing status' });
  }
});

module.exports = router;

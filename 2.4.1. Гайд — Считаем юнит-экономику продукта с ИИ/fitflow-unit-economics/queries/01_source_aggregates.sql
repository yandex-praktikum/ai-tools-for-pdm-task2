WITH
params AS (
    SELECT
        '2025-01-01' AS acquisition_start,
        '2025-01-31' AS acquisition_end,
        '2025-01-01' AS observation_start,
        '2025-06-30' AS observation_end
),
first_payments AS (
    SELECT customer_id, MIN(paid_at) AS first_paid_at
    FROM payments
    GROUP BY customer_id
),
cohort AS (
    SELECT c.customer_id, c.acquisition_channel AS channel
    FROM customers AS c
    JOIN first_payments AS fp USING (customer_id)
    CROSS JOIN params AS p
    WHERE fp.first_paid_at BETWEEN p.acquisition_start AND p.acquisition_end
),
channels AS (
    SELECT ms.channel, ms.spend_cents
    FROM marketing_spend AS ms
    CROSS JOIN params AS p
    WHERE ms.period_start = p.acquisition_start
      AND ms.period_end = p.acquisition_end
),
paying_counts AS (
    SELECT channel, COUNT(DISTINCT customer_id) AS count_value
    FROM cohort
    GROUP BY channel
),
refunds_by_payment AS (
    SELECT r.payment_id, SUM(r.amount_cents) AS refund_cents
    FROM refunds AS r
    CROSS JOIN params AS p
    WHERE r.refunded_at BETWEEN p.observation_start AND p.observation_end
    GROUP BY r.payment_id
),
revenue AS (
    SELECT
        c.channel,
        SUM(pay.amount_cents) AS gross_revenue_cents,
        SUM(COALESCE(rbp.refund_cents, 0)) AS refund_cents
    FROM cohort AS c
    JOIN payments AS pay USING (customer_id)
    LEFT JOIN refunds_by_payment AS rbp USING (payment_id)
    CROSS JOIN params AS p
    WHERE pay.paid_at BETWEEN p.observation_start AND p.observation_end
    GROUP BY c.channel
),
costs AS (
    SELECT
        c.channel,
        SUM(vc.amount_cents) AS variable_costs_cents,
        COUNT(*) AS active_customer_months
    FROM cohort AS c
    JOIN variable_costs AS vc USING (customer_id)
    CROSS JOIN params AS p
    WHERE vc.cost_month BETWEEN p.observation_start AND p.observation_end
    GROUP BY c.channel
)
SELECT
    ch.channel,
    ch.spend_cents,
    COALESCE(pc.count_value, 0) AS new_paying_customers,
    COALESCE(rev.gross_revenue_cents, 0) AS gross_revenue_cents,
    COALESCE(rev.refund_cents, 0) AS refund_cents,
    COALESCE(rev.gross_revenue_cents, 0) - COALESCE(rev.refund_cents, 0)
        AS net_revenue_cents,
    COALESCE(cost.variable_costs_cents, 0) AS variable_costs_cents,
    COALESCE(cost.active_customer_months, 0) AS active_customer_months
FROM channels AS ch
LEFT JOIN paying_counts AS pc USING (channel)
LEFT JOIN revenue AS rev USING (channel)
LEFT JOIN costs AS cost USING (channel)
ORDER BY CASE ch.channel WHEN 'paid_social' THEN 1 ELSE 2 END;

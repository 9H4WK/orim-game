# Africa’s Talking: setup, operations and go-live

## 1. Credentials and settings

| Setting | Sandbox | Live |
| --- | --- | --- |
| `AT_USERNAME` | `sandbox` (the SDK picks the sandbox host from this) | your live app username |
| `AT_API_KEY` | sandbox key from the sandbox dashboard | live key |
| `AT_ENVIRONMENT` | `sandbox` | `production` |
| `AT_SENDER_ID` | leave empty | an approved sender ID or short code, if you have one |

ORIM refuses to start provider calls if `AT_ENVIRONMENT` and `AT_USERNAME` disagree.

SDK: `africastalking@0.8.4`. Request shapes were checked against the installed source:

- `SMS.send({ to: [phone], message, from? })` → `SMSMessageData.Recipients[]`. Status codes 100/101/102 mean *accepted for delivery*, which ORIM records as `accepted`, never `delivered`.
- `AIRTIME.send({ recipients: [{ phoneNumber, currencyCode, amount }], idempotencyKey })` sends an `Idempotency-Key` header. A `Sent` response means *accepted*; ORIM waits for the status callback or a status query before marking success.
- `AIRTIME.findTransactionStatus(transactionId)` reconciles in-flight payouts.

## 2. Callbacks

Africa’s Talking does not sign callbacks, so each URL carries a long secret (`AT_WEBHOOK_SECRET`). Also restrict by source IP at your edge if your host allows it.

| Dashboard setting | URL |
| --- | --- |
| SMS delivery reports | `{APP_BASE_URL}/api/webhooks/africastalking?type=sms-delivery&token={AT_WEBHOOK_SECRET}` |
| SMS incoming messages (two-way short code, for STOP) | `…?type=sms-inbound&token=…` |
| Airtime status callback | `…?type=airtime-status&token=…` |
| Airtime validation callback | `…?type=airtime-validation&token=…` |

Every handler is idempotent. Duplicate or late notifications never undo a final state. The validation callback answers `Validated` only for a payout ORIM is actually processing, to that exact number, amount and currency.

## 3. SMS challenges

Turn on with `ENABLE_SMS_CHALLENGES=true`. A text is sent only when **all** of these hold:

- the sender created the challenge and has a verified run on it
- the sender ticked that the friend agreed to receive one text (`consent_basis = sender_confirmed_recipient_agreed`)
- the number is valid E.164, in `SMS_ALLOWED_COUNTRIES`, and has not opted out
- that number has not already been sent this challenge
- limits allow it: 5/hour and 15/day per sender, 2/day per recipient, 10/hour per IP, `SMS_DAILY_LIMIT` per day overall

The text holds only the link and an opt-out link (`/stop`). It uses straight apostrophes so it stays one GSM-7 segment. Recipients can opt out on the web or by replying STOP to a two-way short code.

## 4. Competitions and airtime: admin runbook

All admin calls take `Authorization: Bearer $ADMIN_TOKEN`.

```bash
# Publish a competition (rules are fixed at publication; prizes must fit the budget)
curl -X POST $APP/api/internal/competitions -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{
  "id": "nairobi-nov", "title": "Nairobi November sprint",
  "startsAt": "2026-11-01T06:00:00Z", "endsAt": "2026-11-08T18:00:00Z", "claimDeadline": "2026-11-15T18:00:00Z",
  "countryCode": "KE", "size": 15, "prizes": [100, 50, 25], "budget": 175,
  "terms": "Open to players with a Kenyan mobile number. One prize per person and per number. Results are reviewed before airtime is sent."
}'

# After endsAt: rank verified runs and fix results
curl -X POST $APP/api/internal/competitions/nairobi-nov/finalize -H "Authorization: Bearer $ADMIN_TOKEN"

# Review queue (phone numbers are masked)
curl $APP/api/internal/rewards?status=pending -H "Authorization: Bearer $ADMIN_TOKEN"

# Approve one claim (needs a verified phone; checks budget and daily limit; flagged runs need acknowledgeRisk)
curl -X POST $APP/api/internal/rewards/approve -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"claimId":"1"}'

# Send the airtime (needs ENABLE_AIRTIME_PAYOUTS=true; safe to repeat, sends at most once)
curl -X POST $APP/api/internal/rewards/issue -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"claimId":"1"}'

# Ask the provider for the final status of an in-flight payout
curl -X POST $APP/api/internal/rewards/reconcile -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"claimId":"1"}'

# Close a review_required payout by hand, after checking the Africa’s Talking dashboard
curl -X POST $APP/api/internal/rewards/resolve -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"claimId":"1","outcome":"failed","note":"No matching transaction in AT dashboard"}'
```

### Payout states

| State | Meaning |
| --- | --- |
| `pending` | Eligible claim exists; nothing authorised |
| `approved` | An administrator approved this exact, budgeted amount |
| `processing` | One provider request is in flight or awaiting confirmation |
| `succeeded` | The provider confirmed completion (callback or status query) |
| `failed` | Definite failure, with evidence |
| `review_required` | Timeout or ambiguity; a person reconciles it. Never retried automatically |

Each claim has at most one payout (unique `claim_id`) with idempotency key `orim-claim-{id}`. The amount, number and currency come only from server records.

### Emergency stop

Set `ENABLE_AIRTIME_PAYOUTS=false` (and/or `ENABLE_SMS_CHALLENGES=false`) and redeploy. In-flight payouts can still be reconciled.

## 5. Sandbox-to-live checklist

1. In sandbox: set the sandbox key, enable both features, and run a challenge, an OTP and a payout end to end. Watch delivery reports and the airtime callback arrive.
2. Exercise failures: a wrong code, an opted-out number, a rate limit, a provider failure, a timeout that lands in `review_required`.
3. Confirm the live account: supported destination country and currency, sender ID or short code approval, airtime product enabled, balance, billing and callback URLs.
4. Get written product approval for prize terms, eligibility, the budget and `AIRTIME_DAILY_LIMIT`.
5. Switch to live credentials with `ENABLE_AIRTIME_PAYOUTS=false`. Turn SMS on first and watch it.
6. Only when the owner explicitly approves: set `ENABLE_AIRTIME_PAYOUTS=true` **and** `AIRTIME_LIVE_APPROVED=true`.

## 6. Data and privacy

| Data | Stored as | Kept for |
| --- | --- | --- |
| Player identity | random id in a signed, httpOnly cookie; pseudonym like `Explorer-4F2A` | until the player clears cookies |
| Invited friend’s number | keyed hash + masked form (`+254••••••678`) | delete invitations after 90 days |
| Opt-outs | keyed hash | indefinitely, so the opt-out keeps working |
| Prize winner’s number | AES-256-GCM encrypted + hash + masked form | delete 12 months after the claim closes, or sooner on request |
| Runs | path, timings, risk flags | delete after 12 months, except runs tied to a paid prize |
| Audit events | actions and outcomes, no phone numbers | as long as payout records |

Phone numbers are never shown publicly or written to logs. Leaderboards show pseudonyms only. Purpose limitation: invitation numbers are used only for that one text; prize numbers only for that prize. Deletion is a manual SQL task today; schedule it before running real competitions.

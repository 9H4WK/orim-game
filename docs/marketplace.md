# Africa’s Talking Marketplace listing

Draft details for the submission form at marketplace.africastalking.dev. Review pricing and wording before submitting.

| Field | Value |
| --- | --- |
| Name | ORIM: Maze Challenges |
| Slug | `orim-maze-challenges` |
| Short description | A maze game with SMS friend challenges and verified airtime competitions. |
| Logo | `src/app/icon.svg` (export a square PNG for the form; a missing logo blocks submission) |
| Image | built from this repository’s `Dockerfile`, pushed to the AT-Container registry |
| Products | SMS, Airtime |
| Industry | Gaming |
| Database | None required: embedded Postgres persists to the `/data` volume. Optionally set `DATABASE_URL` for managed Postgres. |

## Long description

ORIM is a ready-to-run maze game your customers can brand as their own engagement channel. Players race through pixel mazes without any sign-up. They can text a friend the exact same maze through Africa’s Talking SMS and compare times that the server verifies. Operators can publish time-boxed competitions on one shared maze, with live leaderboards of verified runs, and reward winners with Africa’s Talking Airtime after phone verification and approval.

Built for safety: consent-based invitations, STOP and web opt-out, rate and spending limits, encrypted winner numbers, idempotent payouts that are never retried blindly, and kill switches for SMS and airtime.

## Environment variables to expose

| Variable | Required | Notes |
| --- | --- | --- |
| `ORIM_SECRET` | yes | 32+ random characters |
| `APP_BASE_URL` | yes | the instance URL, used in SMS links |
| `AT_USERNAME`, `AT_API_KEY` | for SMS/airtime | customer’s own Africa’s Talking app |
| `AT_ENVIRONMENT` | yes | `sandbox` or `production` |
| `AT_SENDER_ID` | no | approved sender ID |
| `ENABLE_SMS_CHALLENGES` | no | default `false` |
| `ENABLE_AIRTIME_PAYOUTS` | no | default `false` |
| `AIRTIME_LIVE_APPROVED` | no | default `false`; required for live airtime |
| `SMS_ALLOWED_COUNTRIES` | no | default `KE` |
| `SMS_DAILY_LIMIT`, `AIRTIME_DAILY_LIMIT` | no | defaults 200 texts, 2000 currency units |
| `ADMIN_TOKEN` | for competitions | 24+ characters |
| `AT_WEBHOOK_SECRET` | for callbacks | 16+ characters |
| `DATABASE_URL` | no | managed Postgres instead of the volume |

## Suggested pricing plan

| Plan | Currency | Amount | Frequency | Description |
| --- | --- | --- | --- | --- |
| Starter | USD | 10 | Monthly | One branded ORIM instance with SMS challenges and competitions. SMS and airtime are billed by Africa’s Talking to your own account. |

## Pushing the image

```bash
docker build -t orim .
docker tag orim <registry-from-submission-form>/orim:latest
docker push <registry-from-submission-form>/orim:latest
```

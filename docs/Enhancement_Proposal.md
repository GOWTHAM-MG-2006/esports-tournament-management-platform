# Enhancement Proposal — AI Win-Rate Predictor + Smart Seeding

## Problem

Organizers seed brackets blindly — no data on team strength. Without any signal on which teams are stronger, early rounds produce weak/mismatched matches instead of competitive progression through the bracket.

## Solution approach

On-demand win-rate predictor over the existing `matches` table + one-click smart seeding that ranks registrations by predicted strength. The predictor scores a matchup from historical results at request time; smart seeding orders tournament registrations by predicted strength and assigns seeds 1..N. No model files in repo — nothing persisted, retraining happens per request from current data.

## Tech choice

scikit-learn `LogisticRegression` on `[win_rate_diff, seed_diff]` — stdlib-grade dependency already familiar from the Python stack, trains in milliseconds on synthetic priors + real win rates, no GPU/service needed. React UI reuse of existing seeding page + match list: a "Smart seed" action on the seeding flow and a predicted-winner badge in the match list.

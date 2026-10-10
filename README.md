# DigiCube Agent Console

Government case-intake demo: an agentic AI processes incoming service
applications end-to-end with a human checkpoint. Built for a 2-3 minute
screen recording.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. No API key required - the demo runs on
deterministic canned outputs out of the box (badge shows LLM FALLBACK).
Set `ANTHROPIC_API_KEY` in `.env` for live Claude classification,
extraction and drafting (badge shows LLM LIVE).

## Demo script (3 runs, all code paths)

1. **GOV-2026-01427** - Trade licence renewal. Clean straight-through:
   fields extracted, rules pass, approve-ready. Stamp it.
2. **GOV-2026-01436** - Activity amendment. Watch the cross-case signal:
   the registry detects a parallel renewal on the same licence.
3. **GOV-2026-01444** - Incomplete application. Rules fail on missing
   documents -> request-more-info path with a drafted deficiency notice.
4. **GOV-2026-01440** - Fee waiver. Revenue 3.1% over threshold ->
   escalated to senior officer (discretionary).
5. **GOV-2026-01431** - Building permit. 9.2m vs 8.0m zoning limit ->
   escalated (s7.3 variance).

## What to point at while recording

- Click any extracted field -> the source document highlights the exact
  evidence span (provenance).
- Each step shows the tool called, its permission scope (READ-ONLY /
  RULES / DRAFT-ONLY / WRITE), latency and output hash.
- The SLA clock races the 25-minute manual baseline in the run header.
- Bottom bar: hash-chained audit log. Verify chain, export JSON.
- Officer checkpoint: nothing is dispatched until the stamp lands.
- EN/AR toggle flips the whole console to RTL; IDs and phones are masked.

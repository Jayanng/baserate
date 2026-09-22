# Jev probe — verified live 2026-09-22

Access: free key via jev-agent.com mirror (5 decisions/month, no card). Official TypeSafe console
currently full; waitlist joined. Vercel AI Gateway requires a paid plan, not used. GMI does not host Jev.
When an official TypeSafe key arrives: change host + token only, request/response identical (stated by mirror docs).

## Endpoint

POST https://jev-agent.com/api/v1/systemone
Authorization: Bearer $JEV_API_KEY
Model returned: jev-1.13.0

## Request shape (verified field by field)

```json
{
  "state": "string — the episode/context text",
  "questions": {
    "<name>": {
      "type": "choice | noul | score",
      "instructions": "string (required, non-empty)",
      "criteria": ...
    }
  }
}
```

- `choice`: criteria = object of option -> description
- `noul`: criteria = {"true": "...", "false": "..."} (returns probability 0..1)
- `score`: criteria = ordered array of non-empty strings (returns score index float + legend + probabilities)
- questions MUST be an object (name -> question), not a list

## Response (real example, 3 questions, 1 charged decision, 0.51s)

```json
{"model":"jev-1.13.0",
 "answers":{
   "regime":{"type":"choice","choice":"trend_down","confidence":0.99,
             "probabilities":{"squeeze":0,"capitulation":0,"trend_up":0,"chop":0,"trend_down":1}},
   "weekend_gap_risk":{"type":"noul","noul":0.85},
   "downside_severity":{"type":"score","score":2.08,"confidence":0.68,
             "legend":{"0":"minimal: shallow drift","1":"moderate: 2-5% adverse move",
                       "2":"severe: 5-10% adverse move","3":"extreme: >10% adverse move"},
             "probabilities":{"0":0,"1":0.12,"2":0.68,"3":0.2}}},
 "usage":{"input_tokens":644,"output_tokens":101},
 "quota":{"charged":1,"used":2,"limit":5,"remaining":3,"month":"2026-09","paid":0,"freeRemaining":3}}
```

## Quota rules (verified)

- Charged PER CALL, not per question: 3 questions = 1 decision. Stack many questions per call.
- Free: 5/month, resets monthly. State after probes: 3 remaining for September.
- DEMO DISCIPLINE: never rehearse against live quota. Rehearse on recorded fixtures. Keep >= 1 spare.
- Adapter guard: refuse to call if remaining < 2 (always keep one spare for the real demo).

## Latency

~0.2s validation rejects; ~0.5s successful decision. Consistent with batch use at dossier time.

## Role in BaseRate (unchanged, as designed)

- Dossier time: ONE call, all typed questions (regime, gap risk, severity, custom). This is the live Jev path.
- History batch classification: fallback statistical classifier (free quota cannot classify thousands of episodes).
  Labeled fallback in output. If quota/free tier expands, re-run batch through Jev via one config change.
- No-Jev mode: desk stays fully functional (README promise holds).

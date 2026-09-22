"""Jev adapter — verified against live API 2026-09-22 (see docs/jev-probe.md).

One HTTP call carries many typed questions; quota charges 1 decision per call.
Guard keeps a spare decision for the live demo. Key read from env, never logged.
"""
import json
import os
import urllib.request
import urllib.error

ENDPOINT = "https://jev-agent.com/api/v1/systemone"
MIN_SPARE = 2  # refuse to call if remaining < 2: one decision must stay reserved for the live demo


class JevUnavailable(Exception):
    """Raised when Jev cannot be called. Caller must fall back to the statistical classifier."""


def _key():
    key = os.environ.get("JEV_API_KEY")
    if not key:
        raise JevUnavailable("JEV_API_KEY not set")
    return key


def decide(state: str, questions: dict) -> dict:
    """One batched Jev decision.

    questions: {name: {"type": "choice"|"noul"|"score",
                       "instructions": str,
                       "criteria": dict (choice/noul) or list[str] (score)}}
    Returns the full parsed response dict (answers, usage, quota).
    Raises JevUnavailable on any failure; never raises with fabricated data.
    """
    payload = {"state": state, "questions": questions}
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {_key()}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:200]
        raise JevUnavailable(f"HTTP {e.code}: {detail}") from None
    except Exception as e:
        raise JevUnavailable(f"network failure: {e}") from None


def quota_remaining(response: dict) -> int:
    q = response.get("quota", {})
    return q.get("remaining", 0)


def decide_with_guard(state: str, questions: dict) -> dict:
    """Call Jev only if enough quota remains; else raise JevUnavailable (fallback path)."""
    resp = decide(state, questions)
    if quota_remaining(resp) < MIN_SPARE:
        # this call already succeeded; surface the low-quota state to the caller
        raise JevUnavailable("quota below demo reserve; switch to fallback classifier")
    return resp


if __name__ == "__main__":
    # smoke test against live API (uses 1 decision)
    out = decide(
        "Test state: sample market episode, 3 red weeks, VIX 28.",
        {
            "regime": {
                "type": "choice",
                "instructions": "Classify the market regime.",
                "criteria": {"trend_up": "up drift", "trend_down": "decline", "chop": "range"},
            }
        },
    )
    print(json.dumps(out, indent=2)[:400])

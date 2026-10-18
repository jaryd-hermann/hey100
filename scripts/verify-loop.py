"""Drives the whole loop with real accounts: hey, match, chat, trade, feedback."""

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent / '.env.local'

env = {}
for line in open(ENV_PATH):
    m = re.match(r'^([A-Z0-9_]+)="?([^"\n]*)"?$', line.strip())
    if m:
        env[m.group(1)] = m.group(2)

URL = env["SUPABASE_URL"]
ANON = env["SUPABASE_ANON_KEY"]
SR = env["SUPABASE_SERVICE_ROLE_KEY"]
PASSWORD = "hey100-loop-" + os.urandom(6).hex()


def call(method, path, body=None, token=None, key=None, prefer=None):
    req = urllib.request.Request(URL + path, method=method)
    req.add_header("apikey", key or ANON)
    req.add_header("Authorization", "Bearer " + (token or key or ANON))
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def check(label, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + label + (f"   {detail}" if detail else ""))
    results.append(bool(ok))
    return ok


results = []
created = []

try:
    # Four builders: two to match with each other, two more to test the caps.
    for who in ("ana", "ben", "cara", "dan"):
        status, user = call(
            "POST",
            "/auth/v1/admin/users",
            {
                "email": f"{who}.{os.urandom(4).hex()}@hey100-loop.test",
                "password": PASSWORD,
                "email_confirm": True,
                "user_metadata": {"full_name": who.title() + " Loopman"},
            },
            key=SR,
        )
        assert status == 200, (status, user)
        created.append((who, user["id"], user["email"]))

    ids = {who: uid for who, uid, _ in created}
    emails = {who: email for who, _, email in created}

    def token_for(who):
        status, body = call(
            "POST",
            "/auth/v1/token?grant_type=password",
            {"email": emails[who], "password": PASSWORD},
        )
        assert status == 200, (status, body)
        return body["access_token"]

    tok = {who: token_for(who) for who in ids}

    # Everyone publishes a listing, which is the only way into the loop.
    apps = {}
    for who, name, subtitle in (
        ("ana", "Tidepool", "Save what you read"),
        ("ben", "Brewlog", "Dial in your pour over"),
        ("cara", "Shiplog", "Ship notes for indie devs"),
        ("dan", "Quietly", "A calmer inbox"),
    ):
        status, rows = call(
            "POST",
            "/rest/v1/apps",
            {
                "owner_id": ids[who],
                "name": name,
                "subtitle": subtitle,
                "category": "Productivity",
                "stage": "TestFlight",
                "is_primary": True,
                "published_at": "2026-10-18T10:00:00Z",
            },
            token=tok[who],
            prefer="return=representation",
        )
        assert status in (200, 201), (who, status, rows)
        apps[who] = rows[0]["id"]

    # A prompt answer, so the card has something to hey.
    call(
        "POST",
        "/rest/v1/app_prompts",
        {"app_id": apps["ben"], "slot": 0, "prompt_id": "first", "answer": "Pull a shot and time it."},
        token=tok["ben"],
    )

    print("\nDiscover")

    status, deck = call("POST", "/rest/v1/rpc/discover_deck", {}, token=tok["ana"])
    names = [c["app"]["name"] for c in (deck or [])]
    check(
        "deck returns other builders' listings, never my own",
        status == 200 and "Tidepool" not in names and "Brewlog" in names,
        str(names[:4]),
    )

    card = next(c for c in deck if c["app"]["name"] == "Brewlog")
    check(
        "card carries its builder, media and prompts in one call",
        card["builder"]["username"] is not None or card["builder"]["id"] == ids["ben"],
        f"prompts={len(card['prompts'])} media={len(card['media'])}",
    )
    check(
        "real name withheld before a match (spec 4)",
        card["builder"]["real_name"] is None,
        str(card["builder"]["real_name"]),
    )

    print("\nHey")

    status, body = call(
        "POST",
        "/rest/v1/rpc/say_hey",
        {
            "p_to_app_id": apps["ben"],
            "p_from_app_id": apps["ana"],
            "p_target_type": "prompt",
            "p_target_label": "the first thing to try",
            "p_note": "Timing a pour over is exactly my problem.",
        },
        token=tok["ana"],
    )
    check("hey sent, no match yet", body.get("status") == "sent", str(body))

    status, body = call(
        "POST",
        "/rest/v1/rpc/say_hey",
        {"p_to_app_id": apps["ana"], "p_from_app_id": apps["ana"]},
        token=tok["ana"],
    )
    check("cannot hey my own listing", body.get("reason") == "your_own_listing", str(body))

    status, body = call(
        "POST",
        "/rest/v1/rpc/say_hey",
        {"p_to_app_id": apps["ben"], "p_from_app_id": apps["ben"]},
        token=tok["ana"],
    )
    check("cannot hey from a listing I do not own", body.get("reason") == "not_your_app", str(body))

    status, rows = call(
        "GET",
        "/rest/v1/heys?select=id,target_label,note,status,from_user_id&order=created_at.desc",
        token=tok["ben"],
    )
    check(
        "the hey is in Ben's queue with its target and note",
        status == 200
        and len(rows) == 1
        and rows[0]["target_label"] == "the first thing to try"
        and rows[0]["status"] == "pending",
        str(rows),
    )
    hey_id = rows[0]["id"]

    status, rows = call("GET", "/rest/v1/heys?select=id", token=tok["cara"])
    check("other builders cannot see that hey", rows == [], str(rows))

    status, deck = call("POST", "/rest/v1/rpc/discover_deck", {}, token=tok["ana"])
    check(
        "a listing I heyed leaves my deck",
        "Brewlog" not in [c["app"]["name"] for c in deck],
        str([c["app"]["name"] for c in deck]),
    )

    print("\nMatch")

    status, body = call("POST", "/rest/v1/rpc/hey_back", {"p_hey_id": hey_id}, token=tok["ben"])
    match_id = body.get("match_id")
    check("hey back matches", body.get("status") == "matched" and match_id, str(body))

    status, rows = call("GET", f"/rest/v1/heys?select=status&id=eq.{hey_id}", token=tok["ben"])
    check("the original hey is marked matched", rows[0]["status"] == "matched", str(rows))

    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=tok["ana"])
    thread = threads[0] if threads else {}
    check(
        "thread opens with a system line and both listings",
        status == 200
        and len(threads) == 1
        and thread["their_app"]["app"]["name"] == "Brewlog"
        and thread["my_app"]["app"]["name"] == "Tidepool"
        and thread["last_message"]["kind"] == "system",
        thread.get("last_message", {}).get("body"),
    )
    check(
        "real name revealed once matched (spec 4)",
        thread["builder"]["real_name"] == "Ben Loopman",
        str(thread["builder"]["real_name"]),
    )
    check(
        "trade starts at Not started for both sides",
        thread["trade_mine"] == "Not started" and thread["trade_theirs"] == "Not started",
        f"{thread['trade_mine']} / {thread['trade_theirs']}",
    )

    status, body = call(
        "POST",
        "/rest/v1/rpc/say_hey",
        {"p_to_app_id": apps["ben"], "p_from_app_id": apps["ana"]},
        token=tok["ana"],
    )
    check(
        "heying an already matched builder returns the thread, not a second one",
        body.get("status") == "matched" and body.get("match_id") == match_id,
        str(body),
    )

    print("\nChat")

    status, body = call(
        "POST",
        "/rest/v1/rpc/send_message",
        {"p_match_id": match_id, "p_body": "Testing yours tonight."},
        token=tok["ana"],
    )
    check("message sent", body.get("status") == "sent", str(body))

    status, body = call(
        "POST", "/rest/v1/rpc/send_message", {"p_match_id": match_id, "p_body": "   "}, token=tok["ana"]
    )
    check("empty message refused", body.get("reason") == "empty", str(body))

    status, body = call(
        "POST",
        "/rest/v1/rpc/send_message",
        {"p_match_id": match_id, "p_body": "hello"},
        token=tok["cara"],
    )
    check("outsider cannot post into the thread", body.get("reason") == "not_your_thread", str(body))

    status, rows = call(
        "GET", f"/rest/v1/messages?select=id,body&match_id=eq.{match_id}", token=tok["cara"]
    )
    check("outsider cannot read the thread", rows == [], str(rows))

    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=tok["ben"])
    check(
        "unread count and last message for the recipient",
        threads[0]["unread"] == 1 and threads[0]["last_message"]["body"] == "Testing yours tonight.",
        f"unread={threads[0]['unread']}",
    )

    call("POST", "/rest/v1/rpc/mark_thread_read", {"p_match_id": match_id}, token=tok["ben"])
    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=tok["ben"])
    check("marking read clears the badge", threads[0]["unread"] == 0, str(threads[0]["unread"]))

    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=tok["ana"])
    check("my own message never counts as unread for me", threads[0]["unread"] == 0, str(threads[0]["unread"]))

    print("\nTrade and feedback")

    status, body = call(
        "POST", "/rest/v1/rpc/set_trade_status", {"p_match_id": match_id, "p_status": "Using"}, token=tok["ana"]
    )
    check("trade moves to Using", body.get("status") == "set", str(body))

    status, body = call(
        "POST",
        "/rest/v1/rpc/set_trade_status",
        {"p_match_id": match_id, "p_status": "Not started"},
        token=tok["ana"],
    )
    check("trade never goes backwards", body.get("status") == "unchanged", str(body))

    status, body = call(
        "POST",
        "/rest/v1/rpc/leave_feedback",
        {
            "p_match_id": match_id,
            "p_stars": 4,
            "p_summary": "The timer is the best part. Onboarding lost me at step two.",
            "p_confusion": "I could not find where to save a recipe.",
            "p_keep": "Yes",
            "p_opt_in": True,
        },
        token=tok["ana"],
    )
    check("feedback left", body.get("status") == "sent", str(body))

    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=tok["ana"])
    check(
        "feedback pins into the thread and finishes the trade",
        threads[0]["trade_mine"] == "Feedback sent" and threads[0]["my_feedback_id"],
        f"{threads[0]['trade_mine']} / {threads[0]['last_message']['kind']}",
    )

    status, rows = call(
        "GET", "/rest/v1/feedback?select=id,stars,app_id,summary,helpful", token=tok["ben"]
    )
    check(
        "feedback arrives in Ben's inbox, about Ben's app",
        len(rows) == 1 and rows[0]["app_id"] == apps["ben"] and rows[0]["stars"] == 4,
        str(rows[0]["summary"])[:40] if rows else "",
    )
    feedback_id = rows[0]["id"]

    status, body = call(
        "PATCH", f"/rest/v1/feedback?id=eq.{feedback_id}", {"helpful": "yes"}, token=tok["ben"]
    )
    check("receiver can rate it helpful", status < 300, f"http {status}")

    status, body = call(
        "PATCH", f"/rest/v1/feedback?id=eq.{feedback_id}", {"stars": 1}, token=tok["ben"]
    )
    check("receiver cannot rewrite the review itself", status >= 400, f"http {status}")

    status, body = call(
        "PATCH", f"/rest/v1/feedback?id=eq.{feedback_id}", {"helpful": "no"}, token=tok["cara"]
    )
    status2, rows = call("GET", f"/rest/v1/feedback?id=eq.{feedback_id}&select=helpful", key=SR)
    check("outsider cannot rate it", rows[0]["helpful"] == "yes", str(rows))

    print("\nPassing and hiding")

    status, body = call(
        "POST",
        "/rest/v1/rpc/say_hey",
        {"p_to_app_id": apps["cara"], "p_from_app_id": apps["dan"], "p_note": "Shiplog looks useful."},
        token=tok["dan"],
    )
    status, rows = call("GET", "/rest/v1/heys?select=id", token=tok["cara"])
    dan_hey = rows[0]["id"]

    status, body = call(
        "POST",
        "/rest/v1/rpc/pass_hey",
        {"p_hey_id": dan_hey, "p_reason": "Not my space"},
        token=tok["cara"],
    )
    check("pass recorded", body.get("status") == "passed", str(body))

    status, deck = call("POST", "/rest/v1/rpc/discover_deck", {}, token=tok["cara"])
    check(
        "passing also hides that listing in Discover",
        "Quietly" not in [c["app"]["name"] for c in deck],
        str([c["app"]["name"] for c in deck]),
    )

    status, body = call("POST", "/rest/v1/rpc/hide_thread", {"p_match_id": match_id}, token=tok["ana"])
    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=tok["ana"])
    check("hiding a thread keeps the match", body.get("status") == "hidden" and threads[0]["hidden"], str(body))

    call("POST", "/rest/v1/rpc/send_message", {"p_match_id": match_id, "p_body": "One more thing"}, token=tok["ben"])
    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=tok["ana"])
    check("a new message brings a hidden thread back", threads[0]["hidden"] is False, str(threads[0]["hidden"]))

    print("\nPlan limits")

    status, body = call("POST", "/rest/v1/rpc/my_counters", {}, token=tok["ana"])
    check(
        "counters report heys and matches left, with the referral bonus",
        body.get("heys_left") is not None and body.get("matches") == 1,
        str(body),
    )

    # Ana has sent two heys so far (Ben, plus the repeat that was already
    # matched). Fill the rest of the allowance with listings made for it.
    filler = []
    status, user = call(
        "POST",
        "/auth/v1/admin/users",
        {
            "email": f"filler.{os.urandom(4).hex()}@hey100-loop.test",
            "password": PASSWORD,
            "email_confirm": True,
        },
        key=SR,
    )
    filler_id = user["id"]
    created.append(("filler", filler_id, user["email"]))
    # Pro, because the listing limit applies to any role, service key included.
    call("PATCH", f"/rest/v1/profiles?id=eq.{filler_id}", {"plan": "pro"}, key=SR)
    for i in range(10):
        status, rows = call(
            "POST",
            "/rest/v1/apps",
            {
                "owner_id": filler_id,
                "name": f"Filler {i}",
                "category": "Productivity",
                "stage": "TestFlight",
                "published_at": "2026-10-18T10:00:00Z",
                "is_primary": False,
            },
            key=SR,
            prefer="return=representation",
        )
        filler.append(rows[0]["id"])

    status, before = call("POST", "/rest/v1/rpc/my_counters", {}, token=tok["ana"])
    sent_already = before["heys_today"]
    blocked_at = None
    for i, app_id in enumerate(filler):
        status, body = call(
            "POST",
            "/rest/v1/rpc/say_hey",
            {"p_to_app_id": app_id, "p_from_app_id": apps["ana"]},
            token=tok["ana"],
        )
        if body.get("reason") == "daily_limit":
            blocked_at = sent_already + i
            break
    check("free plan stops at 8 heys a day (spec 10)", blocked_at == 8, f"blocked after {blocked_at}")

    status, body = call("POST", "/rest/v1/rpc/my_counters", {}, token=tok["ana"])
    check("counters show nothing left", body.get("heys_left") == 0, str(body))

    call("PATCH", f"/rest/v1/profiles?id=eq.{ids['ana']}", {"plan": "pro"}, key=SR)
    status, body = call(
        "POST",
        "/rest/v1/rpc/say_hey",
        {"p_to_app_id": filler[-1], "p_from_app_id": apps["ana"]},
        token=tok["ana"],
    )
    check("pro is not capped", body.get("status") == "sent", str(body))

    status, body = call("POST", "/rest/v1/rpc/my_counters", {}, token=tok["ana"])
    check("pro counters are unlimited", body.get("heys_left") is None and body.get("plan") == "pro", str(body))

    # Four builders hey Cara, who is free and has no referral bonus, so she
    # can accept three and not the fourth.
    suitors = []
    for i in range(4):
        status, user = call(
            "POST",
            "/auth/v1/admin/users",
            {
                "email": f"suitor{i}.{os.urandom(4).hex()}@hey100-loop.test",
                "password": PASSWORD,
                "email_confirm": True,
            },
            key=SR,
        )
        suitor_id = user["id"]
        created.append((f"suitor{i}", suitor_id, user["email"]))
        status, rows = call(
            "POST",
            "/rest/v1/apps",
            {
                "owner_id": suitor_id,
                "name": f"Suitor {i}",
                "category": "Productivity",
                "stage": "TestFlight",
                "published_at": "2026-10-18T10:00:00Z",
                "is_primary": True,
            },
            key=SR,
            prefer="return=representation",
        )
        token = call(
            "POST",
            "/auth/v1/token?grant_type=password",
            {"email": user["email"], "password": PASSWORD},
        )[1]["access_token"]
        call(
            "POST",
            "/rest/v1/rpc/say_hey",
            {"p_to_app_id": apps["cara"], "p_from_app_id": rows[0]["id"]},
            token=token,
        )
        suitors.append(suitor_id)

    status, incoming = call(
        "GET", "/rest/v1/heys?select=id&status=eq.pending&order=created_at", token=tok["cara"]
    )
    outcomes = []
    for hey in incoming:
        status, body = call("POST", "/rest/v1/rpc/hey_back", {"p_hey_id": hey["id"]}, token=tok["cara"])
        outcomes.append(body.get("status") + "/" + str(body.get("reason") or body.get("hit_paywall")))

    check(
        "free plan matches three times, then the fourth is refused (spec 10)",
        outcomes[:3] == ["matched/False", "matched/False", "matched/True"]
        and outcomes[3] == "blocked/match_limit",
        str(outcomes),
    )

    status, body = call("POST", "/rest/v1/rpc/my_counters", {}, token=tok["cara"])
    check("counters show no matches left", body.get("matches_left") == 0, str(body))

    print("\nShare link")

    status, rows = call("GET", f"/rest/v1/apps?id=eq.{apps['ben']}&select=slug", key=SR)
    slug = rows[0]["slug"]
    status, body = call("POST", "/rest/v1/rpc/listing_by_slug", {"p_slug": slug}, key=ANON)
    check(
        "a published listing is readable by slug without signing in",
        status == 200 and body and body["app"]["name"] == "Brewlog",
        slug,
    )
    check("the share page shows no real name", body["builder"]["real_name"] is None, str(body["builder"]["real_name"]))

finally:
    for _, uid, _ in created:
        call("DELETE", f"/auth/v1/admin/users/{uid}", key=SR)
    print(f"\n{sum(results)}/{len(results)} checks passed. {len(created)} accounts removed.")

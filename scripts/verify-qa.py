"""Walks the loop the way a single tester will, against the seeded demo builders."""

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
PASSWORD = "hey100-qa-" + os.urandom(6).hex()

results = []
created = []


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


try:
    email = f"tester.{os.urandom(4).hex()}@hey100-qa.test"
    status, user = call(
        "POST",
        "/auth/v1/admin/users",
        {
            "email": email,
            "password": PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "Sam Tester"},
        },
        key=SR,
    )
    assert status == 200, (status, user)
    me = user["id"]
    created.append(me)

    token = call(
        "POST", "/auth/v1/token?grant_type=password", {"email": email, "password": PASSWORD}
    )[1]["access_token"]

    print("\nOnboarding")

    status, body = call("POST", "/rest/v1/rpc/redeem_invite", {"p_code": "HEY100"}, token=token)
    check("the QA invite code works", body.get("redeemed") is True, str(body))

    status, body = call(
        "PATCH",
        f"/rest/v1/profiles?id=eq.{me}",
        {"username": "samtests", "real_name": "Sam Tester", "job": "Indie dev"},
        token=token,
    )
    check("profile saved by the owner", status < 300, f"http {status}")

    status, rows = call(
        "POST",
        "/rest/v1/apps",
        {
            "owner_id": me,
            "name": "Tidepool",
            "subtitle": "Save what you read",
            "category": "Productivity",
            "stage": "TestFlight",
            "is_primary": True,
            "published_at": "2026-10-18T12:00:00Z",
        },
        token=token,
        prefer="return=representation",
    )
    my_app = rows[0]["id"] if status < 300 else None
    check("listing published", bool(my_app), rows[0]["slug"] if my_app else str(rows))

    print("\nDiscover")

    status, deck = call("POST", "/rest/v1/rpc/discover_deck", {}, token=token)
    names = [card["app"]["name"] for card in deck]
    check(
        "the three seeded listings are in the deck",
        len(deck) >= 3
        and any("Good Times" in n for n in names)
        and any("Little Moments" in n for n in names)
        and any("Quicker" in n for n in names),
        str(names),
    )

    with_media = [card for card in deck if card["media"]]
    check(
        "store listings carry real icons and screenshots",
        len(with_media) >= 2
        and all(card["app"]["icon_path"] for card in with_media)
        and all(len(card["media"]) == 6 for card in with_media),
        f"{len(with_media)} of {len(deck)} have media",
    )

    icon = f"{URL}/storage/v1/object/public/listing-media/{with_media[0]['app']['icon_path']}"
    with urllib.request.urlopen(icon) as served:
        image = served.read()
    check(
        "an icon is actually served from our bucket",
        len(image) > 2000,
        f"{len(image) // 1024} KB",
    )

    check(
        "cards carry prompts and a builder",
        all(card["builder"] for card in deck[:3])
        and any(len(card["prompts"]) >= 3 for card in deck),
        str([len(card["prompts"]) for card in deck[:3]]),
    )

    print("\nHeys")

    status, body = call("POST", "/rest/v1/rpc/demo_hey_me", {}, token=token)
    check("demo builders say hey to my listing", body.get("heys", 0) >= 3, str(body))

    status, heys = call("POST", "/rest/v1/rpc/my_heys", {}, token=token)
    received = heys["received"]
    check(
        "the queue shows them, each with the listing it is about",
        len(received) >= 3 and all(hey["card"]["app"]["name"] for hey in received),
        str([hey["card"]["app"]["name"] for hey in received]),
    )
    check("their note came through", all(hey["note"] for hey in received), received[0]["note"][:40])

    print("\nMatch and chat")

    status, body = call(
        "POST", "/rest/v1/rpc/hey_back", {"p_hey_id": received[0]["id"]}, token=token
    )
    match_id = body.get("match_id")
    check("hey back opens a thread", body.get("status") == "matched" and match_id, str(body))

    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=token)
    thread = threads[0]
    check(
        "the thread knows both listings and their real name",
        thread["their_app"]["app"]["name"]
        and thread["my_app"]["app"]["name"] == "Tidepool"
        and thread["builder"]["real_name"],
        f"{thread['their_app']['app']['name']} · {thread['builder']['real_name']}",
    )

    status, body = call("POST", "/rest/v1/rpc/demo_reply", {"p_match_id": match_id}, token=token)
    check("the demo builder replies", body.get("status") == "sent", str(body))

    status, threads = call("POST", "/rest/v1/rpc/my_threads", {}, token=token)
    check(
        "their reply is unread and starts the trade",
        threads[0]["unread"] == 1 and threads[0]["trade_theirs"] == "Using",
        f"unread={threads[0]['unread']} theirs={threads[0]['trade_theirs']}",
    )

    status, body = call(
        "POST",
        "/rest/v1/rpc/send_message",
        {"p_match_id": match_id, "p_body": "Installing now. What should I look at first?"},
        token=token,
    )
    check("I can reply", body.get("status") == "sent", str(body))

    status, messages = call(
        "GET", f"/rest/v1/messages?select=kind,body,sender_id&match_id=eq.{match_id}&order=created_at",
        token=token,
    )
    check(
        "the thread reads as a conversation",
        [m["kind"] for m in messages] == ["system", "text", "text"],
        str([m["kind"] for m in messages]),
    )

    print("\nTrade and feedback")

    status, body = call(
        "POST",
        "/rest/v1/rpc/leave_feedback",
        {
            "p_match_id": match_id,
            "p_stars": 5,
            "p_summary": "The daily question is the whole product and it works.",
            "p_confusion": "I could not tell whether the group had answered yet.",
            "p_keep": "Yes",
            "p_best_moment": "Seeing three answers waiting the next morning.",
            "p_price": "$3–5",
            "p_opt_in": True,
        },
        token=token,
    )
    check("my feedback saves the whole form", body.get("status") == "sent", str(body))

    status, body = call("POST", "/rest/v1/rpc/demo_feedback", {"p_match_id": match_id}, token=token)
    check("the demo builder sends feedback on my app", body.get("status") == "sent", str(body))

    status, inbox = call("POST", "/rest/v1/rpc/my_feedback", {}, token=token)
    mine = inbox.get(my_app, {})
    entry = (mine.get("entries") or [{}])[0]
    check(
        "the inbox has it, with stars, price and a name",
        mine.get("entries")
        and entry["stars"] == 4
        and entry["price"] == "$3–5"
        and entry["from"]["real_name"],
        f"{entry.get('stars')} · {entry.get('price')} · {entry.get('from', {}).get('real_name')}",
    )
    check(
        "the inbox counts the heys my listing received",
        mine.get("heys", 0) >= 3,
        str(mine.get("heys")),
    )

    status, body = call(
        "PATCH", f"/rest/v1/feedback?id=eq.{entry['id']}", {"helpful": "yes"}, token=token
    )
    check("I can rate it helpful", status < 300, f"http {status}")

    print("\nShare")

    status, rows = call("GET", f"/rest/v1/apps?id=eq.{my_app}&select=slug", token=token)
    status, body = call(
        "POST", "/rest/v1/rpc/listing_by_slug", {"p_slug": rows[0]["slug"]}, key=ANON
    )
    check(
        "my listing is readable by slug without signing in",
        body and body["app"]["name"] == "Tidepool",
        rows[0]["slug"],
    )

    print("\nGuards")

    status, body = call("POST", "/rest/v1/rpc/demo_reply", {"p_match_id": match_id}, key=ANON)
    check("the demo helpers are closed to anonymous callers", status >= 400, f"http {status}")

    status, rows = call("GET", "/rest/v1/profiles?select=id,real_name", key=ANON)
    check(
        "profiles stay unreadable to anonymous callers",
        status >= 400 or rows == [],
        f"http {status}",
    )

    status, rows = call("GET", "/rest/v1/builders?select=username,real_name", key=ANON)
    check(
        "builders are public but without real names",
        status == 200 and rows and all(row["real_name"] is None for row in rows),
        f"{len(rows) if isinstance(rows, list) else rows} builders",
    )

finally:
    for uid in created:
        call("DELETE", f"/auth/v1/admin/users/{uid}", key=SR)
    print(f"\n{sum(results)}/{len(results)} checks passed. Test account removed.")

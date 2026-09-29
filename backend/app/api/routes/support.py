"""Chatbot support: rule-based replies (Groq can be plugged in server-side later).

No AI provider keys are needed for the built-in assistant. Every reply is
clearly from the demo assistant; nothing here claims human support.
"""

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import schemas as s
from app.db.database import get_db
from app.auth.deps import get_current_user
from app.core.config import get_settings
from app.models import ChatbotMessage, User

router = APIRouter(prefix="/support", tags=["support"])


def _utcnow():
    return datetime.now(timezone.utc)


def _msg_out(m: ChatbotMessage) -> s.ChatMessageOut:
    return s.ChatMessageOut(
        id=m.message_id, session_id=m.session_id, sender=m.sender,
        message_text=m.message_text, sent_at=m.sent_at,
    )


# Simple keyword assistant — replaceable with a Groq call server-side.
_RULES: list[tuple[list[str], str]] = [
    (["price", "pricing", "cost", "rate"], "Prices on ApnaDairy move with freshness: the dynamic-pricing engine lowers prices as a batch's freshness score drops, so you always pay a fair price. See /dynamic-pricing for details."),
    (["track", "trace", "batch"], "Product pages show the recorded batch reference, verified farm and AI freshness score. The separate Trace a Batch page is not part of the current web experience."),
    (["order", "delivery", "shipping", "arrive"], "Orders flow: marketplace → cart → demo checkout → simulated payment → delivery assignment → live tracking. Riders update each step, and you get a notification at every stage."),
    (["farm", "farmer", "sell", "onboard"], "Farmers join by registering, creating their farm profile, and completing verification. Once verified they can log milk batches, attach IoT readings, list products and receive B2B quotations."),
    (["b2b", "bulk", "business", "quotation"], "Businesses post bulk purchase requests; verified farms reply with quotations. Accept a quotation and a bulk order is created automatically."),
    (["fresh", "ai", "spoil"], "The Freshness Engine combines IoT temperature history with AI models to estimate shelf life and spoilage risk. Every score is labelled 'Demonstration prediction' — it is an estimate, not lab certification."),
    (["iot", "sensor", "temperature"], "IoT readings in this demo are simulated and labelled 'Simulated IoT reading'. They drive the freshness features: time above 5°C/10°C, temperature excursions and rolling statistics."),
    (["payment", "pay", "refund"], "Payments here are simulated: 'Demo payment — no real money will be charged'. Card, bank transfer, COD and wallet are accepted as demo methods."),
    (["complaint", "problem", "issue", "support", "help"], "Sorry to hear that — you can file a complaint from your dashboard (Complaints) and our team will follow up. For anything urgent, use the Contact page."),
    (["hello", "hi", "salam", "assalam"], "Hello! I'm the ApnaDairy assistant. Ask me about freshness, orders, deliveries, B2B, or farmer onboarding."),
]


def _rule_reply(text: str) -> str:
    lowered = text.lower()
    for keywords, reply in _RULES:
        if any(k in lowered for k in keywords):
            return reply
    return (
        "I can help with freshness scores, batch information, orders and deliveries, "
        "B2B quotations, farmer onboarding and pricing. Could you tell me a bit more?"
    )


@router.post("/chat", response_model=s.ChatReply)
def chat(
    body: s.ChatMessageCreate,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    settings = get_settings()
    session_id = body.session_id or f"sess-{secrets.token_hex(8)}"
    user_id = user.user_id if user else None

    user_msg = ChatbotMessage(user_id=user_id, session_id=session_id, sender="user", message_text=body.message.strip())
    db.add(user_msg)

    # Groq integration point (server-side only). If configured, a real LLM call
    # would go here; the rule engine remains the fallback.
    configured = bool(settings.GROQ_API_KEY)
    reply_text = _rule_reply(body.message)

    bot_msg = ChatbotMessage(user_id=user_id, session_id=session_id, sender="bot", message_text=reply_text)
    db.add(bot_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(bot_msg)
    return s.ChatReply(
        reply=reply_text, session_id=session_id, configured=configured,
        messages=[_msg_out(user_msg), _msg_out(bot_msg)],
    )


@router.get("/chat/history", response_model=list[s.ChatMessageOut])
def chat_history(
    session_id: str | None = None,
    skip: int = 0,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(ChatbotMessage).filter(ChatbotMessage.user_id == user.user_id)
    if session_id:
        q = q.filter(ChatbotMessage.session_id == session_id)
    rows = q.order_by(ChatbotMessage.sent_at).offset(skip).limit(limit).all()
    return [_msg_out(m) for m in rows]

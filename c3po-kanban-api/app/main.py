import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.firebase_db import firebase_auth
from app.agent.c3po import c3po_agent

app = FastAPI(title="C-3PO Kanban API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        os.getenv("FRONTEND_URL", "*"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_service = InMemorySessionService()
runner = Runner(
    agent=c3po_agent,
    app_name="c3po_kanban_app",
    session_service=session_service,
)


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"


async def get_authenticated_user_id(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token Bearer ausente ou inválido.")
    
    token = authorization.replace("Bearer ", "")
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token Firebase inválido ou expirado.")


@app.get("/health")
async def health_check():
    return {"status": "online", "agent": "c3po_kanban"}


@app.post("/api/chat")
async def chat_with_c3po(
    payload: ChatRequest,
    authorization: str = Header(None)
):
    user_id = await get_authenticated_user_id(authorization)
    full_session_id = f"{user_id}:{payload.session_id}"

    session = await session_service.get_session(
        app_name="c3po_kanban_app",
        user_id=user_id,
        session_id=full_session_id
    )
    if not session:
        session = await session_service.create_session(
            app_name="c3po_kanban_app",
            user_id=user_id,
            session_id=full_session_id,
            state={"user_id": user_id}
        )

    user_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=payload.message)]
    )

    final_response = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=full_session_id,
        new_message=user_message
    ):
        if event.is_final_response() and event.content and event.content.parts:
            final_response = event.content.parts[0].text

    return {
        "reply": final_response,
        "session_id": payload.session_id
    }
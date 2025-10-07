from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
from .schemas import GenerateRequest, GenerateResponse, FileItem, WriteRequest
from .ollama_client import generate_json_response


OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "llama3.2")


app = FastAPI(title="Vibe Coding Studio API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def call_ollama(prompt: str) -> str:
    return await generate_json_response(prompt)


def build_system_instructions(user_prompt: str, context: Optional[str]) -> str:
    schema = (
        "Return ONLY JSON with the following structure: {\n"
        "  \"files\": [ { \"path\": string, \"content\": string } ],\n"
        "  \"meta\": object\n"
        "}. No prose, no markdown. Ensure valid JSON."
    )
    guidance = (
        "You generate a minimal full-stack prototype using React + Vite + TypeScript for frontend and FastAPI for backend. "
        "Prefer small, working examples. Keep paths POSIX (use forward slashes)."
    )
    ctx = f"\nContext:\n{context}" if context else ""
    return f"{schema}\n{guidance}\nUser Prompt:\n{user_prompt}{ctx}"


@app.post("/api/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    prompt = build_system_instructions(req.prompt, req.context)
    raw = await call_ollama(prompt)
    # Attempt to parse JSON; if malformed, try to fix basic fence/wrapping
    import json
    text = raw.strip()
    if text.startswith("```)" or text.startswith("```json"):
        text = text.split("```", 2)[1] if "```" in text else text
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Model returned non-JSON output")
    files = [FileItem(**f) for f in obj.get("files", [])]
    meta = obj.get("meta", {})
    return GenerateResponse(files=files, meta=meta)


@app.post("/api/write")
async def write_files(req: WriteRequest):
    root = os.path.abspath(req.rootDir)
    try:
        for f in req.files:
            dest_path = os.path.normpath(os.path.join(root, f.path))
            if not dest_path.startswith(root):
                raise HTTPException(status_code=400, detail="Invalid path outside root")
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            with open(dest_path, "w", encoding="utf-8") as fh:
                fh.write(f.content)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Write error: {str(e)}")
    return {"status": "ok", "written": len(req.files)}



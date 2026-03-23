import json
import re
from typing import List
from fastapi import HTTPException
from google import genai
from app.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def _call_gemini(prompt: str) -> str:
    """Send prompt to Gemini and return text response."""
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail="AI service temporarily unavailable",
        )


async def generate_quiz(
    text: str,
    difficulty: str,
    num_questions: int,
    question_types: List[str],
    weak_topics: List[str] = None,
) -> dict:
    types_str = ", ".join(question_types)
    weak_str = ""
    if weak_topics:
        weak_str = f"\nFocus especially on these weak topics: {', '.join(weak_topics)}"

    prompt = f"""You are a quiz generator. Given the following study material, generate {num_questions} questions.

Difficulty: {difficulty}
Question types to include: {types_str}{weak_str}

Study Material:
{text[:8000]}

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "id": "q1",
      "type": "mcq",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "A",
      "explanation": "...",
      "topic": "..."
    }},
    {{
      "id": "q2",
      "type": "truefalse",
      "question": "...",
      "options": ["True", "False"],
      "correct_answer": "True",
      "explanation": "...",
      "topic": "..."
    }},
    {{
      "id": "q3",
      "type": "fillblank",
      "question": "The capital of France is ____.",
      "options": null,
      "correct_answer": "Paris",
      "explanation": "...",
      "topic": "..."
    }}
  ]
}}"""

    raw = _call_gemini(prompt)

    json_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not json_match:
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable")

    try:
        return json.loads(json_match.group())
    except json.JSONDecodeError:
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable")


async def chat_response(
    message: str,
    context_text: str,
    history: List[dict],
) -> str:
    formatted_history = "\n".join(
        f"{msg['role'].capitalize()}: {msg['content']}" for msg in history[-10:]
    )

    prompt = f"""You are a helpful AI study tutor for a student. Answer the student's question
based ONLY on the provided study material context below.
If the answer is not in the material, say so politely and offer a general explanation.

Study Material Context:
{context_text[:6000]}

Conversation so far:
{formatted_history}

Student's question: {message}

Provide a clear, helpful, and educational response."""

    return _call_gemini(prompt)
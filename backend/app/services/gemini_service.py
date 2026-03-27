import json
import re
import asyncio
from typing import List, Optional
from fastapi import HTTPException
from google import genai
from groq import AsyncGroq
from app.config import settings

# Initialize Clients
gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

# Priority order for models
GEMINI_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b"]
GROQ_MODEL = "llama-3.3-70b-versatile"

async def _call_ai(prompt: str, is_json: bool = False) -> str:
    """
    Asynchronous AI caller with model fallback. 
    Tries Gemini models first, then fails over to Groq.
    """
    last_error = None

    # 1. Try Gemini Models
    for model in GEMINI_MODELS:
        for attempt in range(2):
            try:
                # Use Gemini's async (aio) generator
                response = await gemini_client.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json" if is_json else "text/plain"
                    }
                )
                return response.text
            except Exception as e:
                err_str = str(e)
                print(f"⚠️ Gemini [{model}] attempt {attempt+1} failed: {err_str[:100]}")
                last_error = e

                # Handle Rate Limits / Quota
                if any(x in err_str for x in ["429", "RESOURCE_EXHAUSTED", "quota"]):
                    if attempt == 0:
                        await asyncio.sleep(5)  # Non-blocking wait
                    continue  # Try next attempt or next model
                break # Non-quota error, move to next model

    # 2. Fallback to Groq if all Gemini models fail
    print(f"🚀 Gemini failed. Falling back to Groq ({GROQ_MODEL})...")
    try:
        chat_completion = await groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=GROQ_MODEL,
            response_format={"type": "json_object"} if is_json else None
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"❌ All AI services failed. Groq error: {e}")
        raise HTTPException(
            status_code=503,
            detail="AI services are currently reaching capacity. Please try again in 30 seconds."
        )

async def extract_topics(text: str) -> List[str]:
    """
    Analyze the document and extract only topics that have enough
    content to generate meaningful quiz questions from.
    """
    prompt = f"""You are analyzing a study document to identify quiz-worthy topics.

Your task: Extract topics that have ENOUGH CONTENT to generate at least 2-3 quiz questions.

RULES:
- Only include topics with substantial explanations, definitions, examples, or facts in the text
- Do NOT include topics that are merely mentioned by name without explanation
- Do NOT include generic headings like "Introduction", "Summary", "Conclusion", "References"
- Each topic should be specific and meaningful (e.g. "Floyd-Warshall Algorithm" not just "Algorithms")
- Return between 3 and 15 topics maximum

Document:
{text[:10000]}

Return ONLY a JSON object:
{{"topics": ["Topic 1", "Topic 2", "Topic 3"]}}"""

    raw = await _call_ai(prompt, is_json=True)
    try:
        raw = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        return data.get("topics", [])
    except Exception:
        return []


async def generate_quiz(
    text: str,
    difficulty: str,
    num_questions: int,
    question_types: List[str],
    weak_topics: Optional[List[str]] = None,
    selected_topics: Optional[List[str]] = None,
) -> dict:
    weak_str = f"\nFocus especially on these weak topics: {', '.join(weak_topics)}" if weak_topics else ""
    topics_str = f"\nOnly generate questions about these topics: {', '.join(selected_topics)}" if selected_topics else ""

    # Build per-type format examples so the AI knows exactly what each type looks like
    type_examples = []
    if "mcq" in question_types:
        type_examples.append("""{
      "id": "q1",
      "type": "mcq",
      "question": "What is X?",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "correct_answer": "A",
      "explanation": "Because...",
      "topic": "Topic Name"
    }""")
    if "truefalse" in question_types:
        type_examples.append("""{
      "id": "q2",
      "type": "truefalse",
      "question": "X is true.",
      "options": ["True", "False"],
      "correct_answer": "True",
      "explanation": "Because...",
      "topic": "Topic Name"
    }""")
    if "fillblank" in question_types:
        type_examples.append("""{
      "id": "q3",
      "type": "fillblank",
      "question": "The capital of France is ___.",
      "options": [],
      "correct_answer": "Paris",
      "explanation": "Because...",
      "topic": "Topic Name"
    }""")

    examples_str = ",\n    ".join(type_examples)
    types_list = ", ".join(question_types)

    # Calculate roughly how many of each type to request
    n = len(question_types)
    per_type = num_questions // n
    remainder = num_questions % n
    distribution = ", ".join(
        f"{per_type + (1 if i < remainder else 0)} {t}"
        for i, t in enumerate(question_types)
    )

    prompt = f"""You are a quiz generator. Generate exactly {num_questions} questions from the material below.

IMPORTANT RULES:
- You MUST use ONLY these question types: {types_list}
- Distribute questions as follows: {distribution}
- Every question MUST have the correct "type" field set to one of: {types_list}
- For "mcq": provide exactly 4 options as ["A. ...", "B. ...", "C. ...", "D. ..."], correct_answer is the letter only e.g. "A"
- For "truefalse": options must be ["True", "False"], correct_answer must be exactly "True" or "False"
- For "fillblank": options must be [], correct_answer is the exact word/phrase that fills the blank
- Difficulty: {difficulty}
{weak_str}{topics_str}

Material:
{text[:8000]}

Return ONLY a JSON object in this exact format:
{{
  "questions": [
    {examples_str}
  ]
}}"""

    raw = await _call_ai(prompt, is_json=True)
    
    try:
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise HTTPException(status_code=500, detail="Failed to parse AI response.")

async def chat_response(
    message: str,
    context_text: str,
    history: List[dict],
) -> str:
    formatted_history = "\n".join(
        f"{msg['role'].capitalize()}: {msg['content']}" for msg in history[-5:]
    )

    prompt = f"""You are an AI study tutor. Use the material below.
    Material: {context_text[:6000]}
    History: {formatted_history}
    Student: {message}
    Tutor:"""

    return await _call_ai(prompt, is_json=False)
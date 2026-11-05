"""General-purpose helper utilities."""

import re
import json


def safe_json_loads(text: str, default=None):
    """Parse JSON, returning default on failure."""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return default if default is not None else {}


def extract_json_from_llm_response(text: str) -> dict | list:
    """
    Extract a JSON block from an LLM response that may contain markdown fences
    or extra prose around the JSON.
    """
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Strip markdown code fences
    code_block = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass

    # Find first { ... } or [ ... ] block
    match = re.search(r"(\{[\s\S]+\}|\[[\s\S]+\])", text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    return {}


def truncate_text(text: str, max_chars: int = 3000) -> str:
    """Truncate text to max_chars, preserving word boundaries."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")
    return truncated[:last_space] + "..." if last_space > 0 else truncated + "..."


def difficulty_to_score(difficulty: str) -> int:
    """Map difficulty label to a numeric score for progression tracking."""
    return {"easy": 25, "medium": 50, "hard": 75, "expert": 100}.get(difficulty, 50)


def next_difficulty(current: str, score: float) -> str:
    """
    Adaptive difficulty selection based on answer score.
    score < 0.35  → step down
    score 0.35-0.65 → stay
    score > 0.65 → step up
    """
    ladder = ["easy", "medium", "hard", "expert"]
    idx = ladder.index(current) if current in ladder else 1

    if score < 0.35 and idx > 0:
        idx -= 1
    elif score > 0.65 and idx < len(ladder) - 1:
        idx += 1

    return ladder[idx]

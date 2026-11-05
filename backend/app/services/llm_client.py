"""
LLM client factory.
Supports OpenAI and Google Gemini, selected via LLM_PROVIDER env var.
"""

import os
from functools import lru_cache

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()


@lru_cache(maxsize=1)
def get_llm():
    """Return a LangChain chat model instance (cached)."""
    if LLM_PROVIDER == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=os.getenv("GEMINI_MODEL", "gemini-pro"),
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.7,
            convert_system_message_to_human=True,
        )
    else:  # default: openai
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7,
        )


def invoke_llm(prompt: str) -> str:
    """Send a plain string prompt and return the text response."""
    from langchain_core.messages import HumanMessage
    llm = get_llm()
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content.strip()

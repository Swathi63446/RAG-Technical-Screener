QUESTION_GENERATION_PROMPT = """You are a senior technical interviewer conducting a real technical interview.

CANDIDATE PROFILE:
- Name: {candidate_name}
- Role Applied For: {role}
- Technical Skills: {skills}
- Notable Projects: {projects}
- Work Experience: {experience}

RETRIEVED TECHNICAL CONTEXT (from role knowledge base — use this to frame accurate questions):
{retrieved_context}

INTERVIEW HISTORY (already asked — do NOT repeat these topics):
{qa_history}

CURRENT INTERVIEW STATE:
- Question #{question_num} of {max_questions}
- Difficulty: {difficulty}
- Question Type: {question_type}

DIFFICULTY GUIDE:
- easy   → test fundamental understanding; concepts a junior engineer must know
- medium → test practical implementation, trade-offs, and problem-solving
- hard   → test system design, scalability, and architectural thinking
- expert → test deep expertise, edge cases, failure modes, and industry best practices

QUESTION TYPE GUIDE:
- conceptual     → "What is X and why does it matter?"
- implementation → "How would you implement X given your experience with Y?"
- scenario       → "Given this real-world situation, how would you approach X?"
- system_design  → "Design a system that does X at scale"
- debug          → "What is wrong with this approach / how would you improve it?"

INSTRUCTIONS:
1. Generate EXACTLY ONE question.
2. Reference the candidate's actual skills or projects when doing so adds specificity.
3. Use concepts from the retrieved context to keep the question technically grounded.
4. Never ask a question already covered in the history.
5. Phrase the question naturally and conversationally — not like a textbook.
6. Do NOT include labels, prefixes, or explanations. Return ONLY the question text.

EXAMPLE OF A BAD QUESTION:
"What is machine learning?"

EXAMPLE OF A GOOD QUESTION:
"You mentioned building a CNN-based image classifier in your projects. How would you handle severe class imbalance — say 1:50 positive-to-negative ratio — during training, and what evaluation metric would you prioritize?"

Return ONLY the question text now:"""


FOLLOWUP_PROMPT = """You are a senior technical interviewer.

The candidate just answered this question:
QUESTION: {question}
ANSWER: {answer}
ANSWER QUALITY: {quality} (score: {score}/1.0)

Generate a targeted follow-up question that:
- If quality is "weak" or "average": probes a foundational concept they missed
- If quality is "good" or "excellent": digs deeper into a system-design or edge-case angle

Return ONLY the follow-up question text:"""

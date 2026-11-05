EVALUATION_PROMPT = """You are evaluating a technical interview answer. Be fair, specific, and constructive.

QUESTION: {question}
ROLE: {role}
TOPIC: {topic}
DIFFICULTY: {difficulty}

CANDIDATE'S ANSWER:
{answer}

Evaluate the answer and return a JSON object with EXACTLY this structure:
{{
  "score": <float 0.0–1.0>,
  "quality": "<one of: weak | average | good | excellent>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "weaknesses": ["<specific weakness or missing concept 1>", "<specific weakness 2>"],
  "key_concepts_covered": ["<concept 1>", "<concept 2>"],
  "key_concepts_missing": ["<missing concept 1>", "<missing concept 2>"],
  "next_difficulty": "<one of: easy | medium | hard | expert>",
  "feedback": "<2-3 sentence constructive feedback the candidate would find useful>",
  "topic": "<main technical topic this question covered, e.g. 'Overfitting', 'Caching', 'SQL'>",
  "confidence": <float 0.0–1.0 representing how confident you are in this evaluation>
}}

Scoring guide:
- 0.00–0.25 → weak: candidate shows little to no understanding
- 0.26–0.50 → average: basic understanding, missing key concepts
- 0.51–0.75 → good: solid understanding with minor gaps
- 0.76–1.00 → excellent: comprehensive, well-articulated, accurate answer

Return ONLY valid JSON. No prose, no markdown fences."""


SUMMARY_PROMPT = """You are generating a final interview evaluation report for hiring managers.

CANDIDATE: {candidate_name}
ROLE: {role}

INTERVIEW DATA:
{interview_data}

Generate a comprehensive evaluation JSON with EXACTLY this structure:
{{
  "overall_score": <float 0–100>,
  "performance_level": "<one of: Needs Improvement | Average | Good | Strong | Exceptional>",
  "topics_covered": [
    {{"topic": "<topic name>", "score": <0–100>, "questions_asked": <int>}}
  ],
  "strengths": ["<demonstrated strength 1>", "<strength 2>", "<strength 3>"],
  "improvement_areas": ["<area 1>", "<area 2>", "<area 3>"],
  "skill_gaps": ["<specific skill or concept gap 1>", "<gap 2>"],
  "recommendations": [
    "<specific actionable recommendation 1>",
    "<recommendation 2>",
    "<recommendation 3>"
  ],
  "hiring_recommendation": "<one of: Strong Hire | Hire | Borderline | No Hire>",
  "summary_text": "<4-6 sentence overall narrative evaluation>",
  "difficulty_scores": [<score per question as 0–100, preserving order>],
  "technical_depth_score": <0–100>,
  "communication_score": <0–100>,
  "skill_heatmap": {{
    "<skill_name>": <0–100>,
    ...
  }}
}}

Return ONLY valid JSON. No prose, no markdown fences."""

import json
import os
from datetime import datetime
from typing import Any, Dict

from openai import OpenAI


class ExecutiveStrategistAgent:
    def __init__(self):
        self.has_openai_key = bool(os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY"))
        self.system_prompt = """
You are Noble Savage AI, the central intelligence of BBA Services OS.

OUTPUT STRUCTURE:
Always provide responses in a structured Decision Matrix style.
"""

    async def synthesize_treatment_plan(
        self,
        client_id: str,
        financial_data: Dict[str, Any],
        compliance_data: Dict[str, Any],
        funding_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not self.has_openai_key:
            fallback_plan = {
                "health_score": 72,
                "insight": "Complete documentation and maintain positive cash flow to improve funding readiness.",
                "items": [
                    {
                        "title": "Upload Latest Financial Statement",
                        "description": "Ensure the latest statement is available for underwriting review.",
                        "category": "compliance",
                        "priority": "high",
                        "due_date": datetime.utcnow().date().isoformat(),
                    },
                    {
                        "title": "Review Expense Categories",
                        "description": "Confirm recurring expenses are correctly categorized for tax readiness.",
                        "category": "bookkeeping",
                        "priority": "medium",
                        "due_date": datetime.utcnow().date().isoformat(),
                    },
                ],
            }
            return {
                "success": True,
                "treatment_plan": fallback_plan,
                "generated_at": datetime.utcnow().isoformat(),
            }

        llm = OpenAI()
        prompt = f"""
{self.system_prompt}
CLIENT: {client_id}
Financial: {json.dumps(financial_data)}
Compliance: {json.dumps(compliance_data)}
Funding: {json.dumps(funding_data)}
Output JSON with health_score, insight, and items.
"""
        try:
            response = llm.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Always respond with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            return {
                "success": True,
                "treatment_plan": result,
                "generated_at": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            fallback_plan = {
                "health_score": 65,
                "insight": "Fallback plan generated due to AI connectivity issue.",
                "items": [
                    {
                        "title": "Re-run AI Planning",
                        "description": "Retry treatment plan generation once AI connectivity is restored.",
                        "category": "operations",
                        "priority": "medium",
                        "due_date": datetime.utcnow().date().isoformat(),
                    }
                ],
            }
            return {
                "success": True,
                "error": str(e),
                "treatment_plan": fallback_plan,
                "generated_at": datetime.utcnow().isoformat(),
            }

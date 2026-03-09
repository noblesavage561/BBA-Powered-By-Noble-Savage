import json
import os
from typing import Any, Dict, Optional

import openai


class FinancialAgent:
    """
    Financial Agent: Categorizes transactions, calculates metrics,
    and provides financial insights using OpenAI.
    """

    def __init__(self, db_pool: Any):
        self.db_pool = db_pool
        self.has_openai_key = bool(os.getenv("OPENAI_API_KEY"))
        self.llm = openai.OpenAI() if self.has_openai_key else None
        self.categories = [
            "Advertising",
            "Car and Truck Expenses",
            "Contract Labor",
            "Depletion",
            "Depreciation",
            "Employee Benefits",
            "Insurance",
            "Interest",
            "Legal and Professional Services",
            "Office Expenses",
            "Rent or Lease",
            "Repairs and Maintenance",
            "Supplies",
            "Taxes and Licenses",
            "Travel",
            "Meals",
            "Utilities",
            "Wages",
            "Other Expenses",
        ]

    async def categorize_transaction(
        self,
        description: str,
        amount: float,
        previous_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not self.has_openai_key or not self.llm:
            desc = (description or "").lower()
            if "rent" in desc or "lease" in desc:
                category = "Rent or Lease"
                deductible = True
            elif "payroll" in desc or "salary" in desc or "wage" in desc:
                category = "Wages"
                deductible = True
            elif "meal" in desc or "restaurant" in desc:
                category = "Meals"
                deductible = True
            elif "travel" in desc or "flight" in desc or "hotel" in desc:
                category = "Travel"
                deductible = True
            else:
                category = "Office Expenses"
                deductible = amount > 0

            return {
                "success": True,
                "category": category,
                "is_deductible": deductible,
                "confidence": 0.65,
                "reasoning": "Local fallback categorization used (OpenAI unavailable).",
            }

        context_str = json.dumps(previous_context) if previous_context else "No previous context"
        prompt = f"""
Role: Senior Tax Accountant Agent with expertise in IRS Schedule C categories.

Business Context:
{context_str}

Transaction Details:
- Description: {description}
- Amount: ${amount:,.2f}

Task:
1. Categorize this transaction into one of these categories: {', '.join(self.categories)}
2. Determine if it's tax deductible (yes/no)
3. Provide a confidence score (0-1)

Output ONLY valid JSON in this format:
{{
    \"category\": \"Category Name\",
    \"is_deductible\": true/false,
    \"confidence\": 0.95,
    \"reasoning\": \"Brief explanation\"
}}
"""
        try:
            response = self.llm.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a tax expert. Always respond with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            return {
                "success": True,
                "category": result.get("category"),
                "is_deductible": result.get("is_deductible"),
                "confidence": result.get("confidence"),
                "reasoning": result.get("reasoning"),
            }
        except Exception as e:
            return {
                "success": True,
                "error": str(e),
                "category": "Office Expenses",
                "is_deductible": amount > 0,
                "confidence": 0.5,
                "reasoning": "Fallback categorization used after OpenAI request failure.",
            }

    async def get_financial_summary(self, client_id: str) -> Dict[str, Any]:
        if not self.db_pool:
            return {
                "total_income": 0,
                "total_expenses": 0,
                "net_profit": 0,
                "run_rate": 0,
                "monthly_data": [],
                "note": "Database not connected",
            }

        async with self.db_pool.acquire() as conn:
            transactions = await conn.fetch(
                """
                SELECT
                    DATE_TRUNC('month', date) as month,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
                FROM transactions
                WHERE client_id = $1
                    AND date >= NOW() - INTERVAL '3 months'
                GROUP BY DATE_TRUNC('month', date)
                ORDER BY month DESC
                """,
                client_id,
            )

        total_income = sum((t["income"] or 0) for t in transactions)
        total_expenses = sum((t["expenses"] or 0) for t in transactions)
        net_profit = total_income - total_expenses
        run_rate = ((transactions[0]["income"] or 0) * 12) if transactions else 0

        return {
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "net_profit": float(net_profit),
            "run_rate": float(run_rate),
            "monthly_data": [
                {
                    "month": t["month"].strftime("%Y-%m"),
                    "income": float(t["income"] or 0),
                    "expenses": float(t["expenses"] or 0),
                    "net": float((t["income"] or 0) - (t["expenses"] or 0)),
                }
                for t in transactions
            ],
        }

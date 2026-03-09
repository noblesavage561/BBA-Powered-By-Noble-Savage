from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID


class FundingAgent:
    def __init__(self, db_pool: Any):
        self.db_pool = db_pool

    def _is_valid_uuid(self, value: str) -> bool:
        try:
            UUID(value)
            return True
        except (ValueError, TypeError):
            return False

    async def calculate_funding_readiness(self, client_id: str) -> Dict[str, Any]:
        if not self._is_valid_uuid(client_id):
            return {
                "score": 0,
                "components": {
                    "cash_flow": 0,
                    "credit": 0,
                    "compliance": 0,
                    "time_in_business": 0,
                },
                "recommendation": "Invalid client_id format. Expected UUID.",
                "client_id": client_id,
            }

        if not self.db_pool:
            return {
                "score": 0,
                "components": {
                    "cash_flow": 0,
                    "credit": 0,
                    "compliance": 0,
                    "time_in_business": 0,
                },
                "recommendation": "Database not connected.",
                "client_id": client_id,
            }

        async with self.db_pool.acquire() as conn:
            bank_data = await conn.fetchrow(
                """
                SELECT
                    AVG(current_balance) as avg_balance,
                    COUNT(*) as transaction_count
                FROM bank_accounts ba
                JOIN transactions t ON t.bank_account_id = ba.id
                WHERE t.client_id = $1
                    AND t.date >= NOW() - INTERVAL '3 months'
                """,
                client_id,
            )

            credit_score = await conn.fetchval(
                """
                SELECT credit_score FROM client_credit
                WHERE client_id = $1
                ORDER BY created_at DESC
                LIMIT 1
                """,
                client_id,
            ) or 650

            compliance_factor = await conn.fetchval(
                """
                SELECT
                    CASE
                        WHEN COUNT(*) >= 3 THEN 1.0
                        WHEN COUNT(*) >= 1 THEN 0.5
                        ELSE 0.0
                    END
                FROM documents
                WHERE client_id = $1
                    AND doc_category IN ('tax_return', 'financial_statement')
                    AND ocr_status = 'completed'
                """,
                client_id,
            )

            client_data = await conn.fetchrow(
                "SELECT incorporation_date FROM clients WHERE id = $1",
                client_id,
            )

        incorporation_date = client_data["incorporation_date"] if client_data else None
        if incorporation_date:
            years_in_business = (datetime.now().date() - incorporation_date).days / 365
        else:
            years_in_business = 1

        avg_balance = float(bank_data["avg_balance"] or 0)
        cash_flow_component = min(avg_balance / 10000, 3) * 15
        credit_component = (credit_score / 850) * 30
        compliance_component = float(compliance_factor or 0) * 25
        time_component = min(years_in_business / 5, 1) * 10

        funding_score = round(
            cash_flow_component + credit_component + compliance_component + time_component, 1
        )

        return {
            "score": funding_score,
            "components": {
                "cash_flow": round(cash_flow_component, 1),
                "credit": round(credit_component, 1),
                "compliance": round(compliance_component, 1),
                "time_in_business": round(time_component, 1),
            },
            "recommendation": self._get_readiness_recommendation(funding_score),
        }

    def _get_readiness_recommendation(self, score: float) -> str:
        if score >= 80:
            return "Ready for prime-time funding. Apply to SBA Preferred Lenders."
        if score >= 60:
            return "Close to fundable. Focus on credit score and document completion."
        return "Not ready for funding. Follow the Treatment Plan to improve health."

    async def find_funding_matches(self, client_id: str) -> List[Dict[str, Any]]:
        if not self._is_valid_uuid(client_id):
            return []

        readiness = await self.calculate_funding_readiness(client_id)
        if not self.db_pool:
            return []

        async with self.db_pool.acquire() as conn:
            partners = await conn.fetch(
                """
                SELECT * FROM funding_partners
                WHERE active_status = true
                ORDER BY
                    CASE type
                        WHEN 'CDFI' THEN 1
                        WHEN 'SBA_Lender' THEN 2
                        ELSE 3
                    END
                """
            )

        matches: List[Dict[str, Any]] = []
        for partner in partners:
            match_score = 0
            reasons = []

            if readiness["components"]["credit"] >= (partner["min_credit_score"] or 0) * 0.3:
                match_score += 30
                reasons.append("Credit score meets requirement")

            years = readiness["components"]["time_in_business"] / 10 * 5
            if years >= (partner["min_time_in_business"] or 0):
                match_score += 20
                reasons.append("Meets time in business requirement")

            if readiness["components"]["compliance"] >= 15:
                match_score += 25
                reasons.append("Documentation sufficient")

            if partner["type"] == "CDFI":
                match_score += 25
                reasons.append("CDFI mission matches your profile")

            if match_score >= 50:
                matches.append(
                    {
                        "partner": {
                            "id": str(partner["id"]),
                            "name": partner["name"],
                            "type": partner["type"],
                            "min_loan_amount": partner["min_loan_amount"],
                            "max_loan_amount": partner["max_loan_amount"],
                            "geographic_focus": partner["geographic_focus"],
                        },
                        "match_score": match_score,
                        "match_reason": "; ".join(reasons),
                        "readiness_status": readiness["recommendation"],
                    }
                )

        matches.sort(key=lambda x: x["match_score"], reverse=True)
        return matches[:5]

    async def get_funding_readiness(self, client_id: str) -> Dict[str, Any]:
        return await self.calculate_funding_readiness(client_id)

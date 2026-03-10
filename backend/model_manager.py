import json
import os
from typing import Any, Dict, Optional

from openai import AsyncOpenAI, BadRequestError


class ModelManager:
    def __init__(self) -> None:
        env_name = os.getenv("ENVIRONMENT", "development").strip().lower()
        require_ai_default = "true" if env_name in {"production", "prod"} else "false"
        require_ai_key = os.getenv("REQUIRE_AI_KEY", require_ai_default).strip().lower() in {"1", "true", "yes", "on"}

        self.base_url = os.getenv("AI_BASE_URL", "https://api.openai.com/v1").strip()
        self.api_key = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY", "")).strip()
        self.primary_model = os.getenv("PRIMARY_MODEL", "openai/gpt-4o-mini").strip()
        self.secondary_model = os.getenv("SECONDARY_MODEL", "x-ai/grok-beta").strip()
        self.third_model = os.getenv("THIRD_MODEL", "openai/gpt-3.5-turbo").strip()
        self.text_only_model = os.getenv("TEXT_ONLY_MODEL", "openai/gpt-3.5-turbo").strip()
        self.client: Optional[AsyncOpenAI] = None

        if require_ai_key and not self.api_key:
            raise RuntimeError("AI_API_KEY is required when REQUIRE_AI_KEY is enabled")

        if self.api_key:
            self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)

    async def close(self) -> None:
        if self.client:
            await self.client.close()

    def _build_prompt(self) -> str:
        return (
            "You are the BBA Advanced Document Classifier and Financial Auditor. "
            "Your goal is to process uploads with 100% precision for a credit repair workflow. "
            "Step 1: Classification - Identify the document type: "
            "[Government ID, Utility Bill, Credit Report, Bureau Letter, or Unknown]. "
            "Step 2: Validation - Check for 'Bruce B' as the primary name. Check if the document is expired or blurry. "
            "Step 3: Extraction - If ID: Extract Full Name, DOB, Expiry, and Address. "
            "If Bill: Extract Provider, Service Address, and Date. "
            "If Credit Report: Identify every account marked 'Negative', 'Late', or 'Collection'. "
            "Step 4: Logic Check - Does the address on the ID match the address on the Utility Bill? "
            "Output Format: You MUST return a valid JSON object. Do not include prose. "
            "Format: {'document_type': string,'confidence_score': number,'extracted_data': { ... },'action_required': string,'flag_for_staff': boolean}"
        )

    def _image_user_content(self, data_url: str) -> Any:
        return [
            {
                "type": "text",
                "text": self._build_prompt(),
            },
            {
                "type": "image_url",
                "image_url": {"url": data_url},
            },
        ]

    def _text_user_content(self, text_input: str) -> str:
        return (
            f"{self._build_prompt()}\n"
            f"Document text to analyze:\n{text_input[:8000]}"
        )

    async def analyze(
        self,
        *,
        file_name: str,
        mime_type: Optional[str],
        base64_image: Optional[str],
        text_input: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("AI client is not configured")

        is_image = bool(mime_type and mime_type.startswith("image/") and base64_image)
        candidate_models = [self.primary_model, self.secondary_model, self.third_model]
        if not is_image:
            # Prefer fastest model first for text analysis.
            candidate_models = [self.text_only_model, self.primary_model, self.secondary_model, self.third_model]

        data_url = f"data:{mime_type};base64,{base64_image}" if is_image and mime_type and base64_image else None
        messages = [
            {
                "role": "system",
                "content": "Return strict JSON only with the requested schema.",
            },
            {
                "role": "user",
                "content": self._image_user_content(data_url) if is_image and data_url else self._text_user_content(text_input or file_name),
            },
        ]

        last_error: Optional[Exception] = None

        for index, model in enumerate([m for m in candidate_models if m]):
            try:
                completion = await self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    max_tokens=450,
                )
                raw = completion.choices[0].message.content or "{}"
                parsed = json.loads(raw)
                parsed["source"] = "ai"
                parsed["model"] = model
                return parsed
            except BadRequestError as exc:
                last_error = exc
                # Required behavior: specifically retry on 400 using fallback model.
                if getattr(exc, "status_code", None) == 400 and index < len(candidate_models) - 1:
                    continue
                if index < len(candidate_models) - 1:
                    continue
            except Exception as exc:
                last_error = exc
                if index < len(candidate_models) - 1:
                    continue

        if last_error:
            raise RuntimeError(f"all_models_failed:{type(last_error).__name__}")
        raise RuntimeError("all_models_failed")

import json
from app.llm import LLMConfig, LLMFactory
from app.schemas.trade_review import TradeReviewRequest, TradeReviewResponse

class TradeReviewEngine:
    def __init__(self, request: TradeReviewRequest):
        self.request = request
        self.llm_config = LLMConfig()
        self.llm_factory = LLMFactory(self.llm_config)
        self.llm = self.llm_factory.create("review")

    def run(self) -> TradeReviewResponse:
        prompt = self._build_prompt()
        
        try:
            # For litellm wrapped by crewai LLM, we can use call directly
            # crewai LLM uses litellm.completion under the hood. 
            response = self.llm.call(
                messages=[{"role": "user", "content": prompt}],
                # We do not use tools here, just plain text generation
            )
            
            # The return is usually the text content directly if wrapped correctly,
            # or litellm object depending on crewai version. Usually call returns text string.
            content = response
            
            import re
            
            # strip markdown blocks if present
            content = content.strip()
            content = re.sub(r"^```[a-zA-Z]*\n?", "", content)
            content = re.sub(r"\n?```$", "", content)
            content = content.strip()
            
            data = json.loads(content)
            return TradeReviewResponse(**data)
        except json.JSONDecodeError as e:
            # Print the exact content that failed to parse for debugging
            print(f"Failed to parse JSON. Content was:\n{content}")
            raise RuntimeError(f"JSON Parsing failed: {e}")
        except Exception as e:
            raise RuntimeError(f"LLM call failed: {e}")

    def _build_prompt(self) -> str:
        req = self.request
        analysis_json = req.analysis_result_json or "No original analysis available."
        
        return f"""You are a professional quantitative trading coach and mentor. 
Your task is to review a recently closed trade and provide a structured JSON evaluation.

## Trade Execution Data
- Symbol: {req.symbol}
- Direction: {req.direction}
- Entry: {req.entry_price} @ {req.entry_at}
- Exit: {req.exit_price} @ {req.exit_at or 'N/A'}
- SL / TP Levels: {req.stop_loss or 'None'} / {req.take_profit or 'None'}
- PnL: {req.pnl_quote} ({req.pnl_percentage}%)
- Leverage: {req.leverage}x
- Tags: {req.tags or 'None'}
- Exit Notes: {req.notes or 'None'}

## Original AI Analysis (at time of entry)
{analysis_json}

## Instructions
Review the trade based on the following dimensions:
1. Plan Adherence: Did the trader follow the original AI plan? (Direction, SL/TP placement)
2. SL/TP Rationality: Were the Stop-Loss and Take-Profit levels technically rational based on the analysis context?
3. Timing: Was the exit early, late, or optimal? Did they exit via stop loss, take profit, or manually (if notes explain)?
4. Improvement Advice: What should the trader change next time a similar setup occurs?

Return your evaluation EXACTLY in the following JSON schema. 
CRITICAL RULES:
1. ONLY return the JSON object, absolutely NO markdown formatting (do not use ```json).
2. Do NOT use newlines (\n) inside string values.
3. Escape any double quotes inside string values.
4. Ensure the JSON is strictly valid.

{{
  "verdict": "good" | "fair" | "poor",
  "execution_score": 0.0 to 1.0,
  "plan_adherence": true,
  "plan_adherence_explanation": "string",
  "sl_tp_rational": true,
  "sl_tp_analysis": "string",
  "timing_verdict": "early_exit" | "late_exit" | "optimal",
  "timing_explanation": "string",
  "improvement_advice": "string"
}}
"""

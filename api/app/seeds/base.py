# app/seeds/base.py
#
# Single source of truth for all topic rules.
# Both tutor_service and rush_service consume these models.
# Never hardcode vocab, constraints or structures in service files —
# add them here and reference via SeedLoader.

from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field, model_validator


# ─────────────────────────────────────────────────────────────
# SHARED — used by both tutor_service and rush_service
# ─────────────────────────────────────────────────────────────

class VocabRule(BaseModel):
    """One forbidden→replacement pair."""
    forbidden: str
    replacement: str


# ─────────────────────────────────────────────────────────────
# TUTOR CONFIG
# ─────────────────────────────────────────────────────────────

class PhaseConfig(BaseModel):
    """Rules for a single tutor phase (EXPLAIN / TEST / FEEDBACK)."""
    max_bubbles: int = 3
    interaction_types: list[str] = Field(default_factory=lambda: ["CHIPS"])
    requires_correct_answer: bool = False
    must_end_with_confirmation: bool = False
    assessment_source: Literal["deterministic", "model"] = "deterministic"


class TutorConstraints(BaseModel):
    """Low-level output constraints for the tutor."""
    place_value_correction: bool = False
    max_sentence_words: int = 12
    distractor_strategy: Literal[
        "off_by_one", "off_by_position", "semantic", "semantic_similarity"
    ] = "off_by_one"


class TutorConfig(BaseModel):
    """Everything tutor_service needs from the seed."""
    phases: dict[str, PhaseConfig] = Field(default_factory=dict)
    constraints: TutorConstraints = Field(default_factory=TutorConstraints)

    @model_validator(mode="after")
    def _ensure_default_phases(self) -> TutorConfig:
        defaults: dict[str, PhaseConfig] = {
            "EXPLAIN": PhaseConfig(
                max_bubbles=3,
                interaction_types=["EXPLANATION"],
                must_end_with_confirmation=True,
            ),
            "TEST": PhaseConfig(
                interaction_types=["CHIPS", "TRUE_FALSE", "DIRECT_INPUT"],
                requires_correct_answer=True,
                assessment_source="deterministic",
            ),
            "FEEDBACK": PhaseConfig(
                interaction_types=["CHIPS"],
                assessment_source="deterministic",
            ),
        }
        for phase, cfg in defaults.items():
            self.phases.setdefault(phase, cfg)
        return self


# ─────────────────────────────────────────────────────────────
# RUSH CONFIG
# ─────────────────────────────────────────────────────────────

class RushConfig(BaseModel):
    """Everything rush_service needs from the seed."""
    structures: list[str] = Field(default_factory=list)
    distractor_strategy: Literal[
        "off_by_one", "off_by_position", "semantic"
    ] = "off_by_one"
    positional_correction: bool = False
    difficulty_range: tuple[int, int] = (1, 4)

    @model_validator(mode="after")
    def _validate_difficulty_range(self) -> RushConfig:
        lo, hi = self.difficulty_range
        if lo < 1 or hi > 4 or lo > hi:
            raise ValueError(
                f"difficulty_range must be within [1,4] and lo <= hi, got {self.difficulty_range}"
            )
        return self


# ─────────────────────────────────────────────────────────────
# ROOT SEED MODEL
# ─────────────────────────────────────────────────────────────

class TopicSeed(BaseModel):
    """
    Complete seed for one curriculum topic.
    Loaded from YAML by SeedLoader — never instantiated manually.

    Example usage:
        seed = SeedLoader.get("mat_valor_posicional")
        seed.apply_vocab(text)          # post-process LLM output
        seed.tutor.phases["TEST"]       # phase config for tutor
        seed.rush.structures            # allowed structures for rush
    """

    # identity
    id: str
    subject: str
    topic: str
    grade: list[int]

    # shared rules
    vocab_rules: list[VocabRule] = Field(default_factory=list)
    forbidden_words: list[str] = Field(default_factory=list)
    curriculum_notes: list[str] = Field(default_factory=list)
    local_examples: list[str] = Field(default_factory=list)

    # service-specific config
    tutor: TutorConfig = Field(default_factory=TutorConfig)
    rush: RushConfig = Field(default_factory=RushConfig)

    # ── helpers ──────────────────────────────────────────────

    def apply_vocab(self, text: str) -> str:
        """
        Post-process LLM output: replace all forbidden words with
        child-friendly alternatives defined in vocab_rules.

        Replaces full-word and substring matches (case-insensitive).
        Always call this on LLM output before returning to the client.
        """
        for rule in self.vocab_rules:
            # case-insensitive, whole-phrase replacement
            import re
            pattern = re.compile(re.escape(rule.forbidden), re.IGNORECASE)
            text = pattern.sub(rule.replacement, text)
        return text

    def has_forbidden(self, text: str) -> list[str]:
        """
        Returns list of forbidden words found in text.
        Used by the validator to flag inappropriate vocabulary.
        """
        text_lower = text.lower()
        return [w for w in self.forbidden_words if w.lower() in text_lower]

    def compact_vocab_block(self, limit: int = 12) -> str:
        """
        Returns a compact vocab string for prompt injection.
        Replaces the old _VOCAB_BLOCK giant string.

        Example output:
            "algarismo→número | calcular→descobrir quanto é | ..."
        """
        pairs = [
            f"{r.forbidden}→{r.replacement}"
            for r in self.vocab_rules[:limit]
        ]
        return " | ".join(pairs)

    def phase_config(self, phase: str) -> PhaseConfig:
        """Convenience accessor with fallback to default PhaseConfig."""
        return self.tutor.phases.get(phase, PhaseConfig())
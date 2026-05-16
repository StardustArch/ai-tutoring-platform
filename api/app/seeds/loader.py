# app/seeds/loader.py
#
# SeedLoader — reads YAML files, validates with Pydantic, caches in memory.
#
# Usage:
#   from app.seeds.loader import SeedLoader
#
#   seed = SeedLoader.get("mat_valor_posicional")   # by id
#   seed = SeedLoader.get_by_topic("Valor Posicional", subject="Matemática")
#   all_seeds = SeedLoader.all()
#
# Seeds are loaded once on first access and cached for the process lifetime.
# Call SeedLoader.reload() in tests or after editing YAML files.

from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterator

import yaml

from app.seeds.base import TopicSeed

logger = logging.getLogger(__name__)

# Default directory: app/seeds/topics/
_DEFAULT_SEEDS_DIR = Path(__file__).parent / "topics"


class SeedNotFoundError(KeyError):
    """Raised when a seed id or topic name cannot be found."""


class SeedLoader:
    """
    Static loader and in-memory cache for TopicSeed objects.

    All methods are class-level — no instantiation needed.
    """

    _cache: dict[str, TopicSeed] = {}      # keyed by seed.id
    _loaded: bool = False
    _seeds_dir: Path = _DEFAULT_SEEDS_DIR

    # ── public API ───────────────────────────────────────────

    @classmethod
    def get(cls, seed_id: str) -> TopicSeed:
        """
        Return seed by id (e.g. "mat_valor_posicional").
        Raises SeedNotFoundError if not found.
        """
        cls._ensure_loaded()
        seed = cls._cache.get(seed_id)
        if seed is None:
            available = list(cls._cache.keys())
            raise SeedNotFoundError(
                f"Seed '{seed_id}' not found. Available: {available}"
            )
        return seed

    @classmethod
    def get_by_topic(cls, topic: str, subject: str | None = None) -> TopicSeed:
        """
        Return seed by topic name, optionally filtered by subject.
        Match is case-insensitive.

        Example:
            SeedLoader.get_by_topic("Valor Posicional", subject="Matemática")
        """
        cls._ensure_loaded()
        for seed in cls._cache.values():
            topic_match = seed.topic.lower() == topic.lower()
            subject_match = (subject is None) or (seed.subject.lower() == subject.lower())
            if topic_match and subject_match:
                return seed
        raise SeedNotFoundError(
            f"No seed found for topic='{topic}' subject='{subject}'"
        )

    @classmethod
    def get_by_subject(cls, subject: str) -> list[TopicSeed]:
        """Return all seeds for a given subject."""
        cls._ensure_loaded()
        return [
            s for s in cls._cache.values()
            if s.subject.lower() == subject.lower()
        ]

    @classmethod
    def all(cls) -> list[TopicSeed]:
        """Return all loaded seeds."""
        cls._ensure_loaded()
        return list(cls._cache.values())

    @classmethod
    def reload(cls, seeds_dir: Path | None = None) -> None:
        """
        Force reload all seeds from disk.
        Useful in tests or after editing YAML files.
        """
        if seeds_dir:
            cls._seeds_dir = seeds_dir
        cls._cache.clear()
        cls._loaded = False
        cls._load_all()

    @classmethod
    def ids(cls) -> list[str]:
        """Return all loaded seed ids."""
        cls._ensure_loaded()
        return list(cls._cache.keys())

    # ── internal ─────────────────────────────────────────────

    @classmethod
    def _ensure_loaded(cls) -> None:
        if not cls._loaded:
            cls._load_all()

    @classmethod
    def _load_all(cls) -> None:
        seeds_dir = cls._seeds_dir
        if not seeds_dir.exists():
            logger.warning(
                f"[SeedLoader] Seeds directory not found: {seeds_dir}. "
                "No seeds loaded."
            )
            cls._loaded = True
            return

        loaded_count = 0
        error_count = 0

        for yaml_path in cls._iter_yaml_files(seeds_dir):
            try:
                seed = cls._load_file(yaml_path)
                if seed.id in cls._cache:
                    logger.warning(
                        f"[SeedLoader] Duplicate seed id '{seed.id}' in "
                        f"{yaml_path} — skipping."
                    )
                    continue
                cls._cache[seed.id] = seed
                loaded_count += 1
                logger.debug(f"[SeedLoader] Loaded: {seed.id} ({yaml_path.name})")
            except Exception as exc:
                error_count += 1
                logger.error(f"[SeedLoader] Failed to load {yaml_path}: {exc}")

        cls._loaded = True
        logger.info(
            f"[SeedLoader] {loaded_count} seed(s) loaded, {error_count} error(s)."
        )

    @staticmethod
    def _iter_yaml_files(root: Path) -> Iterator[Path]:
        """Recursively yield all .yaml / .yml files under root."""
        for path in sorted(root.rglob("*.yaml")):
            yield path
        for path in sorted(root.rglob("*.yml")):
            yield path

    @staticmethod
    def _load_file(path: Path) -> TopicSeed:
        """Read one YAML file and return a validated TopicSeed."""
        with path.open(encoding="utf-8") as f:
            raw = yaml.safe_load(f)

        if not isinstance(raw, dict):
            raise ValueError(f"Expected a YAML mapping, got {type(raw)}")

        return TopicSeed.model_validate(raw)
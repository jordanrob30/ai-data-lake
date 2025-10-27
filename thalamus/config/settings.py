"""Application settings and configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Settings
    app_name: str = "Thalamus Schema Analyzer"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    debug: bool = False

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8001
    reload: bool = True  # Enable hot reload in development

    # AWS Bedrock Settings
    aws_region: str = "eu-west-2"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    bedrock_model_id: str = "anthropic.claude-3-7-sonnet-20250219-v1:0"
    bedrock_timeout: int = 30

    # Platform Integration
    platform_api_url: str = "http://platform"
    platform_api_timeout: int = 30

    # LangSmith Configuration for Observability
    langsmith_enabled: bool = False
    langsmith_api_key: Optional[str] = None
    langsmith_project: str = "thalamus-schema-analyzer"
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_tracing_v2: bool = True

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"  # "json" or "console"

    # Performance
    max_workers: int = 4
    request_timeout: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# Create singleton instance
settings = Settings()
"""Centralized LLM configuration for all agent nodes."""

import os
import boto3
from langchain_aws import ChatBedrock
from config import settings
import structlog

logger = structlog.get_logger()


def get_bedrock_llm(temperature: float = 0.2, max_tokens: int = 4096):
    """
    Get a configured Bedrock LLM instance with proper credentials.

    Args:
        temperature: The temperature for the model (0.0 to 1.0)
        max_tokens: Maximum number of tokens to generate

    Returns:
        ChatBedrock instance configured with credentials and model settings
    """
    # Create a boto3 client with appropriate credentials
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        # Use provided credentials
        bedrock_client = boto3.client(
            service_name="bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        logger.debug("Using configured AWS credentials for Bedrock")
    else:
        # Use default credentials chain (environment variables, IAM role, etc.)
        bedrock_client = boto3.client(
            service_name="bedrock-runtime",
            region_name=settings.aws_region,
        )
        logger.debug("Using environment/IAM credentials for Bedrock")

    # Create ChatBedrock instance with the configured client
    return ChatBedrock(
        client=bedrock_client,
        model_id=settings.bedrock_model_id,
        model_kwargs={
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
    )
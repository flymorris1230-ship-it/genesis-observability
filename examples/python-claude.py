"""
Genesis Observability - Claude Integration Example (Python)

This example shows how to integrate Genesis Observability with Anthropic Claude
to track token usage, costs, and latency.
"""

import os
import time
import requests
import anthropic

# Observability configuration
OBSERVABILITY_CONFIG = {
    'api_url': 'https://obs-edge.flymorris1230.workers.dev/ingest',
    'api_key': 'a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e',
    'project_id': 'my-app'  # Change this to your project name
}

# Initialize Claude client
client = anthropic.Anthropic(
    api_key=os.environ.get('ANTHROPIC_API_KEY')
)


def send_to_observability(
    project_id: str,
    model: str,
    provider: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: int,
    metadata: dict = None
):
    """Send usage data to observability system"""
    try:
        response = requests.post(
            OBSERVABILITY_CONFIG['api_url'],
            headers={
                'Authorization': f"Bearer {OBSERVABILITY_CONFIG['api_key']}",
                'Content-Type': 'application/json'
            },
            json={
                'project_id': project_id,
                'model': model,
                'provider': provider,
                'input_tokens': input_tokens,
                'output_tokens': output_tokens,
                'latency_ms': latency_ms,
                'metadata': metadata or {}
            }
        )

        if response.ok:
            result = response.json()
            print(f'✅ Observability data sent: {result}')
        else:
            print(f'❌ Failed to send observability data: {response.text}')

    except Exception as error:
        print(f'❌ Error sending observability data: {error}')


def chat(prompt: str, user_id: str = None) -> str:
    """Chat with Claude and track usage"""
    start_time = time.time()

    try:
        # Call Claude
        message = client.messages.create(
            model='claude-3-sonnet-20240229',
            max_tokens=1024,
            messages=[{'role': 'user', 'content': prompt}]
        )

        end_time = time.time()
        latency = int((end_time - start_time) * 1000)

        # Send to observability (non-blocking)
        send_to_observability(
            project_id=OBSERVABILITY_CONFIG['project_id'],
            model='claude-3-sonnet',
            provider='anthropic',
            input_tokens=message.usage.input_tokens,
            output_tokens=message.usage.output_tokens,
            latency_ms=latency,
            metadata={
                'user_id': user_id,
                'feature': 'chat',
                'environment': os.environ.get('ENV', 'development')
            }
        )

        return message.content[0].text

    except Exception as error:
        print(f'❌ Claude error: {error}')
        raise


def main():
    """Example usage"""
    print('🤖 Claude + Genesis Observability Example\n')

    # Example 1: Simple chat
    print('📝 Example 1: Simple chat')
    response1 = chat('What is the capital of France?', user_id='user-123')
    print(f'Response: {response1}\n')

    # Example 2: Chat with more context
    print('📝 Example 2: Chat with more context')
    response2 = chat(
        'Explain quantum computing in simple terms',
        user_id='user-456'
    )
    print(f'Response: {response2[:100]}...\n')

    print('✅ All examples completed!')
    print('📊 Check your dashboard: https://genesis-observability-obs-dashboard.vercel.app')


if __name__ == '__main__':
    main()

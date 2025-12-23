import json
import os
import replicate
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Разделение аудио через Replicate API с моделью Demucs v4.
    Извлекает вокал, инструментал, бас и барабаны из аудио файла.
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        audio_url = body_data.get('audio_url')
        separation_type = body_data.get('type', 'vocals')
        
        if not audio_url:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'audio_url is required'}),
                'isBase64Encoded': False
            }
        
        replicate_token = os.environ.get('REPLICATE_API_TOKEN')
        if not replicate_token:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'REPLICATE_API_TOKEN not configured'}),
                'isBase64Encoded': False
            }
        
        os.environ['REPLICATE_API_TOKEN'] = replicate_token
        
        output = replicate.run(
            "cjwbw/demucs:1d0ee79db0e28f9bd2daf950b2e433f1e58743c835827bd161f5df8ad4f82bfb",
            input={
                "audio": audio_url
            }
        )
        
        output_urls = {}
        if output and isinstance(output, dict):
            mapping = {
                'vocals': output.get('vocals'),
                'accompaniment': output.get('other'),
                'bass': output.get('bass'),
                'drums': output.get('drums')
            }
            output_urls = {separation_type: mapping.get(separation_type, output.get('vocals'))}
        
        result = {
            'status': 'completed',
            'request_id': context.request_id,
            'output': output_urls.get(separation_type) if output_urls else output
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
import json
import os
import boto3
import replicate
from typing import Dict, Any

s3 = boto3.client('s3',
    endpoint_url='https://bucket.poehali.dev',
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Обработка аудио: разделение вокала и инструментала через Replicate API.
    Принимает URL аудиофайла, возвращает ссылки на обработанные треки.
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
        
        stem_mapping = {
            'vocals': 'vocals',
            'accompaniment': 'no_vocals',
            'bass': 'bass',
            'drums': 'drums',
            'other': 'other'
        }
        
        stem_type = stem_mapping.get(separation_type, 'vocals')
        
        output = replicate.run(
            "jarredou/demucs-v4:10a168f7e46a8def5b63b94c07afd23f4a24bdd1c7a76eeb8e03f56f96be0e8a",
            input={
                "audio": audio_url,
                "stem": stem_type
            }
        )
        
        result = {
            'status': 'completed',
            'request_id': context.request_id,
            'output': output
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
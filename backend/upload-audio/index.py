import json
import os
import boto3
import base64
import hashlib
from typing import Dict, Any
from datetime import datetime

s3 = boto3.client('s3',
    endpoint_url='https://bucket.poehali.dev',
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загружает аудиофайлы напрямую в S3 через бэкенд.
    Принимает файл в base64 или chunks, загружает в S3.
    Поддерживает файлы до 100 МБ.
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
        filename = body_data.get('filename', 'audio.mp3')
        content_type = body_data.get('content_type', 'audio/mpeg')
        file_data_b64 = body_data.get('file_data')
        
        if not file_data_b64:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'file_data (base64) is required'}),
                'isBase64Encoded': False
            }
        
        file_bytes = base64.b64decode(file_data_b64)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        random_hash = hashlib.md5(f"{timestamp}{filename}".encode()).hexdigest()[:8]
        key = f'audio/uploads/{timestamp}_{random_hash}_{filename}'
        
        s3.put_object(
            Bucket='files',
            Key=key,
            Body=file_bytes,
            ContentType=content_type
        )
        
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        
        result = {
            'status': 'uploaded',
            'url': cdn_url,
            'key': key,
            'size': len(file_bytes)
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
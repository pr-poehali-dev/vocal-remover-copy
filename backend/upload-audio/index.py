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
    Генерирует presigned POST URL для загрузки аудиофайлов в S3.
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
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        random_hash = hashlib.md5(f"{timestamp}{filename}".encode()).hexdigest()[:8]
        key = f'audio/uploads/{timestamp}_{random_hash}_{filename}'
        
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        
        presigned_post = s3.generate_presigned_post(
            Bucket='files',
            Key=key,
            Fields={'Content-Type': content_type},
            Conditions=[
                {'Content-Type': content_type},
                ['content-length-range', 0, 100 * 1024 * 1024]
            ],
            ExpiresIn=3600
        )
        
        result = {
            'status': 'post',
            'upload_url': presigned_post['url'],
            'fields': presigned_post['fields'],
            'url': cdn_url,
            'key': key
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
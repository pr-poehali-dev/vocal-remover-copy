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
    Генерирует presigned URL для загрузки аудиофайлов напрямую в S3.
    Возвращает URL для PUT-запроса и будущий CDN URL файла.
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
        
        # Generate presigned URL for direct upload
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': 'files',
                'Key': key,
                'ContentType': content_type
            },
            ExpiresIn=3600
        )
        
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        
        result = {
            'status': 'ready',
            'upload_url': presigned_url,
            'url': cdn_url,
            'key': key,
            'filename': filename
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
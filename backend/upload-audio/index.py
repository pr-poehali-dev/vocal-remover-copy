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
    Инициирует multipart upload или загружает файл чанками в S3.
    Для больших файлов создает multipart upload, для маленьких - возвращает presigned POST URL.
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
        file_size = body_data.get('file_size', 0)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        random_hash = hashlib.md5(f"{timestamp}{filename}".encode()).hexdigest()[:8]
        key = f'audio/uploads/{timestamp}_{random_hash}_{filename}'
        
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        
        if file_size > 5 * 1024 * 1024:
            upload_id = s3.create_multipart_upload(
                Bucket='files',
                Key=key,
                ContentType=content_type
            )['UploadId']
            
            num_parts = (file_size + 5 * 1024 * 1024 - 1) // (5 * 1024 * 1024)
            presigned_urls = []
            
            for part_number in range(1, min(num_parts + 1, 11)):
                presigned_url = s3.generate_presigned_url(
                    'upload_part',
                    Params={
                        'Bucket': 'files',
                        'Key': key,
                        'UploadId': upload_id,
                        'PartNumber': part_number
                    },
                    ExpiresIn=3600
                )
                presigned_urls.append({
                    'part_number': part_number,
                    'url': presigned_url
                })
            
            result = {
                'status': 'multipart',
                'upload_id': upload_id,
                'key': key,
                'urls': presigned_urls,
                'url': cdn_url
            }
        else:
            presigned_post = s3.generate_presigned_post(
                Bucket='files',
                Key=key,
                Fields={'Content-Type': content_type},
                Conditions=[
                    {'Content-Type': content_type},
                    ['content-length-range', 0, 50 * 1024 * 1024]
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
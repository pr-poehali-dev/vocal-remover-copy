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

upload_sessions = {}

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загружает аудиофайлы в S3 через chunked upload.
    Поддерживает загрузку частями для файлов до 100 МБ.
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
        action = body_data.get('action', 'upload')
        
        if action == 'init':
            filename = body_data.get('filename', 'audio.mp3')
            content_type = body_data.get('content_type', 'audio/mpeg')
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            random_hash = hashlib.md5(f"{timestamp}{filename}".encode()).hexdigest()[:8]
            upload_id = f"{timestamp}_{random_hash}"
            key = f'audio/uploads/{upload_id}_{filename}'
            
            upload_sessions[upload_id] = {
                'key': key,
                'content_type': content_type,
                'chunks': []
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'upload_id': upload_id, 'key': key}),
                'isBase64Encoded': False
            }
        
        elif action == 'chunk':
            upload_id = body_data.get('upload_id')
            chunk_data = body_data.get('chunk_data')
            chunk_index = body_data.get('chunk_index', 0)
            
            if upload_id not in upload_sessions:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid upload_id'}),
                    'isBase64Encoded': False
                }
            
            chunk_bytes = base64.b64decode(chunk_data)
            upload_sessions[upload_id]['chunks'].append((chunk_index, chunk_bytes))
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'status': 'chunk_received', 'chunk_index': chunk_index}),
                'isBase64Encoded': False
            }
        
        elif action == 'finalize':
            upload_id = body_data.get('upload_id')
            
            if upload_id not in upload_sessions:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid upload_id'}),
                    'isBase64Encoded': False
                }
            
            session = upload_sessions[upload_id]
            session['chunks'].sort(key=lambda x: x[0])
            
            full_data = b''.join([chunk[1] for chunk in session['chunks']])
            
            s3.put_object(
                Bucket='files',
                Key=session['key'],
                Body=full_data,
                ContentType=session['content_type']
            )
            
            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{session['key']}"
            
            del upload_sessions[upload_id]
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'uploaded',
                    'url': cdn_url,
                    'key': session['key'],
                    'size': len(full_data)
                }),
                'isBase64Encoded': False
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Invalid action'}),
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
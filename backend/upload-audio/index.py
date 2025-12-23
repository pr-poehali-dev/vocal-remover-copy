import json
import os
import boto3
import base64
import hashlib
from typing import Dict, Any
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

s3 = boto3.client('s3',
    endpoint_url='https://bucket.poehali.dev',
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Загружает аудиофайлы в S3 через chunked upload.
    Каждый чанк сохраняется в S3, затем собирается в финальный файл.
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
            
            metadata_key = f'audio/temp/{upload_id}/metadata.json'
            s3.put_object(
                Bucket='files',
                Key=metadata_key,
                Body=json.dumps({'key': key, 'content_type': content_type, 'filename': filename}),
                ContentType='application/json'
            )
            
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
            
            chunk_bytes = base64.b64decode(chunk_data)
            chunk_key = f'audio/temp/{upload_id}/chunk_{chunk_index:04d}.bin'
            
            s3.put_object(
                Bucket='files',
                Key=chunk_key,
                Body=chunk_bytes,
                ContentType='application/octet-stream'
            )
            
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
            total_chunks = body_data.get('total_chunks', 0)
            
            metadata_key = f'audio/temp/{upload_id}/metadata.json'
            metadata_obj = s3.get_object(Bucket='files', Key=metadata_key)
            metadata = json.loads(metadata_obj['Body'].read().decode('utf-8'))
            
            def download_chunk(chunk_index: int) -> tuple:
                chunk_key = f'audio/temp/{upload_id}/chunk_{chunk_index:04d}.bin'
                chunk_obj = s3.get_object(Bucket='files', Key=chunk_key)
                return (chunk_index, chunk_obj['Body'].read())
            
            chunks_dict = {}
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(download_chunk, i) for i in range(total_chunks)]
                for future in as_completed(futures):
                    idx, data = future.result()
                    chunks_dict[idx] = data
            
            full_data = b''.join([chunks_dict[i] for i in range(total_chunks)])
            
            s3.put_object(
                Bucket='files',
                Key=metadata['key'],
                Body=full_data,
                ContentType=metadata['content_type']
            )
            
            def delete_chunk(chunk_index: int):
                chunk_key = f'audio/temp/{upload_id}/chunk_{chunk_index:04d}.bin'
                s3.delete_object(Bucket='files', Key=chunk_key)
            
            with ThreadPoolExecutor(max_workers=10) as executor:
                executor.map(delete_chunk, range(total_chunks))
            
            s3.delete_object(Bucket='files', Key=metadata_key)
            
            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{metadata['key']}"
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'uploaded',
                    'url': cdn_url,
                    'key': metadata['key'],
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
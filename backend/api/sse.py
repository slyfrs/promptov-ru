from flask import Response, stream_with_context
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import request
import json
import queue
import threading
import time
from collections import defaultdict

# Хранилище очередей для каждого пользователя
user_queues = defaultdict(queue.Queue)
# Замок для потокобезопасности
queue_lock = threading.Lock()

def register_sse_routes(app):
    """Регистрирует SSE эндпоинты для реального времени"""

    @app.route('/api/sse/notifications', methods=['GET'])
    @jwt_required()
    def sse_notifications():
        """Stream уведомлений для текущего пользователя"""
        user_id = get_jwt_identity()
        
        # Создаём очередь для этого пользователя
        with queue_lock:
            user_queue = user_queues[user_id]
        
        def generate():
            try:
                while True:
                    # Ждём новое уведомление (таймаут 30 секунд для keep-alive)
                    try:
                        data = user_queue.get(timeout=30)
                        yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                    except queue.Empty:
                        # Отправляем heartbeat для поддержания соединения
                        yield f"data: {json.dumps({'type': 'ping'}, ensure_ascii=False)}\n\n"
            except GeneratorExit:
                # Клиент отключился - очищаем очередь
                with queue_lock:
                    if user_id in user_queues:
                        del user_queues[user_id]
        
        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )

def send_realtime_notification(user_id, notification_data):
    """Отправить уведомление пользователю в реальном времени"""
    with queue_lock:
        if user_id in user_queues:
            user_queues[user_id].put(notification_data)
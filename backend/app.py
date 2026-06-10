import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)  # React와의 통신을 위한 CORS 허용

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 데이터베이스 초기화 및 테이블 생성
def init_db():
    conn = sqlite3.connect('gallery.db')
    cursor = conn.cursor()
    # 1. 유저 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL
        )
    ''')
    # 2. 사진 테이블 (설명, 키워드 포함)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            filename TEXT,
            description TEXT,
            keywords TEXT,
            FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
        )
    ''')
    # 3. 다이렉트 메시지 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT,
            receiver TEXT,
            content TEXT,
            FOREIGN KEY(sender) REFERENCES users(username),
            FOREIGN KEY(receiver) REFERENCES users(username) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    conn = sqlite3.connect('gallery.db')
    conn.row_factory = sqlite3.Row
    return conn

# ----------------- [기능 1] 회원 관리 (가입, 로그인) -----------------
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Missing fields'}), 400
        
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, password))
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Username already exists'}), 400
    finally:
        conn.close()
    return jsonify({'message': 'Signup successful'}), 201

@app.route('/api/signin', methods=['POST'])
def signin():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ? AND password = ?', (username, password)).fetchone()
    conn.close()
    
    if user:
        return jsonify({'message': 'Signin successful', 'username': username}), 200
    return jsonify({'message': 'Invalid credentials'}), 401

# ----------------- [기능 2 & 3] 유저 리스트 조회 -----------------
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    users = conn.execute('SELECT username FROM users').fetchall()
    conn.close()
    return jsonify([user['username'] for user in users])

# ----------------- [기능 4] 사진 업로드 및 수정 -----------------
@app.route('/api/photos', methods=['POST'])
def upload_photo():
    username = request.form.get('username')
    description = request.form.get('description')
    keywords = request.form.get('keywords') # 콤마(,)로 구분된 문자열 예: "바다,여행"
    file = request.files.get('photo')
    
    if not file or not username:
        return jsonify({'message': 'Required data missing'}), 400
        
    filename = f"{username}_{file.filename}"
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    
    conn = get_db_connection()
    conn.execute('INSERT INTO photos (username, filename, description, keywords) VALUES (?, ?, ?, ?)',
                 (username, filename, description, keywords))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Photo uploaded successfully'}), 201

@app.route('/api/photos/<int:photo_id>', methods=['PUT'])
def modify_photo(photo_id):
    data = request.json
    username = data.get('username')
    description = data.get('description')
    keywords = data.get('keywords')
    
    conn = get_db_connection()
    photo = conn.execute('SELECT * FROM photos WHERE id = ?', (photo_id,)).fetchone()
    
    if not photo or photo['username'] != username:
        conn.close()
        return jsonify({'message': 'Unauthorized or not found'}), 403
        
    conn.execute('UPDATE photos SET description = ?, keywords = ? WHERE id = ?', (description, keywords, photo_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Photo modified successfully'})

# 전체 사진 가져오기 이미지 라우트 포함
@app.route('/api/photos', methods=['GET'])
def get_photos():
    conn = get_db_connection()
    photos = conn.execute('SELECT * FROM photos').fetchall()
    conn.close()
    return jsonify([dict(p) for p in photos])

@app.route('/uploads/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ----------------- [기능 6] 다이렉트 메시지 (DM) -----------------
@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    sender = data.get('sender')
    receiver = data.get('receiver')
    content = data.get('content')
    
    conn = get_db_connection()
    conn.execute('INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)', (sender, receiver, content))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Message sent successfully'}), 201

@app.route('/api/messages/<username>', methods=['GET'])
def get_messages(username):
    conn = get_db_connection()
    messages = conn.execute('SELECT * FROM messages WHERE receiver = ?', (username,)).fetchall()
    conn.close()
    return jsonify([dict(m) for m in messages])

@app.route('/api/messages/<int:msg_id>', methods=['DELETE'])
def delete_message(msg_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM messages WHERE id = ?', (msg_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Message deleted successfully'})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
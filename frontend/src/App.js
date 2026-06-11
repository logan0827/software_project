import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';

function App() {
  // 로그인 상태 관리
  const [user, setUser] = useState(localStorage.getItem('username') || null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // 데이터 리스트 상태 관리
  const [usersList, setUsersList] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 업로드 폼 상태 관리
  const [photoFile, setPhotoFile] = useState(null);
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');

  // 수정 및 DM 팝업 타겟 임시 저장
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editKey, setEditKey] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchPhotos();
    if (user) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUsers = () => {
    axios.get(`${API_URL}/users`).then(res => setUsersList(res.data));
  };

  const fetchPhotos = () => {
    axios.get(`${API_URL}/photos`).then(res => setPhotos(res.data));
  };

  const fetchMessages = () => {
    axios.get(`${API_URL}/messages/${user}`).then(res => setMessages(res.data));
  };

  // 회원가입 / 로그인 / 로그아웃
  const handleSignUp = () => {
    axios.post(`${API_URL}/signup`, { username: usernameInput, password: passwordInput })
      .then(() => alert('Sign up success! Please sign in.'))
      .catch(err => alert(err.response.data.message));
  };

  const handleSignIn = () => {
    axios.post(`${API_URL}/signin`, { username: usernameInput, password: passwordInput })
      .then(res => {
        setUser(res.data.username);
        localStorage.setItem('username', res.data.username);
      })
      .catch(err => alert(err.response.data.message));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('username');
    setMessages([]);
  };

  // 사진 업로드
  const handleUpload = (e) => {
    e.preventDefault();
    if (!photoFile) return alert('Please select a photo');
    const formData = new FormData();
    formData.append('username', user);
    formData.append('description', description);
    formData.append('keywords', keywords);
    formData.append('photo', photoFile);

    axios.post(`${API_URL}/photos`, formData)
      .then(() => {
        fetchPhotos();
        setDescription('');
        setKeywords('');
        setPhotoFile(null);
        alert('Photo uploaded!');
      });
  };

  // 사진 수정 모드 진입 및 제출
  const startEdit = (photo) => {
    setEditingPhotoId(photo.id);
    setEditDesc(photo.description);
    setEditKey(photo.keywords);
  };

  const handleModify = (photoId) => {
    axios.put(`${API_URL}/photos/${photoId}`, { username: user, description: editDesc, keywords: editKey })
      .then(() => {
        setEditingPhotoId(null);
        fetchPhotos();
        alert('Modified!');
      });
  };

  // DM 보내기 / 답장하기 / 삭제하기
  const handleSendMessage = (receiver) => {
    const content = prompt(`Send DM to ${receiver}:`);
    if (!content) return;
    axios.post(`${API_URL}/messages`, { sender: user, receiver, content })
      .then(() => {
        alert('Message sent!');
        fetchMessages();
      });
  };

  const handleDeleteMessage = (msgId) => {
    axios.delete(`${API_URL}/messages/${msgId}`).then(() => fetchMessages());
  };

  // [기능 5] 키워드 기반 필터링 검색
  const filteredPhotos = photos.filter(photo => {
    if (!searchKeyword) return true;
    return photo.keywords && photo.keywords.toLowerCase().includes(searchKeyword.toLowerCase());
  });

  return (
    <div>
      {/* 상단 네비게이션 바 */}
      <div className="navbar">
        <h2>📷 Personal Photo Gallery</h2>
        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>Welcome, {user}! </strong>
              {messages.length > 0 && (
                <span style={{
                  background: '#e74c3c',
                  color: '#fff',
                  borderRadius: '50%',
                  padding: '2px 8px',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}>
                  📬 {messages.length}
                </span>
              )}
              <button onClick={handleSignOut} className="button-delete">Sign Out</button>
            </div>
          ) : (
            <span>Please Sign In to explore photos & messages</span>
          )}
        </div>
      </div>

      <div className="container">
        {/* 로그인 안 된 경우 통합 인증 폼 박스 노출 */}
        {!user && (
          <div className="auth-box">
            <h3>Sign Up / Sign In</h3>
            <input type="text" placeholder="Username" onChange={e => setUsernameInput(e.target.value)} />
            <input type="password" placeholder="Password" onChange={e => setPasswordInput(e.target.value)} />
            <button onClick={handleSignIn}>Sign In</button>
            <button onClick={handleSignUp}>Sign Up</button>
          </div>
        )}

        {/* [요구사항 2, 3] 항상 노출되는 전체 유저 목록 */}
        <div className="auth-box">
          <h3>Registered Users List</h3>
          <p>{usersList.join(', ') || 'No users registered yet.'}</p>
        </div>

        {user && (
          <>
            {/* [요구사항 4] 로그인한 유저 전용 사진 업로드 폼 */}
            <div className="upload-box">
              <h3>Upload New Photo</h3>
              <form onSubmit={handleUpload}>
                <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} />
                <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
                <input type="text" placeholder="Keywords (e.g. travel, beach)" value={keywords} onChange={e => setKeywords(e.target.value)} />
                <button type="submit">Upload</button>
              </form>
            </div>

            {/* [요구사항 6-C] 받은 메시지 확인 / 답장 / 삭제 함 */}
            <div className="message-list" style={{ marginBottom: '20px' }}>
              <h3>My Direct Messages {messages.length > 0 && <span style={{ color: '#e74c3c' }}>({messages.length})</span>}</h3>
              {messages.length === 0 ? <p>No messages received.</p> : messages.map(msg => (
                <div key={msg.id} className="message-item">
                  <p><strong>From: {msg.sender}</strong> - {msg.content}</p>
                  <button onClick={() => handleSendMessage(msg.sender)}>Reply</button>
                  <button onClick={() => handleDeleteMessage(msg.id)} className="button-delete">Delete</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* [요구사항 5] 키워드 검색바 */}
        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search photos by keywords..." 
            value={searchKeyword} 
            onChange={e => setSearchKeyword(e.target.value)} 
          />
        </div>

        {/* [요구사항 2, 4-A] 로그인된 유저에게만 사진 갤러리 노출 */}
        <h3>Photo Gallery Feed</h3>
        {!user ? (
          <p style={{ color: '#888' }}>🔒 Only signed-in users can view photos.</p>
        ) : (
          <div className="photo-grid">
            {filteredPhotos.map(photo => (
              <div key={photo.id} className="photo-card">
                <img src={`http://127.0.0.1:5000/uploads/${photo.filename}`} alt="gallery" />
                
                {editingPhotoId === photo.id ? (
                  <div>
                    <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                    <input type="text" value={editKey} onChange={e => setEditKey(e.target.value)} />
                    <button onClick={() => handleModify(photo.id)}>Save</button>
                    <button onClick={() => setEditingPhotoId(null)} className="button-delete">Cancel</button>
                  </div>
                ) : (
                  <div>
                    <p><strong>Uploader:</strong> {photo.username}</p>
                    <p><strong>Description:</strong> {photo.description}</p>
                    <p style={{ color: '#007bff' }}>{photo.keywords ? photo.keywords.split(',').map(k => `#${k.trim()} `) : ''}</p>
                    
                    {/* [요구사항 6-A, B] 모든 포스트에 배치되는 DM 버튼 */}
                    <button onClick={() => handleSendMessage(photo.username)}>Direct Message</button>
                    
                    {/* [요구사항 4-B] 본인 글일 때만 수정 버튼 노출 */}
                    {photo.username === user && (
                      <button onClick={() => startEdit(photo)} style={{ backgroundColor: '#28a745' }}>Modify</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
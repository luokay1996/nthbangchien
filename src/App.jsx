import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const classInfo = {
  'Toái Mộng': { color: '#87CEEB', emoji: '🗡️' },
  'Thiết Y': { color: '#FFA500', emoji: '🛡️' },
  'Thần Tướng': { color: '#4169E1', emoji: '⚔️' },
  'Tố Vấn': { color: '#FF69B4', emoji: '🌸' },
  'Cửu Linh': { color: '#800080', emoji: '🔮' },
};

function App() {
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase.from('register_list').select('*');
    if (!error) setMembers(data || []);
  }, []);

  useEffect(() => {
    fetchMembers();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, () => fetchMembers())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchMembers]);

  const handleAdminLogin = () => {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "123456") { // BẠN CÓ THỂ ĐỔI MÃ NÀY
      setIsAdmin(true);
      alert("Đã đăng nhập quyền Admin!");
    } else {
      alert("Sai mật mã!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Vui lòng chọn 1 ô Slot trước!");
    const isOccupied = members.some(m => m.type === form.type && m.team_slot === form.team_slot);
    if (isOccupied) return alert("Ô này đã có người!");

    const { error } = await supabase.from('register_list').insert([form]);
    if (error) alert("Lỗi: " + error.message);
    else setForm({ ...form, char_name: '', team_slot: null });
  };

  const deleteMember = async (id) => {
    if (!isAdmin && !window.confirm("Bạn muốn hủy đăng ký ô này?")) return;
    await supabase.from('register_list').delete().eq('id', id);
  };

  // Hàm vẽ Slot
  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;

    return (
      <div 
        key={`${type}-${slotNum}`}
        onClick={() => setForm({ ...form, type: type, team_slot: slotNum })}
        style={{
          height: '40px', margin: '2px', borderRadius: '4px',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#2a2a2a',
          border: isSelected ? '2px solid gold' : '1px solid #444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '11px', color: occupant ? 'white' : '#666', 
          fontWeight: 'bold', position: 'relative', overflow: 'hidden'
        }}
      >
        {occupant ? (
          <>
            <span style={{zIndex: 1}}>{occupant.char_name}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteMember(occupant.id); }}
              style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', fontSize: '8px', cursor: 'pointer' }}
            >X</button>
          </>
        ) : slotNum}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#121212', color: 'white', minHeight: '100vh', padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <button onClick={handleAdminLogin} style={{float: 'right', background: '#333', color: '#888', border: 'none', fontSize: '10px'}}>{isAdmin ? "ADMIN ON" : "Admin Login"}</button>
      <img src="/nth-logo.png" alt="Logo" style={{ width: '80px' }} />
      <h1 style={{ color: 'gold', margin: '5px 0' }}>ĐĂNG KÝ BANG CHIẾN</h1>

      {/* BẢNG TỔNG HỢP QUÂN SỐ */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', background: '#1a1a1a', padding: '10px', borderRadius: '8px' }}>
        {Object.keys(classInfo).map(cls => (
          <div key={cls} style={{ color: classInfo[cls].color, fontSize: '13px', fontWeight: 'bold' }}>
            {cls}: {members.filter(m => m.class_name === cls).length}
          </div>
        ))}
        <div style={{ color: 'white', fontSize: '13px', fontWeight: 'bold', borderLeft: '1px solid #444', paddingLeft: '15px' }}>
          TỔNG: {members.length}/90
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <input style={{padding: '8px', marginRight: '5px'}} placeholder="Tên..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
        <select style={{padding: '8px', marginRight: '5px'}} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" style={{ padding: '8px 20px', background: 'gold', fontWeight: 'bold', cursor: 'pointer' }}>ĐĂNG KÝ Ô {form.team_slot || '?'}</button>
      </form>

      {/* 60 CHÍNH THỨC - CHIA 10 CỘT */}
      <h2 style={{ color: 'gold', fontSize: '18px' }}>ĐỘI HÌNH CHÍNH THỨC</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '40px' }}>
        {[...Array(10)].map((_, colIdx) => (
          <div key={colIdx} style={{ background: '#1a1a1a', padding: '5px', borderRadius: '5px', border: '1px solid #333' }}>
            <div style={{ fontSize: '11px', color: 'gold', marginBottom: '5px', fontWeight: 'bold' }}>ĐỘI {colIdx + 1}</div>
            {[...Array(6)].map((_, rowIdx) => renderSlotCell('Chính thức', colIdx * 6 + rowIdx + 1))}
          </div>
        ))}
      </div>

      {/* 30 HỌC VIỆC */}
      <h2 style={{ color: '#87CEEB', fontSize: '18px' }}>DỰ BỊ / HỌC VIỆC</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{ width: '100px' }}>{renderSlotCell('Học việc', i + 1)}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
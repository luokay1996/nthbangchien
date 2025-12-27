import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const classInfo = {
  'Toái Mộng': { color: '#87CEEB' },
  'Thiết Y': { color: '#FFA500' },
  'Huyết Hà': { color: '#8B0000' },
  'Thần Tướng': { color: '#4169E1' },
  'Tố Vấn': { color: '#FF69B4' },
  'Cửu Linh': { color: '#800080' },
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
    if (pass === "123456") { 
      setIsAdmin(true);
      alert("Đăng nhập Admin thành công!");
    } else {
      alert("Sai mật mã!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Vui lòng chọn 1 ô Slot trước!");
    
    const isOccupied = members.some(m => m.type === form.type && m.team_slot === form.team_slot);
    if (isOccupied) return alert("Ô này đã có người đăng ký!");

    const { error } = await supabase.from('register_list').insert([form]);
    if (error) {
      alert("Lỗi: " + error.message);
    } else {
      // LƯU TÊN VÀO MÁY NGƯỜI DÙNG ĐỂ TỰ XÓA SAU NÀY
      localStorage.setItem('my_char_name', form.char_name);
      setForm({ ...form, char_name: '', team_slot: null });
    }
  };

  const deleteMember = async (id, name) => {
    const savedName = localStorage.getItem('my_char_name');

    // Điều kiện xóa: Là Admin HOẶC Tên trong ô trùng với tên đã lưu trên máy này
    if (isAdmin || name === savedName) {
      if (window.confirm(`Xác nhận xóa nhân vật [${name}]?`)) {
        const { error } = await supabase.from('register_list').delete().eq('id', id);
        if (error) alert("Lỗi: " + error.message);
      }
    } else {
      alert("Bạn không có quyền xóa người này! Chỉ Admin hoặc chính người đăng ký mới có thể xóa.");
    }
  };

  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;
    const isMine = occupant && occupant.char_name === localStorage.getItem('my_char_name');

    return (
      <div 
        key={`${type}-${slotNum}`}
        onClick={() => setForm({ ...form, type: type, team_slot: slotNum })}
        style={{
          height: '40px', margin: '4px 0', borderRadius: '4px',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#222',
          border: isSelected ? '2px solid gold' : isMine ? '2px solid #fff' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '12px', color: occupant ? 'white' : '#555', 
          fontWeight: 'bold', position: 'relative'
        }}
      >
        {occupant ? (
          <>
            <span style={{ padding: '0 5px' }}>{occupant.char_name}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteMember(occupant.id, occupant.char_name); }}
              style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', fontSize: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
            >×</button>
          </>
        ) : slotNum}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        <button onClick={handleAdminLogin} style={{ float: 'right', background: isAdmin ? 'gold' : '#333', color: isAdmin ? 'black' : '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isAdmin ? "ADMIN ON" : "ADMIN LOGIN"}
        </button>

        <h1 style={{ color: 'gold' }}>ĐĂNG KÝ BANG CHIẾN</h1>

        {/* BẢNG TỔNG HỢP */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', background: '#111', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
          {Object.keys(classInfo).map(cls => (
            <div key={cls}>
              <div style={{ color: classInfo[cls].color, fontWeight: 'bold' }}>{cls}</div>
              <div style={{ fontSize: '20px' }}>{members.filter(m => m.class_name === cls).length}</div>
            </div>
          ))}
          <div style={{ borderLeft: '1px solid #444', paddingLeft: '15px', color: 'gold' }}>
            <div>TỔNG</div>
            <div style={{ fontSize: '20px' }}>{members.length} / 90</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: '40px' }}>
          <input style={{ padding: '12px', background: '#111', color: 'white', marginRight: '10px' }} placeholder="Tên nhân vật..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
          <select style={{ padding: '12px', background: '#111', color: 'white', marginRight: '10px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
            {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" style={{ padding: '12px 30px', background: 'gold', fontWeight: 'bold', cursor: 'pointer' }}>ĐĂNG KÝ Ô {form.team_slot || '...'}</button>
        </form>

        <h2>ĐỘI HÌNH CHÍNH THỨC</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '15px' }}>
          {[...Array(10)].map((_, colIdx) => (
            <div key={colIdx} style={{ background: '#0a0a0a', padding: '10px', borderRadius: '6px', border: '1px solid #222' }}>
              <div style={{ color: 'gold', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>ĐỘI {colIdx + 1}</div>
              {[...Array(6)].map((_, rowIdx) => renderSlotCell('Chính thức', colIdx * 6 + rowIdx + 1))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Cập nhật danh sách Class chính xác
const classInfo = {
  'Toái Mộng': { color: '#87CEEB', emoji: '🗡️' },
  'Thiết Y': { color: '#FFA500', emoji: '🛡️' },
  'Huyết Hà': { color: '#8B0000', emoji: '🚩' }, // Màu đỏ đô
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
    const pass = prompt("Nhập mật mã Admin để điều chỉnh:");
    if (pass === "123456") { 
      setIsAdmin(true);
      alert("Đã đăng nhập quyền Admin! Bạn có thể xóa bất kỳ ai.");
    } else {
      alert("Sai mật mã!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Vui lòng click chọn 1 ô trống bên dưới trước!");
    const isOccupied = members.some(m => m.type === form.type && m.team_slot === form.team_slot);
    if (isOccupied) return alert("Ô này đã có người đăng ký!");

    const { error } = await supabase.from('register_list').insert([form]);
    if (error) alert("Lỗi: " + error.message);
    else setForm({ ...form, char_name: '', team_slot: null });
  };

  const deleteMember = async (id, name) => {
    const confirmMsg = isAdmin ? `Admin: Xóa ${name}?` : `Bạn muốn hủy đăng ký cho ${name}?`;
    if (window.confirm(confirmMsg)) {
      await supabase.from('register_list').delete().eq('id', id);
    }
  };

  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;

    return (
      <div 
        key={`${type}-${slotNum}`}
        onClick={() => setForm({ ...form, type: type, team_slot: slotNum })}
        style={{
          height: '42px', margin: '3px 0', borderRadius: '4px',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#252525',
          border: isSelected ? '2px solid gold' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '11px', color: occupant ? 'white' : '#555', 
          fontWeight: 'bold', position: 'relative', overflow: 'hidden', transition: '0.2s'
        }}
      >
        {occupant ? (
          <>
            <span style={{padding: '0 4px', textAlign: 'center'}}>{occupant.char_name}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteMember(occupant.id, occupant.char_name); }}
              style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: '9px', cursor: 'pointer', width: '16px', height: '16px' }}
            >×</button>
          </>
        ) : slotNum}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#0f0f0f', color: 'white', minHeight: '100vh', padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <button onClick={handleAdminLogin} style={{float: 'right', background: isAdmin ? '#d4af37' : '#333', color: isAdmin ? 'black' : '#888', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'}}>
          {isAdmin ? "QUYỀN ADMIN: ON" : "ADMIN LOGIN"}
        </button>
        
        <img src="/nth-logo.png" alt="Logo" style={{ width: '80px', marginBottom: '10px' }} />
        <h1 style={{ color: '#d4af37', margin: '0', fontSize: '28px', textShadow: '2px 2px 4px black' }}>ĐĂNG KÝ BANG CHIẾN</h1>
        <p style={{ color: '#888', marginBottom: '20px' }}>{new Date().toLocaleDateString('vi-VN')}</p>

        {/* BẢNG TỔNG HỢP QUÂN SỐ */}
        <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '10px', border: '1px solid #333', marginBottom: '25px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
          {Object.keys(classInfo).map(cls => (
            <div key={cls} style={{ textAlign: 'center' }}>
              <div style={{ color: classInfo[cls].color, fontSize: '14px', fontWeight: 'bold' }}>{cls}</div>
              <div style={{ fontSize: '18px' }}>{members.filter(m => m.class_name === cls).length}</div>
            </div>
          ))}
          <div style={{ borderLeft: '1px solid #444', paddingLeft: '20px', textAlign: 'center' }}>
            <div style={{ color: 'gold', fontSize: '14px', fontWeight: 'bold' }}>TỔNG CỘNG</div>
            <div style={{ fontSize: '18px', color: 'gold' }}>{members.length} / 90</div>
          </div>
        </div>

        {/* FORM ĐĂNG KÝ */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '40px', background: '#1a1a1a', padding: '20px', borderRadius: '10px', display: 'inline-block' }}>
          <input 
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #444', background: '#252525', color: 'white', marginRight: '10px', width: '180px' }}
            placeholder="Tên nhân vật..." 
            value={form.char_name} 
            onChange={e => setForm({...form, char_name: e.target.value})} 
            required 
          />
          <select 
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #444', background: '#252525', color: 'white', marginRight: '10px' }}
            value={form.class_name} 
            onChange={e => setForm({...form, class_name: e.target.value})}
          >
            {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" style={{ padding: '10px 25px', background: '#d4af37', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            XÁC NHẬN Ô {form.team_slot || '...'}
          </button>
        </form>

        {/* 60 CHÍNH THỨC - CHIA 10 ĐỘI */}
        <h2 style={{ color: '#d4af37', borderBottom: '2px solid #d4af37', paddingBottom: '10px', marginBottom: '20px' }}>ĐỘI HÌNH CHÍNH THỨC (60)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '50px' }}>
          {[...Array(10)].map((_, colIdx) => (
            <div key={colIdx} style={{ background: '#151515', padding: '8px', borderRadius: '6px', border: '1px solid #222' }}>
              <div style={{ color: '#d4af37', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>ĐỘI {colIdx + 1}</div>
              {[...Array(6)].map((_, rowIdx) => renderSlotCell('Chính thức', colIdx * 6 + rowIdx + 1))}
            </div>
          ))}
        </div>

        {/* 30 DỰ BỊ */}
        <h2 style={{ color: '#87CEEB', borderBottom: '2px solid #87CEEB', paddingBottom: '10px', marginBottom: '20px' }}>DỰ BỊ / HỌC VIỆC (30)</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {[...Array(30)].map((_, i) => (
            <div key={i} style={{ width: '100px' }}>
              {renderSlotCell('Học việc', i + 1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
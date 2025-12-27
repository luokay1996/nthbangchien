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

  // HÀM ĐĂNG NHẬP ADMIN
  const handleAdminLogin = () => {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "quymonquan2026") { 
      setIsAdmin(true);
      alert("ĐÃ KÍCH HOẠT QUYỀN ADMIN!");
    } else {
      alert("Sai mật mã!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Vui lòng click chọn 1 ô Slot bên dưới!");
    if (members.some(m => m.type === form.type && m.team_slot === form.team_slot)) return alert("Ô này đã có người!");

    const { error } = await supabase.from('register_list').insert([form]);
    if (!error) {
      localStorage.setItem('my_char_name', form.char_name);
      setForm({ ...form, char_name: '', team_slot: null });
    }
  };

  const deleteMember = async (id, name) => {
    if (window.confirm(`Xác nhận hủy đăng ký cho [${name}]?`)) {
      await supabase.from('register_list').delete().eq('id', id);
    }
  };

  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;
    const myName = localStorage.getItem('my_char_name');
    const canDelete = isAdmin || (occupant && occupant.char_name === myName);

    return (
      <div 
        key={`${type}-${slotNum}`}
        onClick={() => setForm({ ...form, type: type, team_slot: slotNum })}
        style={{
          height: '42px', margin: '3px 0', borderRadius: '4px',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#161616',
          border: isSelected ? '2px solid gold' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '11px', color: occupant ? 'white' : '#444', 
          fontWeight: 'bold', position: 'relative', overflow: 'hidden'
        }}
      >
        {occupant ? (
          <>
            <span style={{ padding: '0 4px', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{occupant.char_name}</span>
            {canDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); deleteMember(occupant.id, occupant.char_name); }}
                style={{ position: 'absolute', top: '0', right: '0', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '0 0 0 4px', fontSize: '10px', width: '18px', height: '18px', cursor: 'pointer', zIndex: 10 }}
              >×</button>
            )}
          </>
        ) : `S${slotNum}`}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
      
      {/* NÚT ADMIN LOGIN - HIỆN RÕ Ở GÓC PHẢI */}
      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 100 }}>
        <button 
          onClick={handleAdminLogin} 
          style={{ 
            background: isAdmin ? '#d4af37' : 'transparent', 
            color: isAdmin ? '#000' : '#d4af37', 
            border: '1px solid #d4af37', 
            padding: '5px 12px', 
            borderRadius: '4px', 
            fontSize: '11px', 
            fontWeight: 'bold',
            cursor: 'pointer' 
          }}
        >
          {isAdmin ? "ADMIN: ON" : "ADMIN LOGIN"}
        </button>
      </div>

      {/* LOGO & TIÊU ĐỀ */}
      <div style={{ marginBottom: '20px' }}>
        <img src="/nth-logo.png" alt="Logo" style={{ width: '100px', margin: '0 auto', display: 'block' }} />
        <h1 style={{ color: 'gold', fontSize: '24px', margin: '10px 0' }}>BANG QUỶ MÔN QUAN - ĐĂNG KÝ BANG CHIẾN</h1>
      </div>

      {/* TỔNG HỢP QUÂN SỐ */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', background: '#0a0a0a', padding: '15px', borderRadius: '8px', border: '1px solid #222', marginBottom: '25px', maxWidth: '1000px', margin: '0 auto 25px auto', flexWrap: 'wrap' }}>
        {Object.keys(classInfo).map(cls => (
          <div key={cls} style={{ borderRight: '1px solid #222', paddingRight: '10px', minWidth: '85px' }}>
            <div style={{ color: classInfo[cls].color, fontSize: '12px', fontWeight: 'bold' }}>{cls}</div>
            <div style={{ fontSize: '18px' }}>{members.filter(m => m.class_name === cls).length}</div>
          </div>
        ))}
        <div style={{ paddingLeft: '10px', color: 'gold' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>TỔNG</div>
          <div style={{ fontSize: '18px' }}>{members.length}/90</div>
        </div>
      </div>

      {/* FORM NHẬP TÊN */}
      <div style={{ marginBottom: '40px' }}>
        <input 
          style={{ padding: '12px', background: '#111', color: 'white', border: '1px solid #333', marginRight: '8px', borderRadius: '4px', width: '200px' }} 
          placeholder="Tên nhân vật..." 
          value={form.char_name} 
          onChange={e => setForm({...form, char_name: e.target.value})} 
          required 
        />
        <select 
          style={{ padding: '12px', background: '#111', color: 'white', border: '1px solid #333', marginRight: '8px', borderRadius: '4px' }} 
          value={form.class_name} 
          onChange={e => setForm({...form, class_name: e.target.value})}
        >
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" onClick={handleSubmit} style={{ padding: '12px 30px', background: 'gold', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          ĐĂNG KÝ {form.team_slot ? `(Ô ${form.team_slot})` : ''}
        </button>
      </div>

      {/* 60 CHÍNH THỨC - 10 CỘT */}
      <h2 style={{ color: 'gold', fontSize: '18px', marginBottom: '15px' }}>ĐỘI HÌNH CHÍNH THỨC (60)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px', maxWidth: '1200px', margin: '0 auto 40px auto' }}>
        {[...Array(10)].map((_, colIdx) => (
          <div key={colIdx} style={{ background: '#080808', padding: '5px', borderRadius: '5px', border: '1px solid #222' }}>
            <div style={{ color: 'gold', fontSize: '10px', marginBottom: '6px', fontWeight: 'bold' }}>TEAM {colIdx + 1}</div>
            {[...Array(6)].map((_, rowIdx) => renderSlotCell('Chính thức', colIdx * 6 + rowIdx + 1))}
          </div>
        ))}
      </div>

      {/* 30 DỰ BỊ - 10 CỘT */}
      <h2 style={{ color: '#87CEEB', fontSize: '18px', marginBottom: '15px' }}>DỰ BỊ / HỌC VIỆC (30)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px', maxWidth: '1200px', margin: '0 auto' }}>
        {[...Array(30)].map((_, i) => renderSlotCell('Học việc', i + 1))}
      </div>

      {/* GHI CHÚ */}
      <footer style={{ marginTop: '60px', padding: '20px', borderTop: '1px solid #222', maxWidth: '850px', margin: '60px auto 0 auto' }}>
        <p style={{ fontSize: '12px', color: '#444', lineHeight: '1.6' }}>
          <strong style={{ color: '#666' }}>Lưu ý:</strong> Nếu thành viên xóa lịch sử trình duyệt hoặc đổi máy khác thì họ sẽ không tự xóa được nữa (lúc này cần nhờ các Đương gia (Admin) xóa hộ).
          <br />
          Mọi vấn đề về app xin liên hệ <span style={{ color: '#d4af37' }}>VôẢnhNhân (Zalo: Khoa)</span>
        </p>
      </footer>

    </div>
  );
}

export default App;
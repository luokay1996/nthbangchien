import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const classInfo = {
  'Toái Mộng': { color: '#87CEEB' },
  'Thiết Y': { color: '#FFA500' },
  'Huyết Hà': { color: '#8B0000' }, // Đỏ đô
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
      alert("Đã đăng nhập QUYỀN ADMIN!");
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
    
    // CHỈ HIỆN NÚT XÓA NẾU LÀ ADMIN HOẶC LÀ Ô CỦA CHÍNH MÌNH
    const canDelete = isAdmin || (occupant && occupant.char_name === myName);

    return (
      <div 
        key={`${type}-${slotNum}`}
        onClick={() => setForm({ ...form, type: type, team_slot: slotNum })}
        style={{
          width: '80px', height: '45px', margin: '4px', borderRadius: '4px',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : 'rgba(255,255,255,0.05)',
          border: isSelected ? '2px solid gold' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '11px', color: occupant ? 'white' : '#555', 
          fontWeight: 'bold', position: 'relative', transition: '0.2s'
        }}
      >
        {occupant ? (
          <>
            <span style={{ padding: '0 2px', textAlign: 'center' }}>{occupant.char_name}</span>
            {canDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); deleteMember(occupant.id, occupant.char_name); }}
                style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'red', color: 'white', border: 'none', borderRadius: '3px', fontSize: '10px', width: '16px', height: '16px', cursor: 'pointer', zIndex: 10 }}
              >×</button>
            )}
          </>
        ) : `Slot ${slotNum}`}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh', padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
      
      {/* NÚT ADMIN TÀNG HÌNH GÓC PHẢI */}
      <button onClick={handleAdminLogin} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: '1px solid #222', color: '#333', fontSize: '10px', cursor: 'pointer' }}>
        {isAdmin ? "ADMIN" : "LOG"}
      </button>

      {/* LOGO LUÔN CỐ ĐỊNH Ở ĐÂY */}
      <div style={{ marginBottom: '20px' }}>
        <img src="/nth-logo.png" alt="Logo" style={{ width: '120px', display: 'block', margin: '0 auto' }} />
        <h1 style={{ color: 'gold', fontSize: '28px', margin: '10px 0' }}>BANG QUỶ MÔN QUAN - ĐĂNG KÝ BANG CHIẾN</h1>
      </div>

      {/* TỔNG HỢP QUÂN SỐ */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '15px', background: '#111', padding: '15px', borderRadius: '10px', border: '1px solid #222', marginBottom: '20px', maxWidth: '900px', margin: '0 auto 30px auto' }}>
        {Object.keys(classInfo).map(cls => (
          <div key={cls} style={{ textAlign: 'center', minWidth: '70px' }}>
            <div style={{ color: classInfo[cls].color, fontSize: '12px', fontWeight: 'bold' }}>{cls}</div>
            <div style={{ fontSize: '18px' }}>{members.filter(m => m.class_name === cls).length}</div>
          </div>
        ))}
        <div style={{ borderLeft: '1px solid #333', paddingLeft: '15px', color: 'gold' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>TỔNG</div>
          <div style={{ fontSize: '18px' }}>{members.length}/90</div>
        </div>
      </div>

      {/* FORM ĐĂNG KÝ GIAO DIỆN CŨ */}
      <div style={{ background: '#161616', padding: '20px', borderRadius: '10px', display: 'inline-block', border: '1px solid #333', marginBottom: '40px' }}>
        <input style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #444', marginRight: '10px', borderRadius: '4px', width: '200px' }} placeholder="Nhập tên nhân vật..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
        <select style={{ padding: '10px', background: '#222', color: 'white', border: '1px solid #444', marginRight: '10px', borderRadius: '4px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" onClick={handleSubmit} style={{ padding: '10px 25px', background: 'gold', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          ĐĂNG KÝ {form.team_slot ? `(Ô ${form.team_slot})` : ''}
        </button>
      </div>

      {/* BẢNG THÀNH VIÊN - QUAY LẠI GIAO DIỆN Ô VUÔNG ĐẸP */}
      <h2 style={{ color: 'gold', fontSize: '20px', marginBottom: '20px' }}>CHÍNH THỨC (60)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1000px', margin: '0 auto 40px auto' }}>
        {[...Array(60)].map((_, i) => renderSlotCell('Chính thức', i + 1))}
      </div>

      <h2 style={{ color: '#87CEEB', fontSize: '20px', marginBottom: '20px' }}>DỰ BỊ / HỌC VIỆC (30)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1000px', margin: '0 auto' }}>
        {[...Array(30)].map((_, i) => renderSlotCell('Học việc', i + 1))}
      </div>

    </div>
  );
}

export default App;
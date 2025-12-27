import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Danh sách Class chính xác và màu sắc
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

  // Lấy dữ liệu từ Supabase
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

  // Đăng nhập Admin
  const handleAdminLogin = () => {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "123456") { 
      setIsAdmin(true);
      alert("Đăng nhập Admin thành công! Bạn hiện đã có quyền xóa thành viên.");
    } else {
      alert("Sai mật mã!");
    }
  };

  // Đăng ký thành viên
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Vui lòng chọn 1 ô Slot trước khi nhấn Đăng ký!");
    
    const isOccupied = members.some(m => m.type === form.type && m.team_slot === form.team_slot);
    if (isOccupied) return alert("Ô này đã có người đăng ký rồi!");

    const { error } = await supabase.from('register_list').insert([form]);
    if (error) alert("Lỗi: " + error.message);
    else setForm({ ...form, char_name: '', team_slot: null });
  };

  // Xóa thành viên (Chỉ Admin mới có quyền)
  const deleteMember = async (id, name) => {
    if (!isAdmin) {
      alert("Lỗi: Chỉ Admin mới có quyền xóa thành viên khỏi danh sách!");
      return;
    }

    if (window.confirm(`Xác nhận xóa nhân vật [${name}]?`)) {
      const { error } = await supabase.from('register_list').delete().eq('id', id);
      if (error) alert("Không thể xóa: " + error.message);
    }
  };

  // Hàm hiển thị từng ô Slot
  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;

    return (
      <div 
        key={`${type}-${slotNum}`}
        onClick={() => setForm({ ...form, type: type, team_slot: slotNum })}
        style={{
          height: '40px', margin: '4px 0', borderRadius: '4px',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#222',
          border: isSelected ? '2px solid gold' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '12px', color: occupant ? 'white' : '#555', 
          fontWeight: 'bold', position: 'relative', overflow: 'hidden'
        }}
      >
        {occupant ? (
          <>
            <span style={{ padding: '0 5px', textAlign: 'center' }}>{occupant.char_name}</span>
            {isAdmin && (
              <button 
                onClick={(e) => { e.stopPropagation(); deleteMember(occupant.id, occupant.char_name); }}
                style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', fontSize: '10px', cursor: 'pointer', width: '18px', height: '18px' }}
              >×</button>
            )}
          </>
        ) : `S${slotNum}`}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        
        {/* Nút Admin */}
        <button onClick={handleAdminLogin} style={{ float: 'right', background: isAdmin ? 'gold' : '#333', color: isAdmin ? 'black' : '#fff', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isAdmin ? "ADMIN ON" : "ADMIN LOGIN"}
        </button>

        <img src="/nth-logo.png" alt="Logo" style={{ width: '100px', marginBottom: '10px' }} />
        <h1 style={{ color: 'gold', fontSize: '30px', margin: '10px 0' }}>NGHỊCH THỦY HÀN - ĐĂNG KÝ BANG CHIẾN</h1>

        {/* BẢNG TỔNG HỢP */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '30px' }}>
          {Object.keys(classInfo).map(cls => (
            <div key={cls} style={{ borderRight: '1px solid #222', paddingRight: '15px' }}>
              <div style={{ color: classInfo[cls].color, fontWeight: 'bold', fontSize: '13px' }}>{cls}</div>
              <div style={{ fontSize: '20px' }}>{members.filter(m => m.class_name === cls).length}</div>
            </div>
          ))}
          <div style={{ paddingLeft: '15px' }}>
            <div style={{ color: 'gold', fontWeight: 'bold', fontSize: '13px' }}>TỔNG SĨ SỐ</div>
            <div style={{ fontSize: '20px', color: 'gold' }}>{members.length} / 90</div>
          </div>
        </div>

        {/* FORM NHẬP LIỆU */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '40px' }}>
          <input 
            style={{ padding: '12px', width: '200px', borderRadius: '4px', border: '1px solid #444', background: '#111', color: 'white', marginRight: '10px' }}
            placeholder="Tên nhân vật..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required 
          />
          <select 
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #444', background: '#111', color: 'white', marginRight: '10px' }}
            value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}
          >
            {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" style={{ padding: '12px 30px', background: 'gold', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            ĐĂNG KÝ VÀO Ô {form.team_slot || '...'}
          </button>
        </form>

        {/* 60 CHÍNH THỨC - 10 CỘT */}
        <h2 style={{ color: 'gold', borderBottom: '2px solid gold', paddingBottom: '5px', marginBottom: '20px' }}>ĐỘI HÌNH CHÍNH THỨC (60 NGƯỜI)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '15px', marginBottom: '50px' }}>
          {[...Array(10)].map((_, colIdx) => (
            <div key={colIdx} style={{ background: '#0a0a0a', padding: '10px', borderRadius: '6px', border: '1px solid #222' }}>
              <div style={{ color: 'gold', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #333' }}>ĐỘI {colIdx + 1}</div>
              {[...Array(6)].map((_, rowIdx) => renderSlotCell('Chính thức', colIdx * 6 + rowIdx + 1))}
            </div>
          ))}
        </div>

        {/* 30 DỰ BỊ */}
        <h2 style={{ color: '#87CEEB', borderBottom: '2px solid #87CEEB', paddingBottom: '5px', marginBottom: '20px' }}>DỰ BỊ / HỌC VIỆC (30 NGƯỜI)</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {[...Array(30)].map((_, i) => (
            <div key={i} style={{ width: '110px' }}>{renderSlotCell('Học việc', i + 1)}</div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default App;
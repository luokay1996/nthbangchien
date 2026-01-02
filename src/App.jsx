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
  'Thần Tượng': { color: '#00008B' }, // Đổi tên thành Thần Tượng & Xanh dương đậm
  'Tố Vấn': { color: '#FF69B4' },
  'Cửu Linh': { color: '#800080' },
};

function App() {
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLimitEnabled, setIsLimitEnabled] = useState(true);
  const [movingMember, setMovingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase.from('register_list').select('*');
    if (!error) setMembers(data || []);
  }, []);

  useEffect(() => {
    fetchMembers();
    // Lắng nghe thay đổi thời gian thực từ Database
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, () => fetchMembers())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchMembers]);

  const handleAdminLogin = () => {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "quymonquan2026") { 
      setIsAdmin(true); 
      alert("ĐÃ KÍCH HOẠT QUYỀN ADMIN!"); 
    } else { 
      alert("Sai mật mã!"); 
    }
  };

  const toggleItem = async () => {
    if (!selectedMember) return;
    const newStatus = !selectedMember.has_item;
    
    // Cập nhật Database
    const { error } = await supabase.from('register_list')
      .update({ has_item: newStatus })
      .eq('id', selectedMember.id);
    
    if (!error) {
      // Cập nhật ngay lập tức vào danh sách hiển thị để thấy icon luôn
      setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, has_item: newStatus } : m));
      setSelectedMember(null); 
    } else {
      alert("Lỗi: Bạn cần thêm cột 'has_item' (kiểu bool) vào bảng trên Supabase!");
    }
  };

  const handleSlotClick = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    
    if (occupant) {
      setSelectedMember(occupant);
      if (isAdmin && movingMember) {
         handleSwap(occupant, type, slotNum);
      } else if (isAdmin) {
         setMovingMember(occupant);
      }
      return;
    }

    if (isAdmin && movingMember && !occupant) {
      handleMove(type, slotNum);
      return;
    }

    setForm({ ...form, type, team_slot: slotNum });
    setSelectedMember(null);
  };

  const handleMove = async (type, slotNum) => {
    const { error } = await supabase.from('register_list').update({ type, team_slot: slotNum }).eq('id', movingMember.id);
    if (!error) {
        setMembers(prev => prev.map(m => m.id === movingMember.id ? { ...m, type, team_slot: slotNum } : m));
        setMovingMember(null);
    }
  };

  const handleSwap = async (occupant, type, slotNum) => {
    if (movingMember.id === occupant.id) { setMovingMember(null); return; }
    const { error: err1 } = await supabase.from('register_list').update({ type: movingMember.type, team_slot: movingMember.team_slot }).eq('id', occupant.id);
    const { error: err2 } = await supabase.from('register_list').update({ type, team_slot: slotNum }).eq('id', movingMember.id);
    if (!err1 && !err2) {
        fetchMembers(); // Load lại toàn bộ để tránh sai lệch vị trí
        setMovingMember(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Vui lòng chọn 1 ô Slot!");
    const savedName = localStorage.getItem('my_char_name');
    if (!isAdmin && isLimitEnabled && savedName && members.some(m => m.char_name === savedName)) {
      return alert(`Bạn đã đăng ký nhân vật [${savedName}].`);
    }
    const { error } = await supabase.from('register_list').insert([form]);
    if (!error) {
      localStorage.setItem('my_char_name', form.char_name);
      setForm({ ...form, char_name: '', team_slot: null });
      fetchMembers();
    }
  };

  const deleteMember = async () => {
    if (!selectedMember) return;
    if (window.confirm(`Xác nhận hủy đăng ký cho [${selectedMember.char_name}]?`)) {
      const { error } = await supabase.from('register_list').delete().eq('id', selectedMember.id);
      if (!error) {
        if (selectedMember.char_name === localStorage.getItem('my_char_name')) localStorage.removeItem('my_char_name');
        setMembers(prev => prev.filter(m => m.id !== selectedMember.id));
        setSelectedMember(null);
      }
    }
  };

  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;
    const isBeingMoved = movingMember && movingMember.id === occupant?.id;

    return (
      <div key={`${type}-${slotNum}`} onClick={() => handleSlotClick(type, slotNum)}
        style={{
          height: '42px', margin: '3px 0', borderRadius: '4px',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#161616',
          border: isBeingMoved ? '2px solid white' : isSelected ? '2px solid gold' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '10px', color: 'white', 
          fontWeight: 'bold', position: 'relative', animation: isBeingMoved ? 'pulse 1s infinite' : 'none'
        }}
      >
        {occupant ? (
          <>
            <span style={{ padding: '0 2px', textAlign: 'center', lineHeight: '1.2' }}>{occupant.char_name}</span>
            {occupant.has_item && (
              <span style={{ position: 'absolute', top: '1px', right: '2px', fontSize: '10px', filter: 'drop-shadow(0 0 2px black)' }}>📦</span>
            )}
          </>
        ) : <span style={{ color: '#444' }}>S{slotNum}</span>}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '15px', textAlign: 'center', fontFamily: 'Arial' }}>
      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        .team-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; max-width: 1200px; margin: 0 auto; }
        @media (min-width: 1024px) { .team-grid { grid-template-columns: repeat(10, 1fr); } }
      `}</style>

      {/* ADMIN CONTROLS */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', zIndex: 100 }}>
        <button onClick={handleAdminLogin} style={{ background: isAdmin ? '#d4af37' : 'transparent', color: isAdmin ? '#000' : '#d4af37', border: '1px solid #d4af37', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{isAdmin ? "ADMIN: ON" : "ADMIN LOGIN"}</button>
      </div>

      <img src="/nth-logo.png" alt="Logo" style={{ width: '70px', margin: '0 auto', display: 'block' }} />
      <h1 style={{ color: 'gold', fontSize: '20px', margin: '10px 0' }}>BANG QUỶ MÔN QUAN</h1>

      {/* MENU TƯƠNG TÁC KHI CLICK VÀO TÊN */}
      {selectedMember && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', padding: '15px', borderRadius: '10px', border: '2px solid gold', zIndex: 1000, width: '90%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'gold' }}>{selectedMember.char_name} ({selectedMember.class_name})</div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {(isAdmin || selectedMember.char_name === localStorage.getItem('my_char_name')) && (
              <>
                <button onClick={toggleItem} style={{ background: selectedMember.has_item ? '#444' : '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', flex: 1, fontWeight: 'bold' }}>
                  {selectedMember.has_item ? "BỎ VẬT TƯ" : "MANG VẬT TƯ 📦"}
                </button>
                <button onClick={deleteMember} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', flex: 1, fontWeight: 'bold' }}>HỦY ĐĂNG KÝ</button>
              </>
            )}
            <button onClick={() => setSelectedMember(null)} style={{ background: '#333', color: 'white', border: 'none', padding: '10px', borderRadius: '4px' }}>ĐÓNG</button>
          </div>
        </div>
      )}

      {/* QUÂN SỐ */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', background: '#0a0a0a', padding: '10px', borderRadius: '8px', border: '1px solid #222', marginBottom: '15px', flexWrap: 'wrap' }}>
        {Object.keys(classInfo).map(cls => (
          <div key={cls} style={{ borderRight: '1px solid #222', paddingRight: '5px', minWidth: '60px' }}>
            <div style={{ color: classInfo[cls].color, fontSize: '10px', fontWeight: 'bold' }}>{cls}</div>
            <div style={{ fontSize: '14px' }}>{members.filter(m => m.class_name === cls).length}</div>
          </div>
        ))}
        <div style={{ paddingLeft: '8px', color: 'gold' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>📦 VẬT TƯ</div>
          <div style={{ fontSize: '14px' }}>{members.filter(m => m.has_item).length}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '25px' }}>
        <input style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px', width: '160px', marginBottom: '5px' }} placeholder="Tên nhân vật..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
        <select style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', margin: '0 5px', borderRadius: '4px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" style={{ padding: '10px 15px', background: 'gold', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>ĐĂNG KÝ {form.team_slot ? `(Ô ${form.team_slot})` : ''}</button>
      </form>

      <h2 style={{ color: 'gold', fontSize: '15px', marginBottom: '10px' }}>ĐỘI HÌNH CHÍNH THỨC (60)</h2>
      <div className="team-grid">
        {[...Array(10)].map((_, colIdx) => (
          <div key={colIdx} style={{ background: '#080808', padding: '4px', borderRadius: '4px', border: '1px solid #222' }}>
            <div style={{ color: 'gold', fontSize: '8px', marginBottom: '4px', fontWeight: 'bold' }}>T{colIdx + 1}</div>
            {[...Array(6)].map((_, rowIdx) => renderSlotCell('Chính thức', colIdx * 6 + rowIdx + 1))}
          </div>
        ))}
      </div>

      <h2 style={{ color: '#87CEEB', fontSize: '15px', margin: '20px 0 10px 0' }}>DỰ BỊ / HỌC VIỆC (30)</h2>
      <div className="team-grid">
        {[...Array(30)].map((_, i) => renderSlotCell('Học việc', i + 1))}
      </div>

      <footer style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid #222', fontSize: '11px', color: '#888' }}>
        <p>Lưu ý: Mỗi thiết bị đăng ký 1 ô. Nếu xóa lịch sử duyệt web sẽ không tự xóa được (cần nhờ Admin).</p>
        <p>Liên hệ: <strong>VôẢnhNhân (Zalo: Khoa)</strong></p>
      </footer>
    </div>
  );
}

export default App;
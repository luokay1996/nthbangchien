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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Vui lòng click chọn 1 ô Slot bên dưới trước!");
    
    // Kiểm tra xem ô này đã có người chưa
    const isOccupied = members.some(m => m.type === form.type && m.team_slot === form.team_slot);
    if (isOccupied) return alert("Ô này đã có người đăng ký rồi!");

    const { error } = await supabase.from('register_list').insert([form]);
    if (error) alert("Lỗi: " + error.message);
    else setForm({ ...form, char_name: '', team_slot: null });
  };

  const renderSlots = (type, count) => {
    const slots = [];
    for (let i = 1; i <= count; i++) {
      const occupant = members.find(m => m.type === type && m.team_slot === i);
      const isSelected = form.type === type && form.team_slot === i;
      
      slots.push(
        <div 
          key={`${type}-${i}`}
          onClick={() => setForm({ ...form, type: type, team_slot: i })}
          style={{
            width: '100px', height: '45px', margin: '4px', borderRadius: '4px',
            backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#2a2a2a',
            border: isSelected ? '2px solid gold' : '1px solid #444',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '11px', color: occupant ? 'white' : '#666', fontWeight: 'bold',
            overflow: 'hidden', position: 'relative'
          }}
        >
          {occupant ? (
            <>
              <span style={{whiteSpace: 'nowrap'}}>{occupant.char_name}</span>
              <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if(window.confirm("Xóa đăng ký này?")) supabase.from('register_list').delete().eq('id', occupant.id); 
                }}
                style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.7)', color: 'white', border: 'none', fontSize: '9px', cursor: 'pointer', padding: '0 3px' }}
              >x</button>
            </>
          ) : `Slot ${i}`}
        </div>
      );
    }
    return <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>{slots}</div>;
  };

  return (
    <div style={{ backgroundColor: '#121212', color: 'white', minHeight: '100vh', padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <img src="/nth-logo.png" alt="Logo" style={{ width: '100px', marginBottom: '10px' }} />
      <h1 style={{ color: 'gold', margin: '0', fontSize: '24px' }}>ĐĂNG KÝ BANG CHIẾN</h1>
      <p style={{ color: '#aaa', fontSize: '14px' }}>Ngày: {new Date().toLocaleDateString('vi-VN')}</p>

      <form onSubmit={handleSubmit} style={{ margin: '20px auto', maxWidth: '400px', background: '#222', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
        <input 
          style={{ padding: '10px', width: '90%', marginBottom: '10px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
          placeholder="Nhập tên nhân vật..." 
          value={form.char_name} 
          onChange={e => setForm({...form, char_name: e.target.value})} 
          required 
        />
        <select 
          style={{ padding: '10px', width: '95%', marginBottom: '10px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: 'white' }}
          value={form.class_name} 
          onChange={e => setForm({...form, class_name: e.target.value})}
        >
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <p style={{ color: 'gold', fontSize: '13px' }}>Đang chọn: <span style={{color: form.type === 'Học việc' ? '#87CEEB' : 'gold'}}>{form.type}</span> - Ô số {form.team_slot || '?'}</p>
        <button type="submit" style={{ padding: '10px 40px', background: 'gold', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', color: '#000' }}>ĐĂNG KÝ</button>
      </form>

      <div style={{ marginTop: '30px' }}>
        <h2 style={{ color: 'gold', borderBottom: '1px solid #333', paddingBottom: '10px' }}>CHÍNH THỨC ({members.filter(m => m.type === 'Chính thức').length}/60)</h2>
        {renderSlots('Chính thức', 60)}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2 style={{ color: '#87CEEB', borderBottom: '1px solid #333', paddingBottom: '10px' }}>HỌC VIỆC ({members.filter(m => m.type === 'Học việc').length}/30)</h2>
        {renderSlots('Học việc', 30)}
      </div>
    </div>
  );
}

export default App;
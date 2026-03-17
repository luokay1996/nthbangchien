import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Cấu hình màu sắc Hệ phái
const classInfo = {
  'Toái Mộng': { color: '#87CEEB' },
  'Thiết Y': { color: '#FFA500' },
  'Huyết Hà': { color: '#8B0000' },
  'Thần Tương': { color: '#4169e1ff' }, 
  'Tố Vấn': { color: '#FF69B4' },
  'Cửu Linh': { color: '#800080' },
  'Long Ngâm': { color: '#66FFFF' },
};

// Màu nền nhẹ cho các nhóm (G1, G2, G3...)
const groupBgs = [
  'rgba(255, 255, 255, 0.05)', // Nhóm 1
  'rgba(0, 255, 255, 0.12)',   // Nhóm 2
  'rgba(255, 215, 0, 0.12)',   // Nhóm 3
  'rgba(255, 69, 0, 0.15)',    // Nhóm 4
  'rgba(154, 205, 50, 0.15)',  // Nhóm 5
  'rgba(255, 0, 255, 0.12)',   // Nhóm 6
];

function App() {
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLimitEnabled, setIsLimitEnabled] = useState(true);
  const [movingMember, setMovingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });

  // State Chia Nhóm
  const [groupStops, setGroupStops] = useState([]); // Lưu các điểm cắt Team

  // State Map
  const [teamPositions, setTeamPositions] = useState([]);
  const [selectedTeamToMove, setSelectedTeamToMove] = useState(null);

  // Lấy dữ liệu từ Supabase
  const fetchData = useCallback(async () => {
    const { data: mems } = await supabase.from('register_list').select('*');
    const { data: pos } = await supabase.from('team_positions').select('*');
    if (mems) setMembers(mems);
    if (pos) setTeamPositions(pos);
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_positions' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  const officialCount = members.filter(m => m.char_name && m.type === 'Chính thức').length;

  // Xác định Team thuộc nhóm nào
  const getGroupIdx = (teamIdx) => {
    const teamNum = teamIdx + 1;
    let idx = 0;
    const sortedStops = [...groupStops].sort((a, b) => a - b);
    for (let stop of sortedStops) {
      if (teamNum > stop) idx++;
    }
    return idx;
  };

  // Xử lý di chuyển Team trên Map
  const handleMapClick = async (e) => {
    if (!isAdmin || selectedTeamToMove === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const { error } = await supabase
      .from('team_positions')
      .update({ pos_x: x, pos_y: y })
      .eq('team_id', selectedTeamToMove);

    if (!error) setSelectedTeamToMove(null);
  };

  const handleAdminLogin = () => {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "quymonquan2026") setIsAdmin(true);
    else alert("Sai mật mã!");
  };

  const handleSlotClick = async (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    
    if (isAdmin && movingMember) {
      if (occupant) {
        await Promise.all([
          supabase.from('register_list').update({ type: occupant.type, team_slot: occupant.team_slot }).eq('id', movingMember.id),
          supabase.from('register_list').update({ type: movingMember.type, team_slot: movingMember.team_slot }).eq('id', occupant.id)
        ]);
      } else {
        await supabase.from('register_list').update({ type, team_slot: slotNum }).eq('id', movingMember.id);
      }
      setMovingMember(null);
      fetchData();
      return;
    }

    if (occupant) {
      setSelectedMember(occupant);
      if (isAdmin) setMovingMember(occupant);
      return;
    }

    setForm({ ...form, type, team_slot: slotNum });
    setSelectedMember(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Hãy chọn ô!");
    const { error } = await supabase.from('register_list').insert([form]);
    if (!error) {
      setForm({ ...form, char_name: '', team_slot: null });
      fetchData();
    }
  };

  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;
    const isLeader = type === 'Chính thức' && (slotNum - 1) % 6 === 0;

    return (
      <div key={`${type}-${slotNum}`} onClick={() => handleSlotClick(type, slotNum)}
        style={{
          height: '40px', margin: '3px 0', borderRadius: '4px', position: 'relative',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#111',
          border: isSelected ? '2px solid gold' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          fontSize: '10px', color: occupant?.class_name === 'Long Ngâm' ? '#000' : 'white', fontWeight: 'bold'
        }}
      >
        {isLeader && <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '8px' }}>🔑</span>}
        {occupant ? (
          <>
            <span style={{ textAlign: 'center' }}>{occupant.char_name.substring(0, 8)}</span>
            {occupant.has_item && <span style={{ position: 'absolute', top: '1px', right: '2px' }}>📦</span>}
          </>
        ) : `S${slotNum}`}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '15px', textAlign: 'center', fontFamily: 'Arial' }}>
      <style>{`
        .map-container { width: 100%; max-width: 900px; height: 450px; margin: 0 auto 20px; border: 2px solid #333; position: relative; background: url('https://i.imgur.com/GndYVvR.png') center/cover; border-radius: 12px; overflow: hidden; }
        .team-marker { position: absolute; width: 30px; height: 30px; background: gold; color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; transform: translate(-50%, -50%); cursor: pointer; border: 2px solid white; box-shadow: 0 0 10px gold; z-index: 10; }
        .team-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 1200px; margin: 0 auto; }
        @media (min-width: 1024px) { .team-grid { grid-template-columns: repeat(10, 1fr); } }
        .group-slider { width: 100%; max-width: 500px; direction: rtl; cursor: pointer; accent-color: gold; height: 12px; }
      `}</style>

      {/* ADMIN PANEL */}
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 100 }}>
        <button onClick={handleAdminLogin} style={{ background: isAdmin ? 'gold' : '#222', color: isAdmin ? '#000' : 'gold', border: '1px solid gold', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          {isAdmin ? "ADMIN: ON" : "ADMIN LOGIN"}
        </button>
      </div>

      <h1 style={{ color: 'gold', fontSize: '24px', margin: '10px 0' }}>QUỶ MÔN QUAN - CHIẾN THUẬT</h1>

      {/* INTERACTIVE MAP */}
      <div className="map-container" onClick={handleMapClick}>
        {teamPositions.map(tp => (
          <div key={tp.team_id} className="team-marker" 
            style={{ left: `${tp.pos_x}%`, top: `${tp.pos_y}%`, outline: selectedTeamToMove === tp.team_id ? '4px solid red' : 'none' }}
            onClick={(e) => { e.stopPropagation(); if(isAdmin) setSelectedTeamToMove(tp.team_id); }}>
            {tp.team_id}
          </div>
        ))}
      </div>

      {/* THANH TRƯỢT CHIA NHÓM */}
      <div style={{ background: '#111', padding: '15px', borderRadius: '12px', margin: '20px auto', maxWidth: '700px', border: '1px solid #222' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'gold', marginBottom: '10px' }}>
          <span>T1</span>
          <span><b>KÉO TỪ PHẢI SANG TRÁI ĐỂ CHIA NHÓM</b></span>
          <span>T10</span>
        </div>
        <input 
          type="range" min="1" max="10" step="1" className="group-slider"
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val === 10) return;
            setGroupStops(prev => [...new Set([...prev, val])].sort((a,b) => a - b));
          }}
        />
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => setGroupStops([])} style={{ background: '#333', color: 'white', border: 'none', padding: '6px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>RESET CHIA NHÓM</button>
        </div>
        {groupStops.length > 0 && <div style={{ color: '#888', fontSize: '11px', marginTop: '5px' }}>Điểm cắt tại Team: {groupStops.join(', ')}</div>}
      </div>

      {/* GRID ĐỘI HÌNH CHÍNH */}
      <div className="team-grid">
        {[...Array(10)].map((_, col) => {
          const gIdx = getGroupIdx(col);
          return (
            <div key={col} style={{ 
              background: groupBgs[gIdx % groupBgs.length], 
              padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,215,0,0.1)'
            }}>
              <div style={{ color: 'gold', fontSize: '10px', fontWeight: 'bold', marginBottom: '5px' }}>T{col + 1} <small style={{color: '#666'}}>(G{gIdx + 1})</small></div>
              {[...Array(6)].map((_, row) => renderSlotCell('Chính thức', col * 6 + row + 1))}
            </div>
          );
        })}
      </div>

      {/* FORM ĐĂNG KÝ */}
      <div style={{ margin: '30px 0' }}>
        <form onSubmit={handleSubmit}>
          <input style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} placeholder="Tên nhân vật..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
          <select style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', margin: '0 5px', borderRadius: '4px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
            {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" style={{ padding: '10px 20px', background: 'gold', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            ĐĂNG KÝ {form.team_slot ? `(S${form.team_slot})` : ''}
          </button>
        </form>
      </div>

      {/* DỰ BỊ */}
      <h2 style={{ color: '#87CEEB', fontSize: '18px', margin: '40px 0 15px' }}>DỰ BỊ / HỌC VIỆC (30)</h2>
      <div className="team-grid">
        {[...Array(30)].map((_, i) => renderSlotCell('Học việc', i + 1))}
      </div>

      {/* POPUP THÀNH VIÊN */}
      {selectedMember && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '2px solid gold', zIndex: 1000, width: '90%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '15px', fontWeight: 'bold', color: 'gold' }}>{selectedMember.char_name} ({selectedMember.class_name})</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={async () => {
              await supabase.from('register_list').update({ has_item: !selectedMember.has_item }).eq('id', selectedMember.id);
              setSelectedMember(null); fetchData();
            }} style={{ flex: 1, background: '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold' }}>📦 VẬT TƯ</button>
            <button onClick={async () => {
              if(window.confirm("Xóa thành viên này?")) await supabase.from('register_list').delete().eq('id', selectedMember.id);
              setSelectedMember(null); fetchData();
            }} style={{ flex: 1, background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold' }}>XÓA</button>
            <button onClick={() => setSelectedMember(null)} style={{ flex: 1, background: '#444', color: 'white', border: 'none', padding: '10px', borderRadius: '4px' }}>ĐÓNG</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
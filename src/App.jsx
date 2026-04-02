import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const classInfo = {
  'Toái Mộng': { color: '#87CEEB' },
  'Thiết Y': { color: '#FFA500' },
  'Huyết Hà': { color: '#8B0000' },
  'Thần Tương': { color: '#4169e1ff' }, 
  'Tố Vấn': { color: '#FF69B4' },
  'Cửu Linh': { color: '#800080' },
  'Long Ngâm': { color: '#66FFFF' },
};

const groupSettings = {
  'Nhóm 1': { bg: 'rgba(255, 255, 255, 0.05)', border: '#87db65', label: '#87db65' },
  'Nhóm 2': { bg: 'rgba(0, 255, 255, 0.12)', border: '#00ffff', label: '#00ffff' },
  'Nhóm 3': { bg: 'rgba(255, 215, 0, 0.12)', border: '#ffd700', label: '#ffd700' },
  'Nhóm 4': { bg: 'rgba(255, 69, 0, 0.15)', border: '#ff4500', label: '#ff4500' },
};

function App() {
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLimitEnabled, setIsLimitEnabled] = useState(true);
  const [movingMember, setMovingMember] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });
  const [teamGroups, setTeamGroups] = useState({});
  const [teamPositions, setTeamPositions] = useState({});
  const [mapMarkers, setMapMarkers] = useState([]);
  const mapRef = useRef(null);

  const fetchData = useCallback(async () => {
    const [mems, groups, positions, markers] = await Promise.all([
      supabase.from('register_list').select('*'),
      supabase.from('team_groups').select('*'),
      supabase.from('team_positions').select('*'),
      supabase.from('map_markers').select('*').order('created_at', { ascending: true })
    ]);
    
    if (mems.data) setMembers(mems.data);
    if (groups.data) setTeamGroups(Object.fromEntries(groups.data.map(g => [g.team_id, g.group_name])));
    if (positions.data) setTeamPositions(Object.fromEntries(positions.data.map(p => [p.team_id, { x: p.pos_x, y: p.pos_y }])));
    if (markers.data) setMapMarkers(markers.data);
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_groups' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_positions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_markers' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  // TỐI ƯU HOÁN ĐỔI (Optimistic Update)
  const performSwap = async (targetType, targetSlot) => {
    if (!movingMember || !isAdmin) return;

    const targetMember = members.find(m => m.type === targetType && m.team_slot === targetSlot);
    const originalMoving = { ...movingMember };

    // Cập nhật UI ngay lập tức
    setMembers(prev => prev.map(m => {
      if (m.id === movingMember.id) return { ...m, type: targetType, team_slot: targetSlot };
      if (targetMember && m.id === targetMember.id) return { ...m, type: originalMoving.type, team_slot: originalMoving.team_slot };
      return m;
    }));

    // Gửi lệnh lên DB
    try {
      if (targetMember) {
        await Promise.all([
          supabase.from('register_list').update({ type: targetType, team_slot: targetSlot }).eq('id', movingMember.id),
          supabase.from('register_list').update({ type: originalMoving.type, team_slot: originalMoving.team_slot }).eq('id', targetMember.id)
        ]);
      } else {
        await supabase.from('register_list').update({ type: targetType, team_slot: targetSlot }).eq('id', movingMember.id);
      }
    } catch (err) {
      fetchData(); // Nếu lỗi thì đồng bộ lại
    }
    setMovingMember(null);
    setDragOverSlot(null);
  };

  const handleSlotClick = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    if (isAdmin && movingMember) {
      performSwap(type, slotNum);
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

  // LOGIC MAP & MARKERS
  const handleDropNewMarker = async (e) => {
    if (!isAdmin || !mapRef.current) return;
    const type = e.dataTransfer.getData("markerType");
    if (!type) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    await supabase.from('map_markers').insert([{ type, pos_x: Math.max(0, Math.min(100, x)), pos_y: Math.max(0, Math.min(100, y)) }]);
    fetchData();
  };

  const updateTeamPosition = async (teamId, x, y) => {
    setTeamPositions(prev => ({ ...prev, [teamId]: { x, y } }));
    await supabase.from('team_positions').update({ pos_x: x, pos_y: y }).eq('team_id', teamId);
  };

  const handleDragEnd = (e, teamId) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    updateTeamPosition(teamId, x, y);
  };

  // ADMIN ACTIONS
  const handleAdminLogin = () => {
    const pass = prompt("Mật mã:");
    if (pass === "quymonquan2026") { setIsAdmin(true); alert("ADMIN OK!"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) return alert("Chọn ô!");
    const savedName = localStorage.getItem('my_char_name');
    if (!isAdmin && isLimitEnabled && savedName && members.some(m => m.char_name === savedName)) return alert("Đã đăng ký!");
    const { error } = await supabase.from('register_list').insert([form]);
    if (!error) { localStorage.setItem('my_char_name', form.char_name); setForm({ ...form, char_name: '', team_slot: null }); fetchData(); }
  };

  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;
    const isBeingMoved = movingMember && movingMember.id === occupant?.id;
    const isHovered = dragOverSlot === `${type}-${slotNum}`;
    const isLeaderSlot = type === 'Chính thức' && (slotNum - 1) % 6 === 0;

    return (
      <div 
        key={`${type}-${slotNum}`} 
        onClick={() => handleSlotClick(type, slotNum)}
        draggable={isAdmin && !!occupant}
        onDragStart={(e) => { setMovingMember(occupant); e.dataTransfer.effectAllowed = "move"; }}
        onDragOver={(e) => { e.preventDefault(); setDragOverSlot(`${type}-${slotNum}`); }}
        onDrop={(e) => { e.preventDefault(); performSwap(type, slotNum); }}
        className={`slot-cell ${isHovered ? 'drag-hover' : ''}`}
        style={{
          height: '42px', margin: '3px 0', borderRadius: '4px', position: 'relative',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#111',
          border: isBeingMoved ? '2px solid white' : isSelected ? '2px solid gold' : isHovered ? '2px dashed #fff' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          fontSize: '10px', color: occupant?.class_name === 'Long Ngâm' ? '#000' : 'white', fontWeight: 'bold',
          padding: '0 4px', overflow: 'hidden', opacity: isBeingMoved ? 0.5 : 1
        }}
      >
        {isLeaderSlot && <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '8px' }}>🔑</span>}
        {occupant ? <div style={{ pointerEvents: 'none' }}>{occupant.char_name} {occupant.has_item && '📦'}</div> : `S${slotNum}`}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '15px', textAlign: 'center', fontFamily: 'sans-serif', userSelect: 'none' }}>
      <style>{`
        .team-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 1200px; margin: 0 auto; }
        @media (min-width: 1024px) { .team-grid { grid-template-columns: repeat(10, 1fr); } }
        .group-select { width: 100%; background: #000; color: #fff; border: 1px solid #444; font-size: 10px; padding: 3px; cursor: pointer; text-align: center; }
        .map-container { position: relative; width: 100%; border: 2px solid #444; margin-top: 15px; overflow: hidden; }
        .team-node { position: absolute; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #000; transform: translate(-50%, -50%); border: 2px solid #fff; z-index: 10; }
        .marker-icon { position: absolute; font-size: 24px; transform: translate(-50%, -50%); z-index: 15; }
        .skill-slot { width: 45px; height: 45px; background: rgba(255,255,255,0.1); border: 1px solid #444; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #666; }
      `}</style>

      {/* ADMIN CONTROLS */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button onClick={handleAdminLogin} style={{ background: isAdmin ? 'gold' : 'none', color: isAdmin ? '#000' : 'gold', border: '1px solid gold', padding: '5px', borderRadius: '4px', fontSize: '10px' }}>
          {isAdmin ? "ADMIN: ON" : "LOGIN"}
        </button>
      </div>

      <h1 style={{ color: 'gold', fontSize: '20px' }}>BANG QUỶ MÔN QUAN</h1>

      {/* STATS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', background: '#0a0a0a', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
        {Object.keys(classInfo).map(cls => (
          <div key={cls} style={{ borderRight: '1px solid #222', paddingRight: '5px' }}>
            <div style={{ color: classInfo[cls].color, fontSize: '9px' }}>{cls}</div>
            <div style={{ fontSize: '12px' }}>{members.filter(m => m.class_name === cls).length}</div>
          </div>
        ))}
        <div style={{ color: '#00FF00', paddingLeft: '10px' }}>
          <div style={{ fontSize: '9px' }}>QUÂN SỐ</div>
          <div style={{ fontSize: '12px' }}>{members.filter(m => m.char_name && m.type === 'Chính thức').length}/60</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input style={{ padding: '8px', background: '#111', color: 'white', border: '1px solid #333' }} placeholder="Tên..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
        <select style={{ padding: '8px', background: '#111', color: 'white', border: '1px solid #333', margin: '0 5px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" style={{ padding: '8px', background: 'gold', fontWeight: 'bold' }}>ĐĂNG KÝ {form.team_slot ? `(S${form.team_slot})` : ''}</button>
      </form>

      <div className="team-grid">
        {[...Array(10)].map((_, col) => (
          <div key={col} style={{ background: groupSettings[teamGroups[col+1] || 'Nhóm 1'].bg, padding: '5px', borderRadius: '8px', border: `2px solid ${groupSettings[teamGroups[col+1] || 'Nhóm 1'].border}` }}>
            <div style={{ fontSize: '10px', color: groupSettings[teamGroups[col+1] || 'Nhóm 1'].label }}>TEAM {col+1}</div>
            {[...Array(6)].map((_, row) => renderSlotCell('Chính thức', col * 6 + row + 1))}
          </div>
        ))}
      </div>

      {/* DỰ BỊ */}
      <h2 style={{ fontSize: '14px', color: '#87CEEB', margin: '20px 0' }}>DỰ BỊ (30)</h2>
      <div className="team-grid">
        {[...Array(30)].map((_, i) => renderSlotCell('Học việc', i + 1))}
      </div>

      {/* MAP */}
      <div style={{ maxWidth: '900px', margin: '40px auto', background: '#0a0a0a', padding: '15px', borderRadius: '12px' }}>
        <h3 style={{ color: 'gold' }}>BẢN ĐỒ CHIẾN THUẬT</h3>
        <div className="map-container" ref={mapRef} onDragOver={e => e.preventDefault()} onDrop={handleDropNewMarker}>
          <img src="https://i.postimg.cc/SsMMSZLG/unnam2ed.jpg" alt="Map" style={{ width: '100%', opacity: 0.7 }} />
          {mapMarkers.map(m => <div key={m.id} className="marker-icon" style={{ left: `${m.pos_x}%`, top: `${m.pos_y}%` }}>{m.type === 'sword' ? '🗡️' : m.type === 'shield' ? '🛡️' : '⚠️'}</div>)}
          {[...Array(10)].map((_, i) => {
            const pos = teamPositions[i+1] || { x: 8 * (i+1), y: 15 };
            return <div key={i} draggable={isAdmin} onDragEnd={e => handleDragEnd(e, i+1)} className="team-node" style={{ left: `${pos.x}%`, top: `${pos.y}%`, backgroundColor: groupSettings[teamGroups[i+1] || 'Nhóm 1'].border }}>T{i+1}</div>
          })}
          {isAdmin && (
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '5px' }}>
              <div draggable onDragStart={e => e.dataTransfer.setData("markerType", "sword")} style={{ cursor: 'grab', fontSize: '20px' }}>🗡️</div>
              <div draggable onDragStart={e => e.dataTransfer.setData("markerType", "shield")} style={{ cursor: 'grab', fontSize: '20px' }}>🛡️</div>
              <div draggable onDragStart={e => e.dataTransfer.setData("markerType", "warn")} style={{ cursor: 'grab', fontSize: '20px' }}>⚠️</div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP: THÔNG TIN THÀNH VIÊN & 5 Ô KỸ NĂNG */}
      {selectedMember && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#111', padding: '20px', borderRadius: '15px', border: '2px solid gold', zIndex: 1001, width: '90%', maxWidth: '400px', boxShadow: '0 0 20px rgba(0,0,0,0.9)' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: classInfo[selectedMember.class_name].color, marginBottom: '5px' }}>{selectedMember.char_name}</div>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '15px' }}>Hệ: {selectedMember.class_name} | {selectedMember.type}</div>
          
          {/* BẢNG KỸ NĂNG (Gồm 5 ô) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skill-slot" style={{ border: isAdmin ? '1px dashed gold' : '1px solid #444', cursor: isAdmin ? 'pointer' : 'default' }}>
                {/* Sau này sẽ hiển thị icon kỹ năng ở đây */}
                {isAdmin ? 'Chọn' : 'Trống'}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {(isAdmin || selectedMember.char_name === localStorage.getItem('my_char_name')) && (
              <>
                <button onClick={async () => { await supabase.from('register_list').update({ has_item: !selectedMember.has_item }).eq('id', selectedMember.id); fetchData(); setSelectedMember(null); }} style={{ flex: 1, background: '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '6px' }}>
                  {selectedMember.has_item ? "BỎ VẬT TƯ" : "VẬT TƯ 📦"}
                </button>
                <button onClick={async () => { if (window.confirm("Xóa?")) { await supabase.from('register_list').delete().eq('id', selectedMember.id); fetchData(); setSelectedMember(null); } }} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '6px' }}>XÓA</button>
              </>
            )}
            <button onClick={() => setSelectedMember(null)} style={{ background: '#333', color: 'white', border: 'none', padding: '10px', borderRadius: '6px' }}>ĐÓNG</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
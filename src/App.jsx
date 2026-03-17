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
  'Nhóm 1': { bg: 'rgba(255, 255, 255, 0.05)', border: '#7cd826', label: '#7cd826' },
  'Nhóm 2': { bg: 'rgba(0, 255, 255, 0.12)', border: '#00ffff', label: '#00ffff' },
  'Nhóm 3': { bg: 'rgba(255, 215, 0, 0.12)', border: '#ffd700', label: '#ffd700' },
  'Nhóm 4': { bg: 'rgba(255, 69, 0, 0.15)', border: '#ff4500', label: '#ff4500' },
};

function App() {
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLimitEnabled, setIsLimitEnabled] = useState(true);
  const [movingMember, setMovingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });
  const [teamGroups, setTeamGroups] = useState({});
  const [teamPositions, setTeamPositions] = useState({});
  const mapRef = useRef(null);

  const fetchData = useCallback(async () => {
    const { data: mems } = await supabase.from('register_list').select('*');
    const { data: groups } = await supabase.from('team_groups').select('*');
    const { data: positions } = await supabase.from('team_positions').select('*');
    
    if (mems) setMembers(mems);
    if (groups) {
      const groupMap = Object.fromEntries(groups.map(g => [g.team_id, g.group_name]));
      setTeamGroups(groupMap);
    }
    if (positions) {
      const posMap = Object.fromEntries(positions.map(p => [p.team_id, { x: p.pos_x, y: p.pos_y }]));
      setTeamPositions(posMap);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('global-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_groups' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_positions' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  const updateTeamPosition = async (teamId, x, y) => {
    // Cập nhật UI ngay lập tức để mượt mà (Optimistic Update)
    setTeamPositions(prev => ({ ...prev, [teamId]: { x, y } }));
    await supabase.from('team_positions').update({ pos_x: x, pos_y: y }).eq('team_id', teamId);
  };

  const handleDragEnd = (e, teamId) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    
    // Tính toán tọa độ % dựa trên vị trí chuột thả ra
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Giới hạn trong khung bản đồ
    const safeX = Math.max(0, Math.min(100, x));
    const safeY = Math.max(0, Math.min(100, y));
    
    updateTeamPosition(teamId, safeX, safeY);
  };

  const handleGroupChange = async (teamId, newGroupName) => {
    if (!isAdmin) return;
    setTeamGroups(prev => ({ ...prev, [teamId]: newGroupName }));
    const { error } = await supabase.from('team_groups').update({ group_name: newGroupName }).eq('team_id', teamId);
    if (error) fetchData();
  };

  const officialCount = members.filter(m => m.char_name && m.type === 'Chính thức').length;

  const handleAdminLogin = () => {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "quymonquan2026") { 
      setIsAdmin(true); 
      alert("ĐÃ KÍCH HOẠT QUYỀN ADMIN!"); 
    } else { 
      alert("Sai mật mã!"); 
    }
  };

  const handleResetBoard = async () => {
    if (window.confirm("Xóa sạch danh sách tuần này?")) {
      const { error } = await supabase.from('register_list').delete().neq('id', 0);
      if (!error) fetchData();
    }
  };

  const toggleItem = async () => {
    if (!selectedMember) return;
    const { error } = await supabase.from('register_list').update({ has_item: !selectedMember.has_item }).eq('id', selectedMember.id);
    if (!error) setSelectedMember(null);
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
    if (!form.team_slot) return alert("Vui lòng chọn ô Slot!");
    const savedName = localStorage.getItem('my_char_name');
    if (!isAdmin && isLimitEnabled && savedName && members.some(m => m.char_name === savedName)) {
      return alert(`Bạn đã đăng ký nhân vật [${savedName}]. Mỗi người chỉ được 1 ô!`);
    }
    const { error } = await supabase.from('register_list').insert([form]);
    if (!error) {
      localStorage.setItem('my_char_name', form.char_name);
      setForm({ ...form, char_name: '', team_slot: null });
    }
  };

  const deleteMember = async () => {
    if (!selectedMember) return;
    if (window.confirm(`Xác nhận xóa [${selectedMember.char_name}]?`)) {
      const { error } = await supabase.from('register_list').delete().eq('id', selectedMember.id);
      if (!error) {
        if (selectedMember.char_name === localStorage.getItem('my_char_name')) localStorage.removeItem('my_char_name');
        setSelectedMember(null);
      }
    }
  };

  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isSelected = form.type === type && form.team_slot === slotNum;
    const isBeingMoved = movingMember && movingMember.id === occupant?.id;
    const isLeaderSlot = type === 'Chính thức' && (slotNum - 1) % 6 === 0;

    return (
      <div key={`${type}-${slotNum}`} onClick={() => handleSlotClick(type, slotNum)}
        style={{
          height: '42px', margin: '3px 0', borderRadius: '4px', position: 'relative',
          backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#111',
          border: isBeingMoved ? '2px solid white' : isSelected ? '2px solid gold' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          fontSize: '10px', color: occupant?.class_name === 'Long Ngâm' ? '#000' : 'white', fontWeight: 'bold',
          padding: '0 4px', overflow: 'hidden'
        }}
      >
        {isLeaderSlot && <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '8px', opacity: 0.8 }}>🔑</span>}
        {occupant ? (
          <div style={{ width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {occupant.char_name} {occupant.has_item && '📦'}
          </div>
        ) : `S${slotNum}`}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '15px', textAlign: 'center', fontFamily: 'Arial', userSelect: 'none' }}>
      <style>{`
        .team-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 1200px; margin: 0 auto; }
        @media (min-width: 1024px) { .team-grid { grid-template-columns: repeat(10, 1fr); } }
        .group-select { width: 100%; background: #000; color: #fff; border: 1px solid #444; font-size: 10px; border-radius: 3px; cursor: pointer; margin-top: 5px; padding: 3px; font-weight: bold; appearance: none; text-align: center; }
        .group-select:disabled { cursor: default; border-style: dashed; color: #fff; opacity: 1; }
        
        .map-section { max-width: 900px; margin: 40px auto; padding: 20px; background: #0a0a0a; border-radius: 12px; border: 1px solid #333; position: relative; }
        .map-container { position: relative; width: 100%; border-radius: 8px; overflow: hidden; border: 2px solid #444; margin-top: 15px; }
        .map-bg { width: 100%; display: block; opacity: 0.8; pointer-events: none; -webkit-user-drag: none; }
        
        .team-node { 
          position: absolute; width: 34px; height: 34px; border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 12px; font-weight: bold; color: #000; cursor: move; 
          transform: translate(-50%, -50%); border: 2px solid #fff; 
          box-shadow: 0 0 15px rgba(0,0,0,0.8);
          z-index: 10; transition: transform 0.1s;
          touch-action: none;
        }
        .team-node:active { transform: translate(-50%, -50%) scale(1.2); z-index: 100; }
      `}</style>

      {/* ADMIN CONTROLS */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', zIndex: 100 }}>
        <button onClick={handleAdminLogin} style={{ background: isAdmin ? '#d4af37' : 'transparent', color: isAdmin ? '#000' : '#d4af37', border: '1px solid #d4af37', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          {isAdmin ? "ADMIN: ON" : "ADMIN LOGIN"}
        </button>
        {isAdmin && (
          <>
            <button onClick={() => setIsLimitEnabled(!isLimitEnabled)} style={{ background: isLimitEnabled ? '#222' : 'red', color: 'white', border: '1px solid #444', padding: '5px 10px', borderRadius: '4px', fontSize: '10px' }}>
              GIỚI HẠN: {isLimitEnabled ? "BẬT" : "TẮT"}
            </button>
            <button onClick={handleResetBoard} style={{ background: 'blue', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '10px' }}>RESET</button>
          </>
        )}
      </div>

      <img src="/nth-logo.png" alt="Logo" style={{ width: '60px', margin: '0 auto', display: 'block' }} />
      <h1 style={{ color: 'gold', fontSize: '20px', margin: '10px 0' }}>BANG QUỶ MÔN QUAN</h1>

      {/* CLASS STATS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', background: '#0a0a0a', padding: '10px', borderRadius: '8px', border: '1px solid #222', marginBottom: '15px', flexWrap: 'wrap' }}>
        {Object.keys(classInfo).map(cls => (
          <div key={cls} style={{ borderRight: '1px solid #222', paddingRight: '5px', minWidth: '60px' }}>
            <div style={{ color: classInfo[cls].color, fontSize: '10px', fontWeight: 'bold' }}>{cls}</div>
            <div style={{ fontSize: '14px' }}>{members.filter(m => m.class_name === cls).length}</div>
          </div>
        ))}
        <div style={{ paddingLeft: '8px', borderLeft: '2px solid #333' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#00FF00' }}>QUÂN SỐ</div>
          <div style={{ fontSize: '14px', color: '#00FF00' }}>{officialCount} / 60</div>
        </div>
      </div>
      
      {/* REGISTER FORM */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '25px' }}>
        <input style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px', width: '160px' }} placeholder="Tên..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
        <select style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', margin: '0 5px', borderRadius: '4px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" style={{ padding: '10px 15px', background: 'gold', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            ĐĂNG KÝ {form.team_slot ? `(S${form.team_slot})` : ''}
        </button>
      </form>

      {/* MAIN TEAMS */}
      <div className="team-grid">
        {[...Array(10)].map((_, col) => {
          const teamNum = col + 1;
          const currentGroup = teamGroups[teamNum] || 'Nhóm 1';
          const settings = groupSettings[currentGroup];
          return (
            <div key={col} style={{ 
              background: settings.bg, padding: '8px', borderRadius: '8px', border: `2px solid ${settings.border}`,
              boxShadow: currentGroup !== 'Nhóm 1' ? `0 0 10px ${settings.border}33` : 'none'
            }}>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: settings.label, fontSize: '11px', fontWeight: 'bold' }}>TEAM {teamNum}</span>
                <select className="group-select" style={{ borderColor: settings.border }} value={currentGroup} disabled={!isAdmin} onChange={(e) => handleGroupChange(teamNum, e.target.value)}>
                  {Object.keys(groupSettings).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {[...Array(6)].map((_, row) => renderSlotCell('Chính thức', col * 6 + row + 1))}
            </div>
          );
        })}
      </div>

      <h2 style={{ color: '#87CEEB', fontSize: '15px', margin: '30px 0 10px 0' }}>DỰ BỊ (30)</h2>
      <div className="team-grid">
        {[...Array(30)].map((_, i) => renderSlotCell('Học việc', i + 1))}
      </div>

      {/* MAP SECTION */}
      <div className="map-section">
        <h3 style={{ color: 'gold', margin: '0 0 5px 0', fontSize: '18px' }}>CHỈ ĐẠO CHIẾN THUẬT</h3>
        <p style={{ fontSize: '12px', color: '#aaa' }}>Kéo các nút T1-T10 vào vị trí tương ứng trên bản đồ</p>
        
        <div className="map-container" ref={mapRef}>
          <img 
            src="https://i.postimg.cc/SsMMSZLG/unnam2ed.jpg" 
            alt="Tactical Map" 
            className="map-bg"
          />
          {[...Array(10)].map((_, i) => {
            const teamId = i + 1;
            // Nếu chưa có tọa độ trong DB, tạo khoảng cách 8% giữa mỗi nút
            const pos = teamPositions[teamId] || { x: 8 * teamId, y: 15 };
            const groupColor = groupSettings[teamGroups[teamId] || 'Nhóm 1'].border;
            
            return (
              <div 
                key={teamId}
                draggable={isAdmin}
                onDragEnd={(e) => handleDragEnd(e, teamId)}
                className="team-node"
                style={{ 
                  left: `${pos.x}%`, 
                  top: `${pos.y}%`, 
                  backgroundColor: groupColor === '#444' ? '#fff' : groupColor,
                  opacity: isAdmin ? 1 : 0.9,
                  cursor: isAdmin ? 'move' : 'default'
                }}
              >
                T{teamId}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '15px', fontSize: '11px', color: '#666', textAlign: 'left', fontStyle: 'italic' }}>
            * Lưu ý: Chỉ Admin mới có quyền kéo thả các nút vị trí.
        </div>
      </div>

      {/* POPUP ACTION */}
      {selectedMember && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', padding: '15px', borderRadius: '10px', border: '2px solid gold', zIndex: 1000, width: '90%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'gold' }}>{selectedMember.char_name}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(isAdmin || selectedMember.char_name === localStorage.getItem('my_char_name')) && (
              <>
                <button onClick={toggleItem} style={{ flex: 1, background: selectedMember.has_item ? '#444' : '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '4px' }}>
                    {selectedMember.has_item ? "BỎ VẬT TƯ" : "VẬT TƯ 📦"}
                </button>
                <button onClick={deleteMember} style={{ flex: 1, background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '4px' }}>XÓA</button>
              </>
            )}
            <button onClick={() => setSelectedMember(null)} style={{ background: '#333', color: 'white', border: 'none', padding: '10px', borderRadius: '4px' }}>ĐÓNG</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
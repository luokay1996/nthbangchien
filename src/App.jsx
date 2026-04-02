import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CẤU HÌNH KẾT NỐI ---
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// --- DỮ LIỆU CỐ ĐỊNH ---
const SKILL_ICONS = [
  "https://i.postimg.cc/DfDDfmVs/Screenshot-2026-04-02-232308.png",
  "https://i.postimg.cc/nV55VM8m/Screenshot-2026-04-02-232315.png",
  "https://i.postimg.cc/J7gg7twZ/Screenshot-2026-04-02-232326.png",
  "https://i.postimg.cc/PfccfNG8/truongcahienquan.png",
  "https://i.postimg.cc/y6556Wqj/tuongbang.png",
  "https://i.postimg.cc/44MM4nCB/tuonggio.png"
];

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
  const [memberSkills, setMemberSkills] = useState([]); 
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });
  const [teamGroups, setTeamGroups] = useState({});
  const [teamPositions, setTeamPositions] = useState({});
  const mapRef = useRef(null);

  // ==========================================
  // PHẦN 1: GIAO DIỆN NGƯỜI DÙNG (RENDER UI)
  // ==========================================

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
          padding: '0 4px', overflow: 'hidden', opacity: isBeingMoved ? 0.5 : 1, transition: 'all 0.1s ease'
        }}
      >
        {isLeaderSlot && <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '8px', opacity: 0.8 }}>🔑</span>}
        {occupant ? (
          <div style={{ width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
            {occupant.char_name} {occupant.has_item && '📦'}
          </div>
        ) : `S${slotNum}`}
      </div>
    );
  };

  const officialCount = members.filter(m => m.char_name && m.type === 'Chính thức').length;

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
        .team-node { position: absolute; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #000; cursor: move; transform: translate(-50%, -50%); border: 2px solid #fff; box-shadow: 0 0 15px rgba(0,0,0,0.8); z-index: 10; transition: transform 0.1s; touch-action: none; }
        .team-node:active { transform: translate(-50%, -50%) scale(1.2); z-index: 100; }
        
        .skill-box-equipped { width: 50px; height: 50px; background: #222; border: 1px solid #444; border-radius: 6px; position: relative; display: flex; align-items: center; justify-content: center; }
        .skill-img { width: 100%; height: 100%; border-radius: 5px; object-fit: cover; }
        .btn-del-skill { position: absolute; top: -8px; right: -8px; background: red; color: white; width: 18px; height: 18px; border-radius: 50%; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid white; z-index: 5; }
        .skill-lib-item { width: 45px; height: 45px; cursor: pointer; border-radius: 6px; border: 1px solid #333; transition: transform 0.1s; }
        .skill-lib-item:hover { transform: scale(1.1); border-color: gold; }
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

      <h1 style={{ color: 'gold', fontSize: '20px', margin: '10px 0' }}>BANG QUỶ MÔN QUAN</h1>

      {/* THỐNG KÊ CLASS */}
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
      
      {/* FORM ĐĂNG KÝ */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '25px' }}>
        <input style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px', width: '160px' }} placeholder="Tên..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
        <select style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', margin: '0 5px', borderRadius: '4px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" style={{ padding: '10px 15px', background: 'gold', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
            ĐĂNG KÝ {form.team_slot ? `(S${form.team_slot})` : ''}
        </button>
      </form>

      {/* TEAM CHÍNH THỨC */}
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

      {/* CHI ĐẠO CHIẾN THUẬT */}
      <div className="map-section">
        <h3 style={{ color: 'gold', margin: '0 0 5px 0', fontSize: '18px' }}>CHỈ ĐẠO CHIẾN THUẬT</h3>
        <div className="map-container" ref={mapRef}>
          <img src="https://i.postimg.cc/SsMMSZLG/unnam2ed.jpg" alt="Map" className="map-bg" />
          {[...Array(10)].map((_, i) => {
            const teamId = i + 1;
            const pos = teamPositions[teamId] || { x: 8 * teamId, y: 15 };
            const groupColor = groupSettings[teamGroups[teamId] || 'Nhóm 1'].border;
            return (
              <div key={teamId} draggable={isAdmin} onDragEnd={(e) => handleDragEnd(e, teamId)} className="team-node"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, backgroundColor: groupColor === '#444' ? '#fff' : groupColor, cursor: isAdmin ? 'move' : 'default' }}>
                T{teamId}
              </div>
            );
          })}
        </div>
      </div>

      {/* POP-UP CHI TIẾT & KỸ NĂNG */}
      {selectedMember && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#111', padding: '20px', borderRadius: '15px', border: '2px solid gold', zIndex: 1000, width: '95%', maxWidth: '450px', boxShadow: '0 0 40px #000' }}>
          <div style={{ marginBottom: '15px' }}>
             <div style={{ fontWeight: 'bold', color: classInfo[selectedMember.class_name]?.color, fontSize: '20px' }}>{selectedMember.char_name}</div>
             <div style={{ fontSize: '11px', color: '#666' }}>{selectedMember.class_name} | {selectedMember.type}</div>
          </div>

          {/* Kho kỹ năng (Mọi người đều có thể thêm) */}
          <div style={{ marginBottom: '20px', padding: '10px', background: '#1a1a1a', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'gold', marginBottom: '8px', fontWeight: 'bold' }}>KHO KỸ NĂNG (Bấm để thêm)</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {SKILL_ICONS.map((url, idx) => (
                <img key={idx} src={url} onClick={() => addSkillToMember(url)} className="skill-lib-item" alt="skill" />
              ))}
            </div>
          </div>

          {/* Hiển thị 5 ô kỹ năng đã trang bị */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
            {[0, 1, 2, 3, 4].map(slot => {
              const skill = memberSkills.find(s => s.member_id === selectedMember.id && parseInt(s.pos_x) === slot);
              return (
                <div key={slot} className="skill-box-equipped">
                  {skill ? (
                    <>
                      <img src={skill.skill_url} className="skill-img" alt="equipped" />
                      <div className="btn-del-skill" onClick={() => removeSkill(skill.id)}>×</div>
                    </>
                  ) : <div style={{ color: '#333', fontSize: '14px' }}>+</div>}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {(isAdmin || selectedMember.char_name === localStorage.getItem('my_char_name')) && (
              <>
                <button onClick={toggleItem} style={{ flex: 1, background: selectedMember.has_item ? '#444' : '#28a745', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold' }}>{selectedMember.has_item ? "BỎ VẬT TƯ" : "VẬT TƯ 📦"}</button>
                <button onClick={deleteMember} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold' }}>XÓA</button>
              </>
            )}
            <button onClick={() => setSelectedMember(null)} style={{ background: '#333', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', minWidth: '80px' }}>ĐÓNG</button>
          </div>
        </div>
      )}
    </div>
  );

  // ==========================================
  // PHẦN 2: LOGIC XỬ LÝ (FUNCTIONS)
  // ==========================================

  async function fetchData() {
    const { data: mems } = await supabase.from('register_list').select('*');
    const { data: groups } = await supabase.from('team_groups').select('*');
    const { data: positions } = await supabase.from('team_positions').select('*');
    const { data: skills } = await supabase.from('member_skills').select('*');

    if (mems) setMembers(mems);
    if (skills) setMemberSkills(skills);
    if (groups) {
      const groupMap = Object.fromEntries(groups.map(g => [g.team_id, g.group_name]));
      setTeamGroups(groupMap);
    }
    if (positions) {
      const posMap = Object.fromEntries(positions.map(p => [p.team_id, { x: p.pos_x, y: p.pos_y }]));
      setTeamPositions(posMap);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('global-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_groups' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_positions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_skills' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // --- LOGIC KỸ NĂNG ---
  async function addSkillToMember(url) {
    if (!selectedMember) return;
    const current = memberSkills.filter(s => s.member_id === selectedMember.id);
    if (current.length >= 5) return alert("Tối đa 5 kỹ năng!");
    
    let slot = 0;
    for (let i = 0; i < 5; i++) {
      if (!current.find(s => parseInt(s.pos_x) === i)) {
        slot = i;
        break;
      }
    }
    
    await supabase.from('member_skills').insert([{ 
      member_id: selectedMember.id, 
      skill_url: url, 
      pos_x: slot, 
      pos_y: 0 
    }]);
    fetchData();
  };

  async function removeSkill(skillId) {
    await supabase.from('member_skills').delete().eq('id', skillId);
    fetchData();
  };

  // --- LOGIC CƠ BẢN ---
  async function updateTeamPosition(teamId, x, y) {
    setTeamPositions(prev => ({ ...prev, [teamId]: { x, y } }));
    await supabase.from('team_positions').update({ pos_x: x, pos_y: y }).eq('team_id', teamId);
  };

  function handleDragEnd(e, teamId) {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    updateTeamPosition(teamId, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  };

  async function handleGroupChange(teamId, newGroupName) {
    if (!isAdmin) return;
    setTeamGroups(prev => ({ ...prev, [teamId]: newGroupName }));
    await supabase.from('team_groups').update({ group_name: newGroupName }).eq('team_id', teamId);
  };

  function handleAdminLogin() {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "quymonquan2026") { setIsAdmin(true); alert("ĐÃ KÍCH HOẠT!"); }
    else alert("Sai mật mã!");
  };

  async function handleResetBoard() {
    if (window.confirm("Xóa sạch danh sách?")) {
      await supabase.from('register_list').delete().neq('id', 0);
      await supabase.from('member_skills').delete().neq('id', 0);
      fetchData();
    }
  };

  async function toggleItem() {
    if (!selectedMember) return;
    await supabase.from('register_list').update({ has_item: !selectedMember.has_item }).eq('id', selectedMember.id);
    fetchData();
    setSelectedMember(null);
  };

  async function handleSlotClick(type, slotNum) {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    if (isAdmin && movingMember) {
      if (movingMember.id === occupant?.id) { setMovingMember(null); return; }
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.team_slot) return alert("Chọn ô Slot!");
    const savedName = localStorage.getItem('my_char_name');
    if (!isAdmin && isLimitEnabled && savedName && members.some(m => m.char_name === savedName)) {
      return alert("Bạn đã đăng ký rồi!");
    }
    const { error } = await supabase.from('register_list').insert([form]);
    if (!error) {
      localStorage.setItem('my_char_name', form.char_name);
      setForm({ ...form, char_name: '', team_slot: null });
      fetchData();
    }
  };

  async function deleteMember() {
    if (!selectedMember) return;
    if (window.confirm(`Xóa [${selectedMember.char_name}]?`)) {
      await supabase.from('register_list').delete().eq('id', selectedMember.id);
      if (selectedMember.char_name === localStorage.getItem('my_char_name')) localStorage.removeItem('my_char_name');
      setSelectedMember(null);
      fetchData();
    }
  };
}

export default App;
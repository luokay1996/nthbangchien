import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Danh sách các Icon cố định
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
  const [draggedSkillUrl, setDraggedSkillUrl] = useState(null); // State theo dõi icon đang kéo
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });
  const [teamGroups, setTeamGroups] = useState({});
  const [teamPositions, setTeamPositions] = useState({});
  const mapRef = useRef(null);

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('global-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  // --- LOGIC KỸ NĂNG (MỚI) ---
  const onDragSkillStart = (url) => {
    setDraggedSkillUrl(url);
  };

  const onDropToSlot = async (slotId) => {
    if (!selectedMember || !draggedSkillUrl) return;
    
    // Sử dụng upsert để ghi đè nếu slot đó đã có kỹ năng
    await supabase.from('member_skills').upsert({ 
      member_id: selectedMember.id, 
      skill_url: draggedSkillUrl, 
      slot_id: slotId 
    }, { onConflict: 'member_id, slot_id' });
    
    setDraggedSkillUrl(null);
    fetchData();
  };

  const deleteSkillInSlot = async (slotId) => {
    await supabase.from('member_skills')
      .delete()
      .eq('member_id', selectedMember.id)
      .eq('slot_id', slotId);
    fetchData();
  };

  // --- LOGIC TEAM & ADMIN ---
  const updateTeamPosition = async (teamId, x, y) => {
    setTeamPositions(prev => ({ ...prev, [teamId]: { x, y } }));
    await supabase.from('team_positions').upsert({ team_id: teamId, pos_x: x, pos_y: y }, { onConflict: 'team_id' });
  };

  const handleDragEnd = (e, teamId) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    updateTeamPosition(teamId, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  };

  const handleGroupChange = async (teamId, newGroupName) => {
    if (!isAdmin) return;
    setTeamGroups(prev => ({ ...prev, [teamId]: newGroupName }));
    await supabase.from('team_groups').upsert({ team_id: teamId, group_name: newGroupName }, { onConflict: 'team_id' });
  };

  const handleAdminLogin = () => {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "quymonquan2026") { setIsAdmin(true); alert("ADMIN: ON"); }
  };

  const handleResetBoard = async () => {
    if (window.confirm("Xóa sạch danh sách tuần này?")) {
      await supabase.from('register_list').delete().neq('id', 0);
      await supabase.from('member_skills').delete().neq('id', 0);
      fetchData();
    }
  };

  const toggleItem = async () => {
    if (!selectedMember) return;
    const { error } = await supabase.from('register_list').update({ has_item: !selectedMember.has_item }).eq('id', selectedMember.id);
    if (!error) { fetchData(); setSelectedMember(null); }
  };

  const handleSlotClick = async (type, slotNum) => {
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
      setMovingMember(null); return;
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

  const deleteMember = async () => {
    if (!selectedMember) return;
    if (window.confirm(`Xóa [${selectedMember.char_name}]?`)) {
      await supabase.from('register_list').delete().eq('id', selectedMember.id);
      setSelectedMember(null);
      fetchData();
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
          opacity: isBeingMoved ? 0.5 : 1
        }}
      >
        {isLeaderSlot && <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '8px' }}>🔑</span>}
        {occupant ? occupant.char_name : `S${slotNum}`}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '15px', textAlign: 'center', fontFamily: 'Arial', userSelect: 'none' }}>
      <style>{`
        .team-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 1200px; margin: 0 auto; }
        @media (min-width: 1024px) { .team-grid { grid-template-columns: repeat(10, 1fr); } }
        .map-container { position: relative; width: 100%; border-radius: 8px; overflow: hidden; border: 2px solid #444; margin-top: 15px; }
        .team-node { position: absolute; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #000; cursor: move; transform: translate(-50%, -50%); border: 2px solid #fff; z-index: 10; }
        
        .skill-inventory { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; background: #222; padding: 10px; border-radius: 8px; }
        .skill-item-static { width: 40px; height: 40px; cursor: grab; border: 1px solid #444; border-radius: 4px; }
        .skill-slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
        .slot-box { aspect-ratio: 1; background: #080808; border: 2px dashed #333; border-radius: 8px; display: flex; align-items: center; justify-content: center; position: relative; }
        .slot-box.has-skill { border: 2px solid gold; background: #000; }
        .btn-delete-skill { position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 18px; height: 18px; fontSize: 10px; cursor: pointer; z-index: 2; }
      `}</style>

      {/* HEADER & ADMIN */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button onClick={handleAdminLogin} style={{ background: isAdmin ? '#d4af37' : 'transparent', color: isAdmin ? '#000' : '#d4af37', border: '1px solid #d4af37', padding: '5px', borderRadius: '4px', fontSize: '10px' }}>ADMIN</button>
        {isAdmin && <button onClick={handleResetBoard} style={{ background: 'blue', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', fontSize: '10px' }}>RESET</button>}
      </div>

      <h1 style={{ color: 'gold', fontSize: '20px' }}>BANG QUỶ MÔN QUAN</h1>

      {/* FORM */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', width: '150px' }} placeholder="Tên..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
        <select style={{ padding: '10px', background: '#111', color: 'white', border: '1px solid #333', margin: '0 5px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" style={{ padding: '10px 15px', background: 'gold', border: 'none', fontWeight: 'bold' }}>ĐĂNG KÝ</button>
      </form>

      {/* GRID TEAM */}
      <div className="team-grid">
        {[...Array(10)].map((_, col) => (
          <div key={col} style={{ background: groupSettings[teamGroups[col+1]||'Nhóm 1'].bg, padding: '8px', borderRadius: '8px', border: `2px solid ${groupSettings[teamGroups[col+1]||'Nhóm 1'].border}` }}>
            <div style={{ color: groupSettings[teamGroups[col+1]||'Nhóm 1'].label, fontSize: '11px', fontWeight: 'bold' }}>TEAM {col + 1}</div>
            <select className="group-select" value={teamGroups[col+1] || 'Nhóm 1'} disabled={!isAdmin} onChange={(e) => handleGroupChange(col+1, e.target.value)} style={{ width: '100%', background: '#000', color: '#fff', fontSize: '9px', margin: '4px 0' }}>
              {Object.keys(groupSettings).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {[...Array(6)].map((_, row) => renderSlotCell('Chính thức', col * 6 + row + 1))}
          </div>
        ))}
      </div>

      {/* MAP */}
      <div className="map-container" ref={mapRef} style={{ maxWidth: '800px', margin: '20px auto' }}>
        <img src="https://i.postimg.cc/SsMMSZLG/unnam2ed.jpg" alt="Map" style={{ width: '100%', opacity: 0.8 }} />
        {[...Array(10)].map((_, i) => (
          <div key={i+1} draggable={isAdmin} onDragEnd={(e) => handleDragEnd(e, i+1)} className="team-node" style={{ left: `${teamPositions[i+1]?.x || 0}%`, top: `${teamPositions[i+1]?.y || 0}%`, backgroundColor: groupSettings[teamGroups[i+1]||'Nhóm 1'].border }}>T{i+1}</div>
        ))}
      </div>

      {/* POPUP ACTION (SLOT SKILLS) */}
      {selectedMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid gold', width: '90%', maxWidth: '400px' }}>
            <div style={{ fontWeight: 'bold', color: 'gold', fontSize: '18px', marginBottom: '10px' }}>{selectedMember.char_name}</div>
            
            <p style={{ fontSize: '11px', color: '#888' }}>Kho kỹ năng (Kéo thả vào ô dưới)</p>
            <div className="skill-inventory">
              {SKILL_ICONS.map((url, idx) => (
                <img key={idx} src={url} className="skill-item-static" draggable onDragStart={() => onDragSkillStart(url)} />
              ))}
            </div>

            <div className="skill-slots-grid">
              {[...Array(8)].map((_, i) => {
                const slotId = i + 1;
                const skill = memberSkills.find(s => s.member_id === selectedMember.id && s.slot_id === slotId);
                return (
                  <div key={slotId} className={`slot-box ${skill ? 'has-skill' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropToSlot(slotId)}>
                    {skill ? (
                      <>
                        <img src={skill.skill_url} style={{ width: '100%', borderRadius: '6px' }} />
                        <button className="btn-delete-skill" onClick={() => deleteSkillInSlot(slotId)}>×</button>
                      </>
                    ) : (
                      <span style={{ fontSize: '9px', color: '#333' }}>Ô {slotId}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {(isAdmin || selectedMember.char_name === localStorage.getItem('my_char_name')) && (
                <>
                  <button onClick={toggleItem} style={{ flex: 1, background: selectedMember.has_item ? '#444' : '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '6px' }}>VẬT TƯ 📦</button>
                  <button onClick={deleteMember} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '6px' }}>XÓA</button>
                </>
              )}
              <button onClick={() => setSelectedMember(null)} style={{ background: '#333', color: 'white', border: 'none', padding: '10px', borderRadius: '6px' }}>ĐÓNG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
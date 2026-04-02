import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// 1. CẤU HÌNH DỮ LIỆU CỐ ĐỊNH
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
  // --- STATE QUẢN LÝ ---
  const [members, setMembers] = useState([]);
  const [memberSkills, setMemberSkills] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLimitEnabled, setIsLimitEnabled] = useState(true);
  const [movingMember, setMovingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });
  const [teamGroups, setTeamGroups] = useState({});
  const [teamPositions, setTeamPositions] = useState({});
  const mapRef = useRef(null);

  // ==========================================
  // 2. GIAO DIỆN (UI) - HIỂN THỊ LÊN TRƯỚC
  // ==========================================
  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '15px', textAlign: 'center', fontFamily: 'Arial', userSelect: 'none' }}>
      <style>{`
        .team-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 1200px; margin: 0 auto; }
        @media (min-width: 1024px) { .team-grid { grid-template-columns: repeat(10, 1fr); } }
        .group-select { width: 100%; background: #000; color: #fff; border: 1px solid #444; font-size: 10px; border-radius: 3px; cursor: pointer; margin-top: 5px; padding: 3px; font-weight: bold; appearance: none; text-align: center; }
        .map-section { max-width: 900px; margin: 40px auto; padding: 20px; background: #0a0a0a; border-radius: 12px; border: 1px solid #333; position: relative; }
        .map-container { position: relative; width: 100%; border-radius: 8px; overflow: hidden; border: 2px solid #444; margin-top: 15px; }
        .map-bg { width: 100%; display: block; opacity: 0.8; pointer-events: none; }
        .team-node { position: absolute; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #000; cursor: move; transform: translate(-50%, -50%); border: 2px solid #fff; box-shadow: 0 0 15px rgba(0,0,0,0.8); z-index: 10; transition: transform 0.1s; touch-action: none; }
        .skill-box-equipped { width: 52px; height: 52px; background: #1a1a1a; border: 1px dashed #444; border-radius: 8px; position: relative; display: flex; align-items: center; justify-content: center; }
        .skill-img { width: 100%; height: 100%; border-radius: 7px; object-fit: cover; }
        .btn-del-skill { position: absolute; top: -10px; right: -10px; background: #ff4d4d; color: white; width: 20px; height: 20px; border-radius: 50%; font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid white; z-index: 10; font-weight: bold; }
        .skill-lib-item { width: 50px; height: 50px; cursor: pointer; border-radius: 8px; border: 2px solid #333; transition: all 0.2s; }
        .skill-lib-item:hover { transform: scale(1.15); border-color: #00ffff; box-shadow: 0 0 10px #00ffff55; }
        .skill-lib-item:active { transform: scale(0.9); }
      `}</style>

      {/* ADMIN CONTROLS */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', zIndex: 100 }}>
        <button onClick={() => {
          const pass = prompt("Nhập mật mã Admin:");
          if (pass === "quymonquan2026") { setIsAdmin(true); alert("ĐÃ KÍCH HOẠT!"); }
          else alert("Sai mật mã!");
        }} style={{ background: isAdmin ? '#d4af37' : 'transparent', color: isAdmin ? '#000' : '#d4af37', border: '1px solid #d4af37', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          {isAdmin ? "ADMIN: ON" : "ADMIN LOGIN"}
        </button>
        {isAdmin && <button onClick={async () => {
          if (window.confirm("Xóa sạch danh sách?")) {
            await supabase.from('register_list').delete().neq('id', 0);
            await supabase.from('member_skills').delete().neq('id', 0);
            window.location.reload();
          }
        }} style={{ background: 'blue', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '10px' }}>RESET ALL</button>}
      </div>

      <h1 style={{ color: 'gold', fontSize: '22px', margin: '15px 0' }}>BANG QUỶ MÔN QUAN</h1>

      {/* STATS AREA */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', background: '#0a0a0a', padding: '12px', borderRadius: '10px', border: '1px solid #222', marginBottom: '20px', flexWrap: 'wrap' }}>
        {Object.keys(classInfo).map(cls => (
          <div key={cls} style={{ borderRight: '1px solid #222', paddingRight: '8px', minWidth: '65px' }}>
            <div style={{ color: classInfo[cls].color, fontSize: '10px', fontWeight: 'bold' }}>{cls}</div>
            <div style={{ fontSize: '15px' }}>{members.filter(m => m.class_name === cls).length}</div>
          </div>
        ))}
      </div>
      
      {/* REGISTER FORM */}
      <form onSubmit={async (e) => {
          e.preventDefault();
          if (!form.team_slot) return alert("Vui lòng chọn ô Slot trên bảng trước!");
          const { error } = await supabase.from('register_list').insert([form]);
          if (!error) {
            localStorage.setItem('my_char_name', form.char_name);
            setForm({ ...form, char_name: '', team_slot: null });
            const { data } = await supabase.from('register_list').select('*');
            setMembers(data);
          }
        }} style={{ marginBottom: '30px' }}>
        <input style={{ padding: '12px', background: '#111', color: 'white', border: '1px solid #444', borderRadius: '5px', width: '180px' }} placeholder="Tên nhân vật..." value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required />
        <select style={{ padding: '12px', background: '#111', color: 'white', border: '1px solid #444', margin: '0 8px', borderRadius: '5px' }} value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})}>
          {Object.keys(classInfo).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" style={{ padding: '12px 20px', background: 'gold', border: 'none', borderRadius: '5px', fontWeight: 'bold', color: '#000' }}>
          ĐĂNG KÝ {form.team_slot ? `(Slot ${form.team_slot})` : ''}
        </button>
      </form>

      {/* TEAMS GRID */}
      <div className="team-grid">
        {[...Array(10)].map((_, col) => {
          const teamNum = col + 1;
          const currentGroup = teamGroups[teamNum] || 'Nhóm 1';
          const settings = groupSettings[currentGroup];
          return (
            <div key={col} style={{ background: settings.bg, padding: '10px', borderRadius: '8px', border: `2px solid ${settings.border}` }}>
              <div style={{ color: settings.label, fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>TEAM {teamNum}</div>
              <select className="group-select" style={{ borderColor: settings.border }} value={currentGroup} disabled={!isAdmin} onChange={async (e) => {
                  const newG = e.target.value;
                  setTeamGroups(p => ({ ...p, [teamNum]: newG }));
                  await supabase.from('team_groups').update({ group_name: newG }).eq('team_id', teamNum);
                }}>
                {Object.keys(groupSettings).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {[...Array(6)].map((_, row) => {
                  const slotNum = col * 6 + row + 1;
                  const occupant = members.find(m => m.type === 'Chính thức' && m.team_slot === slotNum);
                  const isSelected = form.type === 'Chính thức' && form.team_slot === slotNum;
                  const isBeingMoved = movingMember && movingMember.id === occupant?.id;
                  const isLeaderSlot = (slotNum - 1) % 6 === 0;

                  return (
                    <div key={slotNum} onClick={() => {
                        if (occupant) {
                          setSelectedMember(occupant);
                          if (isAdmin) setMovingMember(occupant);
                        } else {
                          setForm({ ...form, type: 'Chính thức', team_slot: slotNum });
                          setSelectedMember(null);
                        }
                      }}
                      style={{
                        height: '42px', margin: '4px 0', borderRadius: '4px', position: 'relative',
                        backgroundColor: occupant ? classInfo[occupant.class_name]?.color : '#111',
                        border: isBeingMoved ? '2px solid white' : isSelected ? '2px solid gold' : '1px solid #333',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        fontSize: '10px', color: occupant?.class_name === 'Long Ngâm' ? '#000' : 'white', fontWeight: 'bold', opacity: isBeingMoved ? 0.5 : 1
                      }}
                    >
                      {isLeaderSlot && <span style={{ position: 'absolute', top: '1px', left: '2px', fontSize: '8px' }}>🔑</span>}
                      {occupant ? occupant.char_name : `S${slotNum}`}
                    </div>
                  );
              })}
            </div>
          );
        })}
      </div>

      {/* MAP SECTION */}
      <div className="map-section">
        <div className="map-container" ref={mapRef}>
          <img src="https://i.postimg.cc/SsMMSZLG/unnam2ed.jpg" alt="Map" className="map-bg" />
          {[...Array(10)].map((_, i) => {
            const teamId = i + 1;
            const pos = teamPositions[teamId] || { x: 8 * teamId, y: 15 };
            return (
              <div key={teamId} draggable={isAdmin} onDragEnd={(e) => {
                  if (!mapRef.current) return;
                  const rect = mapRef.current.getBoundingClientRect();
                  const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                  const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                  setTeamPositions(p => ({ ...p, [teamId]: { x, y } }));
                  supabase.from('team_positions').update({ pos_x: x, pos_y: y }).eq('team_id', teamId).then();
                }} className="team-node"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, backgroundColor: groupSettings[teamGroups[teamId] || 'Nhóm 1'].border }}>
                T{teamId}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          POP-UP KỸ NĂNG (DÀNH CHO TẤT CẢ MỌI NGƯỜI)
          ========================================== */}
      {selectedMember && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#0a0a0a', padding: '25px', borderRadius: '20px', border: '2px solid gold', zIndex: 1000, width: '95%', maxWidth: '480px', boxShadow: '0 0 50px #000' }}>
          
          <div style={{ marginBottom: '20px' }}>
             <div style={{ fontWeight: 'bold', color: classInfo[selectedMember.class_name]?.color, fontSize: '22px' }}>{selectedMember.char_name}</div>
             <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Hệ phái: {selectedMember.class_name}</div>
          </div>

          {/* KHO KỸ NĂNG - AI CŨNG CÓ QUYỀN BẤM */}
          <div style={{ marginBottom: '25px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid #333' }}>
            <div style={{ fontSize: '11px', color: 'gold', marginBottom: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>KHO KỸ NĂNG CƠ BẢN (CLICK ĐỂ THÊM)</div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {SKILL_ICONS.map((url, idx) => (
                <img 
                  key={idx} 
                  src={url} 
                  onClick={() => addSkillToMember(url)} 
                  className="skill-lib-item" 
                  title="Thêm kỹ năng này"
                  alt="skill-option" 
                />
              ))}
            </div>
          </div>

          {/* 5 Ô KỸ NĂNG ĐÃ TRANG BỊ */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '30px' }}>
            {[0, 1, 2, 3, 4].map(slot => {
              const skill = memberSkills.find(s => s.member_id === selectedMember.id && parseInt(s.pos_x) === slot);
              return (
                <div key={slot} className="skill-box-equipped">
                  {skill ? (
                    <>
                      <img src={skill.skill_url} className="skill-img" alt="equipped" />
                      {/* Nút X gỡ kỹ năng - Cho phép tất cả mọi người */}
                      <div className="btn-del-skill" onClick={() => removeSkill(skill.id)}>×</div>
                    </>
                  ) : <div style={{ color: '#333', fontSize: '18px' }}>+</div>}
                </div>
              );
            })}
          </div>

          {/* CÁC NÚT ĐIỀU KHIỂN DƯỚI CÙNG */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => {
                supabase.from('register_list').update({ has_item: !selectedMember.has_item }).eq('id', selectedMember.id).then(() => {
                  setSelectedMember(null);
                  fetchData();
                });
              }} style={{ flex: 1, background: selectedMember.has_item ? '#444' : '#28a745', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>
              {selectedMember.has_item ? "BỎ VẬT TƯ" : "MANG VẬT TƯ 📦"}
            </button>
            
            {/* Nút Xóa nhân vật */}
            <button onClick={async () => {
                if (window.confirm("Xóa nhân vật này khỏi danh sách?")) {
                  await supabase.from('register_list').delete().eq('id', selectedMember.id);
                  setSelectedMember(null);
                  fetchData();
                }
              }} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>XÓA</button>
            
            <button onClick={() => setSelectedMember(null)} style={{ background: '#333', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', minWidth: '90px' }}>ĐÓNG</button>
          </div>
        </div>
      )}
    </div>
  );

  // ==========================================
  // 3. LOGIC XỬ LÝ (FUNCTIONS) - ĐỂ RA SAU
  // ==========================================

  // Lấy dữ liệu từ database
  async function fetchData() {
    const { data: mems } = await supabase.from('register_list').select('*');
    const { data: groups } = await supabase.from('team_groups').select('*');
    const { data: positions } = await supabase.from('team_positions').select('*');
    const { data: skills } = await supabase.from('member_skills').select('*');

    if (mems) setMembers(mems);
    if (skills) setMemberSkills(skills);
    if (groups) setTeamGroups(Object.fromEntries(groups.map(g => [g.team_id, g.group_name])));
    if (positions) setTeamPositions(Object.fromEntries(positions.map(p => [p.team_id, { x: p.pos_x, y: p.pos_y }])));
  }

  // Khởi tạo Realtime
  useEffect(() => {
    fetchData();
    const channel = supabase.channel('global-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_skills' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_groups' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_positions' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Hàm thêm kỹ năng
  async function addSkillToMember(url) {
    if (!selectedMember) return;
    
    // Lấy danh sách kỹ năng hiện tại của nhân vật này
    const current = memberSkills.filter(s => s.member_id === selectedMember.id);
    if (current.length >= 5) {
      alert("Nhân vật này đã trang bị đủ 5 kỹ năng!");
      return;
    }
    
    // Tìm ô (pos_x) còn trống từ 0 đến 4
    let slot = -1;
    for (let i = 0; i < 5; i++) {
      if (!current.some(s => parseInt(s.pos_x) === i)) {
        slot = i;
        break;
      }
    }

    if (slot !== -1) {
      const { error } = await supabase.from('member_skills').insert([{ 
        member_id: selectedMember.id, 
        skill_url: url, 
        pos_x: slot, 
        pos_y: 0 
      }]);
      if (error) console.error(error);
      fetchData(); // Cập nhật lại UI ngay lập tức
    }
  }

  // Hàm gỡ kỹ năng
  async function removeSkill(skillId) {
    const { error } = await supabase.from('member_skills').delete().eq('id', skillId);
    if (error) console.error(error);
    fetchData();
  }
}

export default App;
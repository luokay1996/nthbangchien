import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const classInfo = {
  'Toái Mộng': { color: '#80C7E6' },
  'Thiết Y': { color: '#E6A35C' },
  'Huyết Hà': { color: '#A3534A' },
  'Thần Tương': { color: '#5E7FAF' }, 
  'Tố Vấn': { color: '#F28E99' },
  'Cửu Linh': { color: '#B36BB3' },
  'Long Ngâm': { color: '#8CB36B' },
};

const groupSettings = {
  'Đoàn 1': { bg: 'rgba(255, 255, 255, 0.05)', border: '#7cd826', label: '#7cd826' },
  'Đoàn 2': { bg: 'rgba(0, 255, 255, 0.12)', border: '#d400ff', label: '#d400ff' },
  'Đoàn 3': { bg: 'rgba(255, 215, 0, 0.12)', border: '#5e75b4', label: '#5e75b4' },
  'Đoàn 4': { bg: 'rgba(255, 69, 0, 0.15)', border: '#ff4500', label: '#ff4500' },
};

function App() {
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [movingMember, setMovingMember] = useState(null);

  const [selectedMember, setSelectedMember] = useState(null);
  const [form, setForm] = useState({ char_name: '', class_name: 'Toái Mộng', team_slot: null, type: 'Chính thức' });
  const [teamGroups, setTeamGroups] = useState({});
  const [teamPositions, setTeamPositions] = useState([]); 
  
  const [skillLibrary, setSkillLibrary] = useState([]);
  const [customSkillUrl, setCustomSkillUrl] = useState('');
  const [memberSkills, setMemberSkills] = useState([]);

  // Các trạng thái hỗ trợ chọn thành viên từ danh sách thay cho prompt
  const [assigningSlot, setAssigningSlot] = useState(null); // { type, slotNum }
  const [newCharName, setNewCharName] = useState('');
  const [newClassName, setNewClassName] = useState('Toái Mộng');
  const [searchUnassigned, setSearchUnassigned] = useState('');
  
  // Trạng thái gán phái trung gian khi Admin chọn 1 người chưa có phái từ list chờ
  const [pendingAssignMember, setPendingAssignMember] = useState(null); 
  const [selectedClassForAssign, setSelectedClassForAssign] = useState('Toái Mộng');

  // Trạng thái cho khu vực nhập danh sách thô bằng text hàng loạt
  const [bulkText, setBulkText] = useState('');

  const mapRef = useRef(null);

  const fetchData = useCallback(async () => {
    const { data: mems } = await supabase.from('register_list').select('*');
    const { data: groups } = await supabase.from('team_groups').select('*');
    const { data: positions } = await supabase.from('team_positions').select('*');
    const { data: skills } = await supabase.from('member_skills').select('*');
    const { data: lib } = await supabase.from('skill_library').select('*'); 

    if (mems) setMembers(mems);
    if (skills) setMemberSkills(skills); 
    if (lib) setSkillLibrary(lib);
    if (groups) {
      const groupMap = Object.fromEntries(groups.map(g => {
        let name = g.group_name || 'Đoàn 1';
        if (name.startsWith('Nhóm')) {
          name = name.replace('Nhóm', 'Đoàn');
        }
        return [g.team_id, name];
      }));
      setTeamGroups(groupMap);
    }
    if (positions) {
      setTeamPositions(positions);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('global-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_groups' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_positions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_skills' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skill_library' }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchData]);

  const updateTeamPosition = async (id, x, y) => {
    setTeamPositions(prev => prev.map(p => p.id === id ? { ...p, pos_x: x, pos_y: y } : p));
    await supabase.from('team_positions').update({ pos_x: x, pos_y: y }).eq('id', id);
  };

  const handleDragEnd = (e, id) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const safeX = Math.max(0, Math.min(100, x));
    const safeY = Math.max(0, Math.min(100, y));
    updateTeamPosition(id, safeX, safeY);
  };

  const addNewMarker = async (type) => {
    if (!isAdmin) return;
    await supabase.from('team_positions').insert([{ marker_type: type, pos_x: 50, pos_y: 50 }]);
    fetchData();
  };

  const removeMarker = async (id) => {
    if (!isAdmin) return;
    await supabase.from('team_positions').delete().eq('id', id);
    fetchData();
  };

  const handleGroupChange = async (teamId, newGroupName) => {
    if (!isAdmin) return;
    setTeamGroups(prev => ({ ...prev, [teamId]: newGroupName }));
    const { error } = await supabase.from('team_groups').update({ group_name: newGroupName }).eq('team_id', teamId);
    if (error) fetchData();
  };

  const officialCount = members.filter(m => m.char_name && m.type === 'Chính thức' && m.team_slot).length;

  const handleAdminLogin = () => {
    const pass = prompt("Nhập mật mã Admin:");
    if (pass === "tp2026-dd") { 
      setIsAdmin(true); 
      alert("ĐÃ KÍCH HOẠT QUYỀN ADMIN! BẠN CÓ THỂ CHỈNH SỬA TOÀN BỘ WEB."); 
    } else { 
      alert("Sai mật mã!"); 
    }
  };

  const handleResetBoard = async () => {
    if (!isAdmin) return;
    if (window.confirm("Xóa sạch sơ đồ và vị trí tuần này? (Danh sách thành viên chờ vẫn sẽ được giữ lại và reset trạng thái hệ phái)")) {
      await supabase.from('member_skills').delete().neq('id', 0);
      await supabase.from('team_positions').delete().neq('id', 0);
      const { error } = await supabase.from('register_list').update({
        team_slot: null,
        class_name: '', 
        has_item: false,
        is_scout: false,
        is_tower_team: false
      }).neq('id', 0);
      if (!error) fetchData();
    }
  };

  const toggleItem = async () => {
    if (!isAdmin || !selectedMember) return;
    const { error } = await supabase.from('register_list').update({ has_item: !selectedMember.has_item }).eq('id', selectedMember.id);
    if (!error) {
      await fetchData();
      setSelectedMember(null);
    }
  };

  const toggleScout = async () => {
    if (!isAdmin || !selectedMember) return;
    const { error } = await supabase.from('register_list').update({ is_scout: !selectedMember.is_scout }).eq('id', selectedMember.id);
    if (!error) {
      await fetchData();
      setSelectedMember(null);
    }
  };

  const toggleTowerTeam = async () => {
    if (!isAdmin || !selectedMember) return;
    const { error } = await supabase.from('register_list').update({ is_tower_team: !selectedMember.is_tower_team }).eq('id', selectedMember.id);
    if (!error) {
      await fetchData();
      setSelectedMember(null);
    }
  };

  const handleSlotClick = async (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    
    if (!isAdmin) {
      if (occupant) {
        setSelectedMember(occupant); 
      }
      return; 
    }

    if (movingMember) {
      if (movingMember.type === type && movingMember.team_slot === slotNum) {
        setMovingMember(null);
        return;
      }
      if (occupant) {
        setMembers(prev => prev.map(m => {
          if (m.id === movingMember.id) return { ...m, type: occupant.type, team_slot: occupant.team_slot };
          if (m.id === occupant.id) return { ...m, type: movingMember.type, team_slot: movingMember.team_slot };
          return m;
        }));
        await Promise.all([
          supabase.from('register_list').update({ type: occupant.type, team_slot: occupant.team_slot }).eq('id', movingMember.id),
          supabase.from('register_list').update({ type: movingMember.type, team_slot: movingMember.team_slot }).eq('id', occupant.id)
        ]);
      } else {
        setMembers(prev => prev.map(m => 
          m.id === movingMember.id ? { ...m, type, team_slot: slotNum } : m
        ));
        await supabase.from('register_list').update({ type: slotNum ? type : movingMember.type, team_slot: slotNum }).eq('id', movingMember.id);
      }
      setMovingMember(null);
      return;
    }

    if (occupant) {
      setSelectedMember(occupant);
      setMovingMember(occupant);
      return;
    }

    setAssigningSlot({ type, slotNum });
    setPendingAssignMember(null);
    setNewCharName('');
    setNewClassName('Toái Mộng');
    setSearchUnassigned('');
    setBulkText('');
  };

  const startAssignMember = (member) => {
    if (!isAdmin) return;
    setPendingAssignMember(member);
    setSelectedClassForAssign('Toái Mộng'); 
  };

  const confirmAssignWithClass = async () => {
    if (!isAdmin || !assigningSlot || !pendingAssignMember) return;
    const { type, slotNum } = assigningSlot;
    
    const { error } = await supabase.from('register_list').update({ 
      type, 
      team_slot: slotNum,
      class_name: selectedClassForAssign 
    }).eq('id', pendingAssignMember.id);

    if (!error) {
      setPendingAssignMember(null);
      setAssigningSlot(null);
      fetchData();
    }
  };

  const handleCreateAndAssign = async (e) => {
    e.preventDefault();
    if (!isAdmin || !newCharName.trim() || !assigningSlot) return;
    const { type, slotNum } = assigningSlot;

    const { error } = await supabase.from('register_list').insert([{
      char_name: newCharName.trim(),
      class_name: newClassName,
      team_slot: slotNum,
      type: type
    }]);
    if (!error) {
      setAssigningSlot(null);
      fetchData();
    }
  };

  const handleBulkInsert = async () => {
    if (!isAdmin || !bulkText.trim()) return;
    
    const names = bulkText
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (names.length === 0) return;

    const existingNames = members.map(m => m.char_name.toLowerCase());
    const newObjects = names
      .filter(name => !existingNames.includes(name.toLowerCase()))
      .map(name => ({
        char_name: name,
        class_name: '', 
        team_slot: null,
        type: 'Chính thức'
      }));

    if (newObjects.length === 0) {
      alert("Tất cả các tên bạn nhập đều đã tồn tại trong hệ thống!");
      return;
    }

    const { error } = await supabase.from('register_list').insert(newObjects);
    if (!error) {
      alert(`Đã thêm thành công ${newObjects.length} thành viên vào danh sách chờ (Chưa có hệ phái)!`);
      setBulkText('');
      fetchData();
    } else {
      alert("Có lỗi xảy ra khi đồng bộ database!");
    }
  };

  const addSkillToMember = async (url) => {
    if (!isAdmin || !selectedMember || !url) return;

    const currentSkills = memberSkills.filter(s => s.member_id === selectedMember.id);
    if (currentSkills.length >= 5) return alert("Tối đa 5 kỹ năng!");
    
    let slot = 0;
    for(let i=0; i<5; i++) {
      if(!currentSkills.find(s => parseInt(s.pos_x) === i)) {
        slot = i;
        break;
      }
    }

    const { error } = await supabase.from('member_skills').insert([{ 
      member_id: selectedMember.id, 
      skill_url: url, 
      pos_x: slot, 
      pos_y: 0 
    }]);
    if (!error) fetchData();
  };

  const addToLibrary = async (url) => {
    if (!isAdmin || !url) return;
    
    const { error } = await supabase.from('skill_library').insert([{ url }]);
    if (!error) {
      setCustomSkillUrl('');
      fetchData(); 
    }
  };

  const removeFromLibrary = async (id) => {
    if (!isAdmin) return;
    if (window.confirm("Xóa skill này khỏi kho chung?")) {
      await supabase.from('skill_library').delete().eq('id', id);
      fetchData();
    }
  };

  const handleFileChange = (e) => {
    if (!isAdmin) return;
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("File quá lớn! Vui lòng chọn ảnh dưới 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      addToLibrary(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeSkillFromMember = async (id) => {
    if (!isAdmin) return;
    await supabase.from('member_skills').delete().eq('id', id);
    fetchData();
  };

  // HÀM ĐÃ ĐƯỢC SỬA: Chỉ xóa khỏi ô sơ đồ (Đưa về danh sách chờ) chứ không xóa khỏi hệ thống
  const deleteMember = async () => {
    if (!isAdmin || !selectedMember) return;
    if (window.confirm(`Xác nhận xóa [${selectedMember.char_name}] khỏi vị trí ô sơ đồ? (Họ sẽ quay lại danh sách chờ)`)) {
      const { error } = await supabase.from('register_list').update({ 
        team_slot: null 
      }).eq('id', selectedMember.id);
      
      if (!error) {
        setSelectedMember(null);
        fetchData();
      }
    }
  };

  const handleWaitingItemClick = (member) => {
    setSelectedMember(member);
  };

  const handleQuickDeleteWaiting = async (e, memberId, name) => {
    e.stopPropagation(); 
    if (!isAdmin) return;
    if (window.confirm(`Xác nhận xóa hẳn [${name}] khỏi danh sách chờ đăng ký?`)) {
      await supabase.from('member_skills').delete().eq('member_id', memberId);
      const { error } = await supabase.from('register_list').delete().eq('id', memberId);
      if (!error) fetchData();
    }
  };

  const getGroupPureCount = (groupName) => {
    const activeTeamIds = Object.keys(teamGroups).filter(teamId => teamGroups[teamId] === groupName).map(Number);
    if (activeTeamIds.length === 0) return 0;

    let totalPure = 0;
    activeTeamIds.forEach(teamId => {
      const teamMems = members.filter(m => m.type === 'Chính thức' && m.team_slot >= (teamId - 1) * 6 + 1 && m.team_slot <= teamId * 6);
      const pureMems = teamMems.filter(m => m.char_name && !m.has_item && !m.is_scout && !m.is_tower_team);
      totalPure += pureMems.length;
    });

    return totalPure;
  };

  const totalItemsCount = members.filter(m => m.char_name && m.has_item).length;
  const totalScoutsCount = members.filter(m => m.char_name && m.is_scout).length;
  const totalTowersCount = members.filter(m => m.char_name && m.is_tower_team).length;

  const unassignedMembers = members.filter(m => !m.team_slot && m.char_name);

  const renderSlotCell = (type, slotNum) => {
    const occupant = members.find(m => m.type === type && m.team_slot === slotNum);
    const isBeingMoved = movingMember && movingMember.id === occupant?.id;
    const isLeaderSlot = type === 'Chính thức' && (slotNum - 1) % 6 === 0;

    return (
      <div key={`${type}-${slotNum}`} onClick={() => handleSlotClick(type, slotNum)}
        className="slot-cell"
        style={{
          borderRadius: '4px', position: 'relative',
          backgroundColor: occupant ? (classInfo[occupant.class_name]?.color || '#444') : '#111',
          border: isBeingMoved ? '2px solid white' : (assigningSlot && assigningSlot.type === type && assigningSlot.slotNum === slotNum) ? '2px solid gold' : '1px solid #333',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: occupant?.class_name === 'Long Ngâm' ? '#000' : 'white', fontWeight: 'bold',
          padding: '0 4px', overflow: 'hidden', opacity: isBeingMoved ? 0.5 : 1,
          transition: 'all 0.1s ease'
        }}
      >
        {isLeaderSlot && <span className="leader-icon" style={{ position: 'absolute', top: '2px', left: '3px', opacity: 0.8 }}>🔑</span>}
        {occupant ? (
          <div style={{ width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
            {occupant.char_name} 
            {occupant.has_item && '📦'}
            {occupant.is_scout && '🔎'}
            {occupant.is_tower_team && '🔨'}
          </div>
        ) : `S${slotNum}`}
      </div>
    );
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '15px', textAlign: 'center', fontFamily: 'Arial', userSelect: 'none' }}>
      <style>{`
        /* --- GIAO DIỆN MOBILE / MẶC ĐỊNH --- */
        .app-container { max-width: 100%; margin: 0 auto; }
        .header-stats { display: flex; justify-content: center; gap: 5px; background: #0a0a0a; padding: 10px; borderRadius: '8px'; border: 1px solid #222; marginBottom: '15px'; flex-wrap: wrap; }
        .team-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; max-width: 100%; margin: 0 auto; }
        .slot-cell { height: 42px; margin: 3px 0; font-size: 10px; }
        .leader-icon { font-size: 8px; }
        .group-select { width: 100%; background: #000; color: #fff; border: 1px solid #444; font-size: 10px; border-radius: 3px; cursor: pointer; margin-top: 5px; padding: 3px; font-weight: bold; appearance: none; text-align: center; }
        .group-select:disabled { cursor: default; border-style: dashed; color: #fff; opacity: 1; }
        .map-section { max-width: 900px; margin: 40px auto; padding: 20px; background: #0a0a0a; border-radius: 12px; border: 1px solid #333; position: relative; }
        .map-container { position: relative; width: 100%; border-radius: 8px; overflow: hidden; border: 2px solid #444; margin-top: 15px; }
        .map-bg { width: 100%; display: block; opacity: 0.8; pointer-events: none; -webkit-user-drag: none; }
        
        .team-node { 
          position: absolute; border-radius: 50%; 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          font-size: 13px; font-weight: bold; cursor: move; 
          transform: translate(-50%, -50%); border: 2px solid #fff; 
          box-shadow: 0 0 15px rgba(0,0,0,0.8);
          z-index: 10; transition: transform 0.1s;
          touch-action: none;
          width: 36px; height: 36px;
        }
        .team-node:active { transform: translate(-50%, -50%) scale(1.2); z-index: 100; }
        .marker-remove-btn { position: absolute; top: -6px; right: -6px; background: red; color: white; border: none; border-radius: 50%; width: 14px; height: 14px; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; z-index: 20; }
        .admin-map-controls { display: flex; gap: 10px; justify-content: center; margin-bottom: 15px; flex-wrap: wrap; }
        .control-btn { padding: 6px 12px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer; border: 1px solid #444; color: white; }
        .skill-box { width: 65px; height: 65px; background: #222; border: 1px solid #444; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #555; position: relative; overflow: visible; }
        .skill-lib-item-container { position: relative; }
        .skill-lib-item { width: 60px; height: 60px; cursor: pointer; border-radius: 6px; border: 1px solid #333; transition: transform 0.1s; }
        .skill-lib-item:hover { border-color: gold; transform: scale(1.1); }
        .lib-remove-btn { position: absolute; top: -5px; right: -5px; background: black; color: red; border: 1px solid red; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 5; }
        .custom-add-skill { display: flex; gap: 5px; margin-top: 10px; padding: 0 10px; }
        .custom-input { flex: 1; background: #000; border: 1px solid #444; color: white; padding: 6px; border-radius: 4px; }
        .upload-btn { background: #333; color: white; border: 1px solid #555; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .add-btn { background: #d4af37; color: black; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        
        .member-select-chip { padding: 6px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: center; border: 1px solid rgba(255,255,255,0.1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: white; }
        .member-select-chip:hover { border-color: #fff; transform: scale(1.03); }

        .waiting-box { max-width: 100%; margin: 30px auto 10px auto; background: #0a0a0a; border: 1px solid #222; border-radius: 8px; padding: 15px; text-align: left; }
        .waiting-flex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px; margin-top: 10px; }
        .waiting-item-chip { display: flex; align-items: center; justify-content: space-between; height: 26px; padding: 0 6px 0 10px; border-radius: 4px; font-size: 11px; font-weight: bold; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
        .waiting-text-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; margin-right: 4px; }
        .waiting-delete-icon-btn { background: rgba(0, 0, 0, 0.3); color: #ff4d4d; border: none; border-radius: 3px; width: 16px; height: 16px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; transition: all 0.2s; }
        .waiting-delete-icon-btn:hover { background: #ff4d4d; color: white; }

        @media (min-width: 1024px) { 
          .team-grid { grid-template-columns: repeat(10, 1fr); } 
        }

        /* --- CẤU HÌNH PHÓNG TO / FULL TRANG TRÊN PC --- */
        @media (min-width: 1400px) {
          .app-container {
            max-width: 98vw;
            padding: 25px !important;
          }
          h1 { font-size: 36px !important; margin: 20px 0 !important; }
          
          .header-stats {
            padding: 18px !important;
            font-size: 16px !important;
            gap: 15px !important;
          }
          .header-stats div div { font-size: 14px !important; }
          .header-stats div div:last-child { font-size: 20px !important; }

          .team-grid {
            max-width: 100% !important;
            gap: 12px !important;
          }
          
          .slot-cell {
            height: 62px !important;
            font-size: 15px !important;
            margin: 5px 0 !important;
          }
          .leader-icon {
            font-size: 13px !important;
            top: 3px !important;
            left: 4px !important;
          }
          .group-select {
            font-size: 14px !important;
            padding: 6px !important;
            margin-top: 8px !important;
          }

          .waiting-box {
            max-width: 100% !important;
            padding: 25px !important;
          }
          .waiting-box h2 { font-size: 20px !important; }
          .waiting-item-chip {
            height: 38px !important;
            font-size: 15px !important;
          }
          .waiting-flex-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important;
            gap: 10px !important;
          }

          .map-section {
            max-width: 1300px !important;
          }
          .map-section h3 { font-size: 26px !important; }
        }
      `}</style>

      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', zIndex: 100 }}>
        <button onClick={handleAdminLogin} style={{ background: isAdmin ? '#d4af37' : 'transparent', color: isAdmin ? '#000' : '#d4af37', border: '1px solid #d4af37', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          {isAdmin ? "MODE: ADMIN CONTROL" : "ADMIN LOGIN"}
        </button>
        {isAdmin && (
          <button onClick={handleResetBoard} style={{ background: 'blue', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>RESET DATA WEEK</button>
        )}
      </div>

      <img src="/nth-logo.png" alt="Logo" style={{ width: '60px', margin: '0 auto', display: 'block' }} />
      <h1 style={{ color: 'gold', fontSize: '20px', margin: '10px 0' }}>BANG THIÊN PHẠT</h1>

      <div className="header-stats">
        {Object.keys(classInfo).map(cls => (
          <div key={cls} style={{ borderRight: '1px solid #222', paddingRight: '5px', minWidth: '60px' }}>
            <div style={{ color: classInfo[cls].color, fontSize: '10px', fontWeight: 'bold' }}>{cls}</div>
            <div style={{ fontSize: '14px' }}>{members.filter(m => m.class_name === cls).length}</div>
          </div>
        ))}
        <div style={{ paddingLeft: '8px', borderLeft: '2px solid #333', display: 'flex', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#00FF00' }}>QUÂN SỐ</div>
            <div style={{ fontSize: '14px', color: '#00FF00' }}>{officialCount} / 60</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#ff5e00' }}>📦 VẬT TƯ</div>
            <div style={{ fontSize: '14px', color: '#ff6600' }}>{totalItemsCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#00a2ff' }}>🔎 SCOUT</div>
            <div style={{ fontSize: '14px', color: '#00ffff' }}>{totalScoutsCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#ff4500' }}>🔨 TRỤ</div>
            <div style={{ fontSize: '14px', color: '#ff4500' }}>{totalTowersCount}</div>
          </div>
        </div>
      </div>
      
      {!isAdmin && (
        <div style={{ margin: '15px auto', padding: '8px 15px', background: '#111', border: '1px dashed #444', borderRadius: '6px', maxWidth: '400px', fontSize: '11px', color: '#aaa' }}>
          🌐 Chế độ xem trực quan. Bấm trực tiếp vào thành viên để xem bộ kỹ năng (Skill).
        </div>
      )}

      <div className="team-grid" style={{ marginTop: '15px' }}>
        {[...Array(10)].map((_, col) => {
          const teamNum = col + 1;
          const currentGroup = teamGroups[teamNum] || 'Đoàn 1';
          const settings = groupSettings[currentGroup] || groupSettings['Đoàn 1'];
          return (
            <div key={col} style={{ 
              background: settings.bg, padding: '8px', borderRadius: '8px', border: `2px solid ${settings.border}`,
              boxShadow: currentGroup !== 'Đoàn 1' ? `0 0 10px ${settings.border}33` : 'none'
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

      <div className="waiting-box">
        <h2 style={{ color: 'gold', fontSize: '13px', margin: '0 0 5px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📋 THÀNH VIÊN CHỜ XẾP ĐỘI CHI TIẾT ({unassignedMembers.length})</span>
          <span style={{ fontSize: '11px', color: '#666', fontWeight: 'normal' }}>(Bấm vào để xem profile)</span>
        </h2>
        <div className="waiting-flex-grid">
          {unassignedMembers.map(m => {
            const hasClass = m.class_name && classInfo[m.class_name];
            return (
              <div key={m.id} className="waiting-item-chip" onClick={() => handleWaitingItemClick(m)} style={{ 
                backgroundColor: hasClass ? classInfo[m.class_name].color : '#222', 
                color: m.class_name === 'Long Ngâm' ? '#000' : 'white',
                border: hasClass ? 'none' : '1px dashed #555'
              }}>
                <span className="waiting-text-name" title={`${m.char_name} ${m.class_name ? `(${m.class_name})` : '(Chưa chọn phái)'}`}>
                  {m.char_name} {!m.class_name && '❓'}
                </span>
                {isAdmin && (
                  <button 
                    type="button"
                    className="waiting-delete-icon-btn" 
                    title="Xóa hẳn khỏi kho chờ"
                    onClick={(e) => handleQuickDeleteWaiting(e, m.id, m.char_name)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          {unassignedMembers.length === 0 && (
            <div style={{ color: '#555', fontSize: '11px', gridColumn: '1 / -1', padding: '5px 0' }}>
              Hiện không có ai trong danh sách chờ xếp đội.
            </div>
          )}
        </div>
      </div>

      <div className="map-section">
        <h3 style={{ color: 'gold', margin: '0 0 5px 0', fontSize: '18px' }}>CHỈ ĐẠO CHIẾN THUẬT</h3>
        
        {isAdmin && (
          <div className="admin-map-controls">
            <button className="control-btn" style={{ background: '#7cd826', color: '#000' }} onClick={() => addNewMarker('Đoàn 1')}>+ Vòng tròn Đoàn 1</button>
            <button className="control-btn" style={{ background: '#d400ff', color: '#000' }} onClick={() => addNewMarker('Đoàn 2')}>+ Vòng tròn Đoàn 2</button>
            <button className="control-btn" style={{ background: '#ffd700', color: '#000' }} onClick={() => addNewMarker('Đoàn 3')}>+ Vòng tròn Đoàn 3</button>
            <button className="control-btn" style={{ background: '#ff4500', color: '#fff' }} onClick={() => addNewMarker('Đoàn 4')}>+ Vòng tròn Đoàn 4</button>
            <button className="control-btn" style={{ background: '#555', color: '#fff' }} onClick={() => addNewMarker('item')}>+ Icon Vật Tư 📦</button>
            <button className="control-btn" style={{ background: '#555', color: '#fff' }} onClick={() => addNewMarker('scout')}>+ Icon Scout 🔎</button>
            <button className="control-btn" style={{ background: '#555', color: '#fff' }} onClick={() => addNewMarker('tower')}>+ Icon Trụ 🔨</button>
          </div>
        )}

        <div className="map-container" ref={mapRef}>
          <img src="https://i.postimg.cc/SsMMSZLG/unnam2ed.jpg" alt="Tactical Map" className="map-bg" />
          
          {teamPositions.map((pos) => {
            let bg = '#fff';
            let label = '';
            
            if (pos.marker_type.startsWith('Đoàn')) {
              const currentGroup = pos.marker_type;
              bg = groupSettings[currentGroup]?.border || '#fff';
              label = getGroupPureCount(currentGroup).toString();
            } else if (pos.marker_type === 'item') {
              bg = '#ffd700';
              label = '📦';
            } else if (pos.marker_type === 'scout') {
              bg = '#00ffff';
              label = '🔎';
            } else if (pos.marker_type === 'tower') {
              bg = '#ff4500';
              label = '🔨';
            }

            return (
              <div key={pos.id} draggable={isAdmin} onDragEnd={(e) => handleDragEnd(e, pos.id)} className="team-node"
                style={{ 
                  left: `${pos.pos_x}%`, top: `${pos.pos_y}%`, 
                  backgroundColor: bg,
                  color: '#000', /* MOD ĐÃ ĐỔI: Chữ hiển thị số đếm luôn luôn màu đen */
                  cursor: isAdmin ? 'move' : 'default'
                }}
              >
                {label}
                {isAdmin && <button className="marker-remove-btn" onClick={() => removeMarker(pos.id)}>×</button>}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL GIAO DIỆN CHỌN NHANH CHO ADMIN */}
      {assigningSlot && isAdmin && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#141414', padding: '20px', borderRadius: '12px', border: '2px solid gold', zIndex: 1100, width: '90%', maxWidth: '520px', boxShadow: '0 0 40px rgba(0,0,0,0.9)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'gold', marginBottom: '12px' }}>
            XẾP THÀNH VIÊN VÀO Ô [S{assigningSlot.slotNum} - {assigningSlot.type}]
          </div>

          {!pendingAssignMember ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '220px', marginBottom: '12px', background: '#0a0a0a', padding: '10px', borderRadius: '8px', border: '1px solid #222', overflow: 'hidden' }}>
              <div style={{ fontSize: '11px', color: '#888', textAlign: 'left', marginBottom: '6px', fontWeight: 'bold' }}>
                BẤM VÀO TÊN ĐỂ CHỌN NGƯỜI ĐƯA VÀO Ô SƠ ĐỒ:
              </div>
              <input className="custom-input" style={{ marginBottom: '8px', flex: 'none', fontSize: '11px' }} placeholder="Tìm nhanh tên thành viên chờ..." value={searchUnassigned} onChange={(e) => setSearchUnassigned(e.target.value)} />
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', overflowY: 'auto', flex: 1, padding: '2px' }}>
                {unassignedMembers
                  .filter(m => m.char_name.toLowerCase().includes(searchUnassigned.toLowerCase()))
                  .map(m => (
                    <div key={m.id} className="member-select-chip" style={{ backgroundColor: classInfo[m.class_name]?.color || '#333', color: m.class_name === 'Long Ngâm' ? '#000' : '#fff' }} onClick={() => startAssignMember(m)}>
                      {m.char_name} {!m.class_name && '❓'}
                    </div>
                  ))}
                {unassignedMembers.filter(m => m.char_name.toLowerCase().includes(searchUnassigned.toLowerCase())).length === 0 && (
                  <div style={{ gridColumn: 'span 3', color: '#555', fontSize: '11px', padding: '15px 0' }}>Không tìm thấy thành viên trống...</div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid gold', marginBottom: '12px', textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>
                GÁN HỆ PHÁI CHO: <span style={{ color: 'gold', fontSize: '15px' }}>{pendingAssignMember.char_name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Chọn hệ phái chính thức:</label>
                  <select className="custom-input" style={{ fontSize: '12px', padding: '6px', width: '100%' }} value={selectedClassForAssign} onChange={(e) => setSelectedClassForAssign(e.target.value)}>
                    {Object.keys(classInfo).map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" onClick={confirmAssignWithClass} style={{ flex: 1, background: '#28a745', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    XÁC NHẬN VÀO SƠ ĐỒ
                  </button>
                  <button type="button" onClick={() => setPendingAssignMember(null)} style={{ background: '#555', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    QUAY LẠI
                  </button>
                </div>
              </div>
            </div>
          )}

          {!pendingAssignMember && (
            <div style={{ borderTop: '1px solid #222', paddingTop: '10px', marginBottom: '12px', textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: 'gold', marginBottom: '5px', fontWeight: 'bold' }}>PASTE DANH SÁCH TÊN HÀNG LOẠT VÀO KHO CHỜ:</div>
              <textarea 
                style={{ width: '100%', height: '65px', background: '#000', border: '1px solid #444', borderRadius: '4px', color: '#fff', padding: '5px', fontSize: '11px', resize: 'none', fontFamily: 'monospace' }}
                placeholder="Dán danh sách chỉ chứa Tên vào đây... (Ngăn cách bằng dấu phẩy hoặc Xuống dòng)"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <button type="button" onClick={handleBulkInsert} style={{ background: '#d4af37', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', width: '100%' }}>
                NẠP HÀNG LOẠT VÀO KHO CHỜ (CHƯA PHÂN PHÁI)
              </button>
            </div>
          )}

          {!pendingAssignMember && (
            <form onSubmit={handleCreateAndAssign} style={{ borderTop: '1px solid #222', paddingTop: '10px', textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px', fontWeight: 'bold' }}>HOẶC TẠO MỚI 1 NGƯỜI TRỰC TIẾP VÀO Ô:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input className="custom-input" style={{ fontSize: '11px', padding: '5px' }} required placeholder="Nhập tên..." value={newCharName} onChange={(e) => setNewCharName(e.target.value)} />
                <select className="custom-input" style={{ maxWidth: '110px', cursor: 'pointer', fontSize: '11px' }} value={newClassName} onChange={(e) => setNewClassName(e.target.value)}>
                  {Object.keys(classInfo).map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
                <button type="submit" className="add-btn" style={{ fontSize: '11px', padding: '5px 12px' }}>THÊM MỚI</button>
              </div>
            </form>
          )}

          <button type="button" onClick={() => { setAssigningSlot(null); setPendingAssignMember(null); }} style={{ background: '#333', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', marginTop: '12px', width: '100%', cursor: 'pointer', fontSize: '12px' }}>ĐÓNG GIAO DIỆN</button>
        </div>
      )}

      {/* MODAL ĐIỀU CHỈNH HOẶC XEM PROFILE THÀNH VIÊN */}
      {selectedMember && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1a1a1a', padding: '20px', borderRadius: '15px', border: '2px solid gold', zIndex: 1000, width: '90%', maxWidth: '420px', boxShadow: '0 0 30px rgba(0,0,0,1)' }}>
          <div style={{ marginBottom: '5px', fontWeight: 'bold', color: classInfo[selectedMember.class_name]?.color || '#fff', fontSize: '18px' }}>{selectedMember.char_name}</div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '15px' }}>Hệ: {selectedMember.class_name || 'Chưa chọn'} | {selectedMember.type}</div>

          {/* KHO SKILL CHUNG (Chỉ dành cho Admin) */}
          {isAdmin && (
            <div style={{ marginBottom: '15px', background: '#222', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', color: 'gold', marginBottom: '8px' }}>KHO SKILL CHUNG (ADMIN)</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto', padding: '5px' }}>
                {skillLibrary.map((item) => (
                  <div key={item.id} className="skill-lib-item-container">
                    <img src={item.url} className="skill-lib-item" onClick={() => addSkillToMember(item.url)} alt="skill" />
                    <div className="lib-remove-btn" onClick={(e) => { e.stopPropagation(); removeFromLibrary(item.id); }}>×</div>
                  </div>
                ))}
                {skillLibrary.length === 0 && <div style={{fontSize: '10px', color: '#555'}}>Kho trống...</div>}
              </div>

              <div style={{ marginTop: '10px', borderTop: '1px solid #333', paddingTop: '10px' }}>
                <div className="custom-add-skill">
                  <input className="custom-input" style={{ fontSize: '11px' }} placeholder="Link ảnh skill..." value={customSkillUrl} onChange={(e) => setCustomSkillUrl(e.target.value)} />
                  <button type="button" className="add-btn" style={{ fontSize: '11px' }} onClick={() => addToLibrary(customSkillUrl)}>THÊM</button>
                  <label className="upload-btn" style={{ fontSize: '11px' }}>
                    TẢI ẢNH
                    <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* BỘ KỸ NĂNG ĐANG TRANG BỊ */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '11px', color: 'gold', marginBottom: '8px', fontWeight: 'bold' }}>BỘ KỸ NĂNG ĐÃ TRANG BỊ</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
              {[0, 1, 2, 3, 4].map(i => {
                const skill = memberSkills.find(s => s.member_id === selectedMember.id && parseInt(s.pos_x) === i);
                return (
                  <div key={i} className="skill-box" style={{ width: '55px', height: '55px' }}>
                    {skill ? (
                      <>
                        <img src={skill.skill_url} style={{ width: '100%', height: '100%', borderRadius: '6px' }} alt="equipped" />
                        {isAdmin && (
                          <div onClick={() => removeSkillFromMember(skill.id)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', width: '18px', height: '18px', borderRadius: '50%', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '1px solid white' }}>×</div>
                        )}
                      </>
                    ) : 'Trống'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TRẠNG THÁI NHIỆM VỤ CHIẾN TRƯỜNG */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '12px', background: '#222', padding: '8px', borderRadius: '6px', marginBottom: '15px' }}>
            <div>Scout: {selectedMember.is_scout ? '🔎 Có' : '❌ Không'}</div>
            <div>Trụ: {selectedMember.is_tower_team ? '🔨 Có' : '❌ Không'}</div>
            <div>Vật tư: {selectedMember.has_item ? '📦 Có' : '❌ Không'}</div>
          </div>

          {/* CÁC NÚT ĐIỀU CHỈNH TRẠNG THÁI (Chỉ Admin mới có) */}
          {isAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
              <button type="button" onClick={toggleScout} style={{ background: selectedMember.is_scout ? '#00ffff' : '#333', color: selectedMember.is_scout ? '#000' : '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px' }}>
                {selectedMember.is_scout ? "BỎ SCOUT 🔎" : "SCOUT 🔎"}
              </button>
              <button type="button" onClick={toggleTowerTeam} style={{ background: selectedMember.is_tower_team ? '#ff4500' : '#fff', color: selectedMember.is_tower_team ? '#fff' : '#000', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px' }}>
                {selectedMember.is_tower_team ? "BỎ TEAM TRỤ 🔨" : "TEAM TRỤ 🔨"}
              </button>
            </div>
          )}

          {/* HÀNG NÚT ĐÓNG / THAO TÁC HỆ THỐNG */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {isAdmin && (
              <>
                <button type="button" onClick={toggleItem} style={{ flex: 1, background: selectedMember.has_item ? '#444' : '#28a745', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold' }}>
                    {selectedMember.has_item ? "BỎ VẬT TƯ" : "VẬT TƯ 📦"}
                </button>
                {/* MOD ĐÃ ĐỔI: Tên nút chuyển từ "XÓA HẲN" sang "XÓA KHỎI Ô", khi bấm sẽ đưa member về list chờ chứ không xóa dữ liệu */}
                <button type="button" onClick={deleteMember} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>XÓA KHỎI Ô</button>
              </>
            )}
            <button type="button" onClick={() => setSelectedMember(null)} style={{ flex: !isAdmin ? 1 : 'none', background: '#333', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', minWidth: '80px' }}>ĐÓNG</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
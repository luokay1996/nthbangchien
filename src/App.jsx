import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase Client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Định nghĩa Class và màu sắc
const classInfo = {
  'Toái Mộng': { color: '#87CEEB', emoji: '🗡️' }, // Xanh da trời nhạt
  'Thiết Y': { color: '#FFA500', emoji: '🛡️' },  // Vàng cam
  'Thần Tướng': { color: '#00008B', emoji: '⚔️' }, // Xanh dương đậm
  'Tố Vấn': { color: '#FF69B4', emoji: '🌸' },    // Hồng
  'Cửu Linh': { color: '#800080', emoji: '🔮' },    // Tím
  // Thêm các class khác nếu cần
};

// --- Giao diện chính của ứng dụng ---
function App() {
  const [members, setMembers] = useState([]); // Danh sách người chơi đã đăng ký
  const [form, setForm] = useState({ 
    char_name: '', 
    class_name: 'Toái Mộng', // Giá trị mặc định
    team_slot: '',         // Vị trí chọn
    type: 'Chính thức'    // Loại thành viên: Chính thức / Học việc
  });

  const currentDate = useMemo(() => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }, []);

  // Lấy dữ liệu và lắng nghe Real-time từ Supabase
  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from('register_list').select('*');
    setMembers(data || []);
  }, []);

  useEffect(() => {
    fetchMembers();
    const subscription = supabase
      .channel('register_list_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, () => {
        fetchMembers(); // Cập nhật danh sách khi có thay đổi
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [fetchMembers]);

  // Xử lý khi nhấn nút Đăng ký
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.team_slot) {
      alert('Vui lòng chọn một ô vị trí!');
      return;
    }
    // Kiểm tra trùng vị trí
    const existingMember = members.find(m => m.team_slot === form.team_slot && m.type === form.type);
    if (existingMember) {
      alert(`Ô ${form.team_slot} trong ${form.type} đã có người đăng ký (${existingMember.char_name}). Vui lòng chọn ô khác!`);
      return;
    }

    await supabase.from('register_list').insert([form]);
    setForm({ ...form, char_name: '', team_slot: '' }); // Reset form sau khi đăng ký
  };

  // Tạo các ô slot
  const renderSlots = (type, totalSlots) => {
    const slots = [];
    for (let i = 1; i <= totalSlots; i++) {
      const slotId = `${type}-${i}`;
      const member = members.find(m => m.team_slot === i && m.type === type);
      const backgroundColor = member ? classInfo[member.class_name]?.color : '#282828'; // Nền đen mặc định
      const textColor = member ? 'white' : '#666'; // Chữ trắng nếu có người, xám nếu trống

      slots.push(
        <div 
          key={slotId} 
          style={{
            width: '100px', height: '40px', margin: '5px', borderRadius: '4px',
            backgroundColor: backgroundColor, color: textColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: form.team_slot === i && form.type === type ? '2px solid #ffd700' : '1px solid #444',
            fontWeight: 'bold', fontSize: '14px', position: 'relative'
          }}
          onClick={() => setForm({...form, team_slot: i, type: type})}
        >
          {member ? (
            <span title={`${member.char_name} (${member.class_name})`}>
              {classInfo[member.class_name]?.emoji} {member.char_name}
            </span>
          ) : (
            `Slot ${i}`
          )}
          {member && ( // Nút Xóa nhỏ
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Ngăn sự kiện click lan ra ô lớn
                if (window.confirm(`Xác nhận xóa ${member.char_name} khỏi Slot ${i} (${type})?`)) {
                  supabase.from('register_list').delete().eq('id', member.id);
                }
              }}
              style={{
                position: 'absolute', top: '2px', right: '2px', 
                backgroundColor: 'rgba(255,0,0,0.6)', color: 'white', 
                border: 'none', borderRadius: '3px', fontSize: '10px',
                padding: '2px 4px', cursor: 'pointer'
              }}
            >X</button>
          )}
        </div>
      );
    }
    return <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>{slots}</div>;
  };

  return (
    <div style={{ 
      fontFamily: '"Times New Roman", serif', 
      backgroundColor: '#1a1a1a', 
      color: '#e0e0e0', 
      minHeight: '100vh', 
      padding: '20px',
      backgroundImage: `url('/nth-logo.png')`, // Đổi đường dẫn logo nếu khác
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center top',
      backgroundSize: '150px auto' // Kích thước logo
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px', paddingTop: '100px' }}>
        <h1 style={{ color: '#ffd700', fontSize: '3em', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          ĐĂNG KÝ BANG CHIẾN
        </h1>
        <h2 style={{ color: '#aaa', fontSize: '1.5em' }}>
          Ngày {currentDate} - {supabase.from('register_list').count() || members.length} Thành viên đã sẵn sàng
        </h2>
      </div>

      {/* Form đăng ký */}
      <form onSubmit={handleSubmit} style={{ 
        marginBottom: '40px', background: '#222', padding: '25px', borderRadius: '10px',
        maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input 
            placeholder="Tên Nhân Vật (Ingame)" 
            value={form.char_name} 
            onChange={e => setForm({...form, char_name: e.target.value})} 
            required 
            style={inputStyle}
          />
          <select 
            value={form.class_name} 
            onChange={e => setForm({...form, class_name: e.target.value})} 
            style={inputStyle}
          >
            {Object.keys(classInfo).map(c => <option key={c} value={c}>{classInfo[c].emoji} {c}</option>)}
          </select>
          <div style={{ ...inputStyle, border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333' }}>
             Vị trí chọn: {form.type} - {form.team_slot || 'Chưa chọn'}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button type="submit" style={{ ...buttonStyle, width: '200px', padding: '12px 0' }}>
            ĐĂNG KÝ NGAY
          </button>
        </div>
      </form>

      {/* Khu vực Thành viên chính thức */}
      <div style={{ maxWidth: '1000px', margin: '40px auto', background: '#222', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
        <h3 style={{ color: '#ffd700', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
          Thành viên chính thức ({members.filter(m => m.type === 'Chính thức').length}/60)
        </h3>
        {renderSlots('Chính thức', 60)}
      </div>

      {/* Khu vực Học việc đăng ký */}
      <div style={{ maxWidth: '1000px', margin: '40px auto', background: '#222', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
        <h3 style={{ color: '#87CEEB', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
          Học việc đăng ký ({members.filter(m => m.type === 'Học việc').length}/30)
        </h3>
        {renderSlots('Học việc', 30)}
      </div>

      {/* Phần hiển thị danh sách chi tiết (tùy chọn) */}
      <div style={{ maxWidth: '1000px', margin: '40px auto', background: '#222', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
        <h3 style={{ color: '#e0e0e0', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
          Danh sách chi tiết
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#333' }}>
              <th style={tableHeaderStyle}>Loại</th>
              <th style={tableHeaderStyle}>Slot</th>
              <th style={tableHeaderStyle}>Tên NV</th>
              <th style={tableHeaderStyle}>Hệ Phái</th>
              <th style={tableHeaderStyle}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {members.sort((a, b) => {
              // Sắp xếp theo loại (Chính thức trước), sau đó theo slot
              if (a.type === 'Chính thức' && b.type === 'Học việc') return -1;
              if (a.type === 'Học việc' && b.type === 'Chính thức') return 1;
              return a.team_slot - b.team_slot;
            }).map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #444' }}>
                <td style={tableCellStyle}>{m.type}</td>
                <td style={tableCellStyle}>{m.team_slot}</td>
                <td style={tableCellStyle}>{m.char_name}</td>
                <td style={{ ...tableCellStyle, color: classInfo[m.class_name]?.color, fontWeight: 'bold' }}>
                  {classInfo[m.class_name]?.emoji} {m.class_name}
                </td>
                <td style={tableCellStyle}>{new Date(m.created_at).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Các style chung để code gọn gàng hơn
const inputStyle = {
  padding: '10px 15px',
  borderRadius: '5px',
  border: '1px solid #444',
  backgroundColor: '#333',
  color: 'white',
  fontSize: '1em',
  minWidth: '150px',
  flex: '1 1 auto' // Cho phép các input co giãn
};

const buttonStyle = {
  padding: '10px 20px',
  borderRadius: '5px',
  border: 'none',
  backgroundColor: '#ffd700', // Vàng kim
  color: 'black',
  fontSize: '1.1em',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'background-color 0.3s ease'
};

const tableHeaderStyle = {
  padding: '12px 15px',
  textAlign: 'left',
  color: '#ffd700',
  borderBottom: '1px solid #555'
};

const tableCellStyle = {
  padding: '10px 15px',
  borderBottom: '1px solid #444'
};


export default App;
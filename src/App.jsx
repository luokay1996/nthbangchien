import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function App() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ char_name: '', class_name: 'Tố Vấn', power: '' });

  useEffect(() => {
    fetchMembers();
    const subscription = supabase
      .channel('register_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'register_list' }, () => {
        fetchMembers();
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('register_list').select('*').order('created_at', { ascending: false });
    setMembers(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await supabase.from('register_list').insert([form]);
    setForm({ ...form, char_name: '', power: '' });
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: '#ffd700' }}>Bang Chiến Nghịch Thủy Hàn - LIVE</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px', background: '#333', padding: '15px', borderRadius: '8px' }}>
        <input placeholder="Tên nhân vật" value={form.char_name} onChange={e => setForm({...form, char_name: e.target.value})} required style={{ marginRight: '10px' }} />
        <select value={form.class_name} onChange={e => setForm({...form, class_name: e.target.value})} style={{ marginRight: '10px' }}>
          {['Tố Vấn', 'Thần Tướng', 'Toái Mộng', 'Cửu Linh', 'Huyết Hà', 'Thần Cơ'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Lực chiến" type="number" value={form.power} onChange={e => setForm({...form, power: e.target.value})} style={{ marginRight: '10px' }} />
        <button type="submit" style={{ backgroundColor: '#ffd700', color: 'black', fontWeight: 'bold' }}>Đăng Ký</button>
      </form>
      <h2>Danh sách đăng ký ({members.length})</h2>
      <table border="1" width="100%" style={{ borderColor: '#444' }}>
        <thead><tr><th>Tên</th><th>Hệ Phái</th><th>Lực Chiến</th></tr></thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}><td>{m.char_name}</td><td>{m.class_name}</td><td>{m.power}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default App;

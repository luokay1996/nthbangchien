import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
import.meta.env.VITE_SUPABASE_URL,
import.meta.env.VITE_SUPABASE_ANON_KEY
)

const classInfo = {
'Toái Mộng': { color: '#87CEEB' },
'Thiết Y': { color: '#FFA500' },
'Huyết Hà': { color: '#8B0000' },
'Thần Tương': { color: '#4169E1' },
'Tố Vấn': { color: '#FF69B4' },
'Cửu Linh': { color: '#800080' },
'Long Ngâm': { color: '#66FFFF' }
}

function App(){

const [members,setMembers]=useState([])
const [isAdmin,setIsAdmin]=useState(false)
const [isLimitEnabled,setIsLimitEnabled]=useState(true)
const [movingMember,setMovingMember]=useState(null)
const [selectedMember,setSelectedMember]=useState(null)

const [form,setForm]=useState({
char_name:'',
class_name:'Toái Mộng',
team_slot:null,
type:'Chính thức'
})

const fetchMembers = useCallback(async()=>{

const {data}=await supabase
.from('register_list')
.select('*')

setMembers(data||[])

},[])

useEffect(()=>{

fetchMembers()

const channel=supabase
.channel('db')
.on(
'postgres_changes',
{event:'*',schema:'public',table:'register_list'},
()=>fetchMembers()
)
.subscribe()

return ()=>supabase.removeChannel(channel)

},[fetchMembers])


const officialCount =
members.filter(m=>m.type==='Chính thức').length


const handleAdminLogin=()=>{

const pass=prompt("Nhập mật mã Admin:")

if(pass==="quymonquan2026"){
setIsAdmin(true)
alert("ADMIN ON")
}else{
alert("Sai mật mã")
}

}


const handleResetBoard=async()=>{

if(window.confirm("RESET TUẦN MỚI?")){

await supabase
.from('register_list')
.delete()
.neq('id',0)

fetchMembers()

}

}


const handleSlotClick = async(type,slotNum)=>{

const occupant =
members.find(m=>m.type===type && m.team_slot===slotNum)

if(isAdmin && movingMember){

if(occupant){

await Promise.all([

supabase
.from('register_list')
.update({
type:occupant.type,
team_slot:occupant.team_slot
})
.eq('id',movingMember.id),

supabase
.from('register_list')
.update({
type:movingMember.type,
team_slot:movingMember.team_slot
})
.eq('id',occupant.id)

])

}else{

await supabase
.from('register_list')
.update({
type,
team_slot:slotNum
})
.eq('id',movingMember.id)

}

setMovingMember(null)
fetchMembers()
return
}


if(occupant){

setSelectedMember(occupant)

if(isAdmin)
setMovingMember(occupant)

return
}

setForm({...form,type,team_slot:slotNum})
setSelectedMember(null)

}


const handleSubmit=async(e)=>{

e.preventDefault()

if(!form.team_slot)
return alert("Chọn slot!")

const savedName=
localStorage.getItem('my_char_name')

if(
!isAdmin &&
isLimitEnabled &&
savedName &&
members.some(m=>m.char_name===savedName)
){
return alert("Mỗi người chỉ 1 slot")
}

await supabase
.from('register_list')
.insert([form])

localStorage.setItem('my_char_name',form.char_name)

setForm({...form,char_name:'',team_slot:null})

fetchMembers()

}


const deleteMember=async()=>{

if(!selectedMember) return

if(window.confirm("Xóa thành viên?")){

await supabase
.from('register_list')
.delete()
.eq('id',selectedMember.id)

setSelectedMember(null)

fetchMembers()

}

}


const renderSlotCell=(type,slotNum)=>{

const occupant=
members.find(m=>m.type===type && m.team_slot===slotNum)

const isSelected=
form.type===type && form.team_slot===slotNum

const isLeader=
type==="Chính thức" && (slotNum-1)%6===0

return(

<div
key={`${type}-${slotNum}`}
onClick={()=>handleSlotClick(type,slotNum)}

style={{
height:'42px',
margin:'3px 0',
borderRadius:'4px',
position:'relative',
backgroundColor:
occupant
? classInfo[occupant.class_name]?.color
:'#161616',

border:
isSelected
?'2px solid gold'
:'1px solid #333',

display:'flex',
alignItems:'center',
justifyContent:'center',
cursor:'pointer',
fontSize:'10px',
color:'white',
fontWeight:'bold'
}}
>

{isLeader &&
<span style={{
position:'absolute',
top:'1px',
left:'2px',
fontSize:'8px'
}}>
🔑
</span>
}

{occupant ? occupant.char_name : `S${slotNum}`}

</div>

)

}


return(

<div style={{
background:'#000',
color:'white',
minHeight:'100vh',
padding:'15px',
textAlign:'center',
fontFamily:'Arial'
}}>


<style>{`

.team-grid{
display:grid;
grid-template-columns:repeat(5,1fr);
gap:6px;
max-width:1200px;
margin:auto;
}

@media(min-width:1024px){
.team-grid{
grid-template-columns:repeat(10,1fr);
}
}

`}</style>


{/* ADMIN */}

<div style={{
position:'absolute',
top:'10px',
right:'10px',
display:'flex',
flexDirection:'column',
gap:'5px'
}}>

<button
onClick={handleAdminLogin}
style={{
background:isAdmin?'gold':'transparent',
color:isAdmin?'black':'gold',
border:'1px solid gold',
padding:'5px 10px'
}}
>
{isAdmin?"ADMIN ON":"ADMIN LOGIN"}
</button>

{isAdmin && (

<>
<button
onClick={()=>setIsLimitEnabled(!isLimitEnabled)}
style={{background:'#222',color:'white'}}
>
GIỚI HẠN: {isLimitEnabled?'BẬT':'TẮT'}
</button>

<button
onClick={handleResetBoard}
style={{background:'red',color:'white'}}
>
RESET TUẦN
</button>
</>

)}

</div>


<h1 style={{color:'gold'}}>BANG QUỶ MÔN QUAN</h1>


{/* QUÂN SỐ */}

<div style={{
display:'flex',
justifyContent:'center',
gap:'8px',
flexWrap:'wrap',
marginBottom:'15px'
}}>

{Object.keys(classInfo).map(cls=>(

<div key={cls}>

<div style={{
color:classInfo[cls].color,
fontSize:'11px',
fontWeight:'bold'
}}>
{cls}
</div>

<div>
{members.filter(m=>m.class_name===cls).length}
</div>

</div>

))}

<div>
<div>QUÂN SỐ</div>
<div>{officialCount}/60</div>
</div>

</div>


{/* FORM */}

<form onSubmit={handleSubmit} style={{marginBottom:'20px'}}>

<input
placeholder="Tên nhân vật"
value={form.char_name}
onChange={e=>setForm({...form,char_name:e.target.value})}
/>

<select
value={form.class_name}
onChange={e=>setForm({...form,class_name:e.target.value})}
>

{Object.keys(classInfo).map(c=>(
<option key={c}>{c}</option>
))}

</select>

<button>ĐĂNG KÝ</button>

</form>


<h2 style={{color:'gold'}}>ĐỘI HÌNH CHÍNH</h2>

<div className="team-grid">

{[...Array(10)].map((_,col)=>(

<div key={col}>

<div style={{color:'gold',fontSize:'10px'}}>
T{col+1}
</div>

{[...Array(6)].map((_,row)=>
renderSlotCell('Chính thức',col*6+row+1)
)}

</div>

))}

</div>


<h2 style={{color:'#87CEEB',marginTop:'25px'}}>
DỰ BỊ / HỌC VIỆC
</h2>

<div className="team-grid">

{[...Array(30)].map((_,i)=>
renderSlotCell('Học việc',i+1)
)}

</div>


</div>

)

}

export default App
(() => {
  const $ = (id) => document.getElementById(id);
  const configReady = window.TASKNOTE_SUPABASE_URL &&
    !window.TASKNOTE_SUPABASE_URL.includes("PROJECT-REF") &&
    window.TASKNOTE_SUPABASE_ANON_KEY &&
    !window.TASKNOTE_SUPABASE_ANON_KEY.includes("PASTE_");
  const GUEST_KEY = "tasknote_guest_v1";
  const GUEST_PROFILE_KEY = "tasknote_guest_profile_v1";
  let supabaseClient, user, isGuest = false, tasks = [];
  let subjects = ["Matematika","Bahasa Indonesia","Bahasa Inggris","IPA","IPS","PPKn","PJOK","Seni Budaya","Informatika","Agama"].map(n=>({id:n,name:n}));
  let authMode = "login", currentView = "dashboard", deferredPrompt = null;
  const statusLabel = {todo:"Belum dikerjakan",doing:"Sedang dikerjakan",done:"Selesai"};
  const dateFmt = (d) => d ? new Date(String(d).length===10 ? d+"T00:00:00" : d).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) : "Tanpa deadline";
  const localDateKey = (date = new Date()) => { const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; };
  function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
  const WELCOME_BANNER_KEY = "tasknote_welcome_banner_v1";
  function applyWelcomeBanner(){
    const el=document.querySelector("#dashboardPanel .welcome-row");
    if(!el)return;
    const saved=localStorage.getItem(WELCOME_BANNER_KEY);
    el.classList.toggle("has-custom-banner",!!saved);
    if(saved)el.style.setProperty("--welcome-banner-image",'url("'+saved+'")');
    else el.style.removeProperty("--welcome-banner-image");
    $("welcomeBannerStatus").textContent=saved?"Banner tersimpan di perangkat ini.":"Gambar disimpan di perangkat dan browser ini.";
  }
  function setAuthMode(mode){authMode=mode;const signup=mode==="signup";$("authTitle").textContent=signup?"Buat akun TaskNote":"Selamat datang kembali";$("authSubtitle").textContent=signup?"Mulai catat tugas sekolahmu secara pribadi.":"Masuk untuk melihat dan mengatur tugasmu."; $("nameField").classList.toggle("hidden",!signup);$("displayName").required=signup;$("authSubmit").textContent=signup?"Buat akun":"Masuk";$("switchText").textContent=signup?"Sudah punya akun?":"Belum punya akun?";$("switchAuth").textContent=signup?"Masuk":"Daftar"}
  function showApp(show){$("authView").classList.toggle("hidden",show);$("appView").classList.toggle("hidden",!show)}
  function guestData(){try{return JSON.parse(localStorage.getItem(GUEST_KEY)||"{}")}catch(_){return {}}}
  function saveGuestData(){localStorage.setItem(GUEST_KEY,JSON.stringify({tasks,subjects}))}
  function guestProfile(){try{return JSON.parse(localStorage.getItem(GUEST_PROFILE_KEY)||"{}")}catch(_){return {}}}
  function setGuestOnlyUI(){
    document.querySelectorAll("[data-account-only]").forEach(el=>el.classList.toggle("hidden",isGuest));
    $("logoutBtn").title=isGuest?"Keluar dari mode tamu":"Keluar";
    $("logoutBtn").setAttribute("aria-label",isGuest?"Keluar dari mode tamu":"Keluar");
  }
  async function init(){
    if(configReady&&window.supabase){
      supabaseClient=window.supabase.createClient(window.TASKNOTE_SUPABASE_URL,window.TASKNOTE_SUPABASE_ANON_KEY);
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(session){user=session.user;isGuest=false;await enterApp()}
      supabaseClient.auth.onAuthStateChange(async(_event,session)=>{if(session&&!user){user=session.user;isGuest=false;await enterApp()}else if(!session&&user&&!isGuest){user=null;showApp(false)}});
    } else {
      $("authSubtitle").textContent="Masuk dengan akun atau lanjut sebagai tamu tanpa membuat akun.";
      $("authSubmit").disabled=true;$("switchAuth").disabled=true;
      $("email").disabled=true;$("password").disabled=true;
    }
    if(!user)showApp(false);
  }
  $("switchAuth").addEventListener("click",()=>setAuthMode(authMode==="login"?"signup":"login"));
  $("authForm").addEventListener("submit",async e=>{
    e.preventDefault();if(!supabaseClient)return toast("Login akun belum tersedia. Gunakan Mode Tamu.");
    const email=$("email").value.trim(),password=$("password").value;
    $("authSubmit").disabled=true;
    try{
      if(authMode==="signup"){
        const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{display_name:$("displayName").value.trim()}}});
        if(error)throw error;
        if(data.session){user=data.user;isGuest=false;await enterApp()}else toast("Pendaftaran berhasil. Periksa email untuk konfirmasi akun.");
      }else{const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;isGuest=false;await enterApp()}
    }catch(err){toast(err.message||"Autentikasi gagal.")}finally{$("authSubmit").disabled=false}
  });
  $("guestBtn").addEventListener("click",async()=>{user=null;isGuest=true;await enterApp();toast("Kamu masuk sebagai tamu. Data tersimpan di perangkat ini.")});
  async function enterApp(){
    showApp(true);setGuestOnlyUI();
    let name,email,avatar="";
    if(isGuest){
      const p=guestProfile();name=p.name||"Pengguna";email="Mode Tamu";avatar="";
      const data=guestData();tasks=Array.isArray(data.tasks)?data.tasks:[];subjects=Array.isArray(data.subjects)&&data.subjects.length?data.subjects:["Matematika","Bahasa Indonesia","Bahasa Inggris","IPA","IPS","PPKn","PJOK","Seni Budaya","Informatika","Agama"].map(n=>({id:n,name:n}));
    }else{
      const meta=user.user_metadata||{};name=meta.display_name||(user.email||"Pengguna").split("@")[0];email=user.email||"";avatar=meta.avatar_url||"";
      $("settingsName").value=meta.display_name||"";
      await loadSubjects();await loadTasks();
    }
    $("profileName").textContent=name;$("welcomeName").textContent=name;$("profileEmail").textContent=email;
    setAvatarInitial("avatarInitial",name.charAt(0).toUpperCase());setAvatarInitial("settingsAvatarInitial",name.charAt(0).toUpperCase());
    renderAvatar(avatar);if(isGuest)$("settingsName").value=name;
    $("todayLabel").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
    render();
    applyWelcomeBanner();
  }
  async function loadSubjects(){
    const {data,error}=await supabaseClient.from("subjects").select("id,name").order("name");
    if(error){toast("Gagal memuat mata pelajaran: "+error.message);return}
    subjects=(data||[]).map(x=>({id:x.id,name:x.name}));
    if(!subjects.length){
      for(const s of ["Matematika","Bahasa Indonesia","Bahasa Inggris","IPA","IPS","PPKn","PJOK","Seni Budaya","Informatika","Agama"]){const {error:ie}=await supabaseClient.from("subjects").insert({name:s,user_id:user.id});if(ie&&ie.code!=="23505")console.warn(ie)}
      const {data:again}=await supabaseClient.from("subjects").select("id,name").order("name");subjects=(again||[]).map(x=>({id:x.id,name:x.name}));
    }
    renderSubjects();
  }
  async function loadTasks(){const {data,error}=await supabaseClient.from("tasks").select("*").order("deadline",{ascending:true,nullsFirst:false}).order("created_at",{ascending:false});if(error){toast("Gagal memuat tugas: "+error.message);return}tasks=data||[]}
  function renderSubjects(){
    const opts=subjects.map(s=>'<option value="'+esc(s.name)+'"></option>').join("");
    $("subjectSuggestions").innerHTML=opts;
    $("subjectFilter").innerHTML='<option value="all">Semua pelajaran</option>'+subjects.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join("");
    $("subjectChips").innerHTML=subjects.map(s=>'<span class="chip">'+esc(s.name)+' <button data-delete-subject="'+esc(s.id)+'" aria-label="Hapus '+esc(s.name)+'">×</button></span>').join("");
  }
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function subjectName(id){return subjects.find(s=>String(s.id)===String(id))?.name||"Tanpa mata pelajaran"}
  function taskMarkup(t){
    const priority=t.priority||"medium";
    return '<article class="task-row '+(t.status==="done"?"done":"")+'"><button class="task-check '+(t.status==="done"?"checked":"")+'" data-toggle="'+esc(t.id)+'" aria-label="Ubah status">'+(t.status==="done"?"✓":"")+'</button><div class="task-main"><div class="task-title">'+esc(t.title)+'</div><div class="task-meta"><span class="pill">'+esc(subjectName(t.subject_id))+'</span><span>'+(t.deadline?"Deadline "+dateFmt(t.deadline):"Tanpa deadline")+'</span><span class="pill '+(priority==="high"?"high":"")+'">'+(priority==="high"?"Tinggi":priority==="low"?"Rendah":"Sedang")+'</span><span>'+ (statusLabel[t.status]||statusLabel.todo)+'</span></div>'+(t.description?'<div class="task-meta">'+esc(t.description)+'</div>':"")+'</div><div class="task-actions"><button class="small-action" data-edit="'+esc(t.id)+'">Edit</button><button class="small-action" data-delete="'+esc(t.id)+'">Hapus</button></div></article>';
  }
  function render(){
    const active=tasks.filter(t=>t.status!=="done"),done=tasks.filter(t=>t.status==="done");
    $("statActive").textContent=active.length;$("statTodo").textContent=tasks.filter(t=>t.status==="todo").length;$("statDone").textContent=done.length;
    const upcoming=active.slice().sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999")).slice(0,5);
    $("dashboardTasks").innerHTML=upcoming.length?upcoming.map(taskMarkup).join(""):'<div class="empty">Belum ada tugas. Tambahkan tugas pertamamu!</div>';
    renderTaskList();renderSubjects();document.querySelectorAll(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
  }
  function renderTaskList(){
    let list=tasks.slice(),today=localDateKey(),q=($("searchInput").value||"").toLowerCase(),status=$("statusFilter").value,subject=$("subjectFilter").value;
    if(currentView==="today")list=list.filter(t=>t.deadline===today&&t.status!=="done");
    if(currentView==="upcoming")list=list.filter(t=>t.deadline>today&&t.status!=="done");
    if(currentView==="completed")list=list.filter(t=>t.status==="done");
    if(status!=="all")list=list.filter(t=>t.status===status);
    if(subject!=="all")list=list.filter(t=>String(t.subject_id)===String(subject));
    if(q)list=list.filter(t=>(t.title+" "+(t.description||"")+" "+subjectName(t.subject_id)).toLowerCase().includes(q));
    $("taskList").innerHTML=list.length?list.map(taskMarkup).join(""):'<div class="empty">Tidak ada tugas yang cocok. Coba ubah filter atau tambahkan tugas baru.</div>';
  }
  function goto(view){
    currentView=view;const names={dashboard:"Ringkasan",all:"Semua Tugas",today:"Hari Ini",upcoming:"Mendatang",completed:"Tugas Selesai",settings:"Pengaturan"};
    $("pageTitle").textContent=names[view];$("listHeading").textContent=names[view]||"Semua Tugas";
    $("dashboardPanel").classList.toggle("hidden",view!=="dashboard");$("tasksPanel").classList.toggle("hidden",!["all","today","upcoming","completed"].includes(view));$("settingsPanel").classList.toggle("hidden",view!=="settings");
    render();$("sidebar").classList.remove("open");$("sidebar").style.setProperty("transform","translateX(-110%)","important");$("appView").classList.remove("menu-open");$("menuBackdrop").style.setProperty("opacity","0","important");$("menuBackdrop").style.setProperty("visibility","hidden","important");$("menuBackdrop").style.pointerEvents="none";
  }
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>goto(b.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>goto(b.dataset.goto)));
  ["searchInput","statusFilter","subjectFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderTaskList));
  function openTask(t){
    $("taskForm").reset();$("taskId").value=t?.id||"";$("dialogTitle").textContent=t?"Edit Tugas":"Tambah Tugas";
    $("taskTitle").value=t?.title||"";$("taskSubject").value=t?.subject_id?subjectName(t.subject_id):"";
    $("taskDue").value=t?.deadline?String(t.deadline).slice(0,10):"";$("taskPriority").value=t?.priority||"medium";
    $("taskStatus").value=t?.status||"todo";$("taskDescription").value=t?.description||"";$("taskDialog").showModal();
  }
  ["quickAdd","addTaskBtn"].forEach(id=>$(id).addEventListener("click",()=>openTask()));
  $("closeDialog").addEventListener("click",()=>$("taskDialog").close());$("cancelDialog").addEventListener("click",()=>$("taskDialog").close());
  async function getOrCreateSubject(name){
    const clean=name.trim();if(!clean)return null;
    const existing=subjects.find(s=>s.name.toLowerCase()===clean.toLowerCase());if(existing)return existing.id;
    if(isGuest){const item={id:clean,name:clean};subjects.push(item);saveGuestData();renderSubjects();return item.id}
    const {data,error}=await supabaseClient.from("subjects").insert({name:clean,user_id:user.id}).select("id,name").single();
    if(error)throw error;subjects.push(data);renderSubjects();return data.id;
  }
  $("taskForm").addEventListener("submit",async e=>{
    e.preventDefault();const id=$("taskId").value;
    try{
      const subjectId=await getOrCreateSubject($("taskSubject").value);
      const payload={title:$("taskTitle").value.trim(),subject_id:subjectId,deadline:$("taskDue").value||null,priority:$("taskPriority").value,status:$("taskStatus").value,description:$("taskDescription").value.trim()||null};
      if(isGuest){
        if(id){const i=tasks.findIndex(t=>String(t.id)===String(id));if(i>=0)tasks[i]={...tasks[i],...payload}}
        else tasks.push({...payload,id:(crypto.randomUUID?crypto.randomUUID():"guest-"+Date.now()),created_at:new Date().toISOString()});
        saveGuestData();
      }else{
        payload.user_id=user.id;
        const result=id?await supabaseClient.from("tasks").update(payload).eq("id",id):await supabaseClient.from("tasks").insert(payload);
        if(result.error)throw result.error;await loadSubjects();await loadTasks();
      }
      $("taskDialog").close();render();toast("Tugas berhasil disimpan.");
    }catch(err){toast("Gagal menyimpan: "+(err.message||"periksa koneksi dan izin database."))}
  });
  document.addEventListener("click",async e=>{
    const toggle=e.target.closest("[data-toggle]"),edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]"),ds=e.target.closest("[data-delete-subject]");
    try{
      if(toggle){
        const t=tasks.find(x=>String(x.id)===String(toggle.dataset.toggle));
        if(isGuest){t.status=t.status==="done"?"todo":"done";saveGuestData()}
        else{const {error}=await supabaseClient.from("tasks").update({status:t.status==="done"?"todo":"done"}).eq("id",t.id);if(error)throw error;await loadTasks()}
        render();
      }
      if(edit){const t=tasks.find(x=>String(x.id)===String(edit.dataset.edit));if(t)openTask(t)}
      if(del&&confirm("Hapus tugas ini?")){
        if(isGuest){tasks=tasks.filter(t=>String(t.id)!==String(del.dataset.delete));saveGuestData()}
        else{const {error}=await supabaseClient.from("tasks").delete().eq("id",del.dataset.delete);if(error)throw error;await loadTasks()}
        render();toast("Tugas dihapus.");
      }
      if(ds&&confirm("Hapus mata pelajaran ini? Tugas terkait akan kehilangan kategorinya.")){
        if(isGuest){subjects=subjects.filter(s=>String(s.id)!==String(ds.dataset.deleteSubject));tasks=tasks.map(t=>String(t.subject_id)===String(ds.dataset.deleteSubject)?{...t,subject_id:null}:t);saveGuestData()}
        else{const {error}=await supabaseClient.from("subjects").delete().eq("id",ds.dataset.deleteSubject);if(error)throw error;await loadSubjects();await loadTasks()}
        render();
      }
    }catch(err){toast(err.message||"Terjadi kesalahan.")}
  });
  $("addSubject").addEventListener("click",async()=>{
    const name=$("newSubject").value.trim();if(!name)return;
    if(isGuest){if(subjects.some(s=>s.name.toLowerCase()===name.toLowerCase()))return toast("Mata pelajaran sudah ada.");subjects.push({id:name,name});saveGuestData();$("newSubject").value="";renderSubjects();toast("Mata pelajaran ditambahkan.");return}
    const {error}=await supabaseClient.from("subjects").insert({name,user_id:user.id});if(error){toast(error.message);return}
    $("newSubject").value="";await loadSubjects();toast("Mata pelajaran ditambahkan.");
  });
  function setAvatarInitial(id,value){const el=$(id);if(el&&el.firstChild&&el.firstChild.nodeType===3)el.firstChild.nodeValue=value;}
  function renderAvatar(url){
    ["profileAvatarImage","settingsAvatarImage"].forEach(id=>{
      const img=$(id);if(!img)return;
      const avatar=img.parentElement;
      img.onload=()=>{img.hidden=false;img.style.display="block";avatar.classList.add("has-photo")};
      img.onerror=()=>{img.hidden=true;img.style.display="none";avatar.classList.remove("has-photo");console.warn("Foto profil gagal dimuat:",url)};
      if(url){
        img.hidden=false;img.style.display="block";img.style.visibility="visible";
        img.src=url;
        if(img.complete&&img.naturalWidth>0){avatar.classList.add("has-photo")}
      }else{
        img.onload=null;img.onerror=null;img.removeAttribute("src");img.hidden=true;img.style.display="none";avatar.classList.remove("has-photo");
      }
    });
  }
  let pendingImageCrop=null;
  const cropDialog=$("imageCropDialog"),cropPreview=$("cropPreview"),cropFrame=$("cropFrame");
  let cropState={zoom:1,x:0,y:0,pointers:new Map(),pinchDistance:0};
  function cropOverflow(){
    const rect=cropFrame.getBoundingClientRect(),img=pendingImageCrop?.img;
    if(!img)return {x:0,y:0};
    const scale=Math.max(rect.width/img.naturalWidth,rect.height/img.naturalHeight);
    return {x:Math.max(0,(img.naturalWidth*scale*cropState.zoom-rect.width)/2),y:Math.max(0,(img.naturalHeight*scale*cropState.zoom-rect.height)/2)};
  }
  function updateCropPreview(){
    const overflow=cropOverflow();
    cropPreview.style.transform="translate("+(-cropState.x*overflow.x)+"px,"+(-cropState.y*overflow.y)+"px) scale("+cropState.zoom+")";
    $("cropZoom").value=String(cropState.zoom);
  }
  $("cropZoom").addEventListener("input",()=>{cropState.zoom=Number($("cropZoom").value);updateCropPreview()});
  const pointerDistance=points=>{const p=[...points.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)};
  cropFrame.addEventListener("pointerdown",e=>{
    if(!pendingImageCrop)return;
    cropFrame.setPointerCapture(e.pointerId);cropState.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(cropState.pointers.size===2)cropState.pinchDistance=pointerDistance(cropState.pointers);
    cropFrame.classList.add("is-dragging");e.preventDefault();
  });
  cropFrame.addEventListener("pointermove",e=>{
    if(!cropState.pointers.has(e.pointerId))return;
    const previous=cropState.pointers.get(e.pointerId),dx=e.clientX-previous.x,dy=e.clientY-previous.y;
    cropState.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(cropState.pointers.size>=2){
      const distance=pointerDistance(cropState.pointers);
      if(cropState.pinchDistance>0&&distance>0)cropState.zoom=Math.max(1,Math.min(3,cropState.zoom*distance/cropState.pinchDistance));
      cropState.pinchDistance=distance;
    }else{
      const overflow=cropOverflow();
      if(overflow.x)cropState.x=Math.max(-1,Math.min(1,cropState.x-dx/overflow.x));
      if(overflow.y)cropState.y=Math.max(-1,Math.min(1,cropState.y-dy/overflow.y));
    }
    updateCropPreview();e.preventDefault();
  });
  function endCropPointer(e){
    cropState.pointers.delete(e.pointerId);cropState.pinchDistance=pointerDistance(cropState.pointers);
    if(!cropState.pointers.size)cropFrame.classList.remove("is-dragging");
  }
  cropFrame.addEventListener("pointerup",endCropPointer);cropFrame.addEventListener("pointercancel",endCropPointer);
  function openImageCrop(file,type){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onerror=()=>reject(Error("Gambar gagal dibaca."));
      reader.onload=()=>{const img=new Image();img.onerror=()=>reject(Error("Gambar tidak valid."));img.onload=()=>{
        pendingImageCrop={file,type,img};cropState={zoom:1,x:0,y:0,pointers:new Map(),pinchDistance:0};
        $("cropTitle").textContent=type==="profile"?"Pangkas foto profil":"Pangkas banner sambutan";
        $("cropHelp").textContent="Geser gambar untuk mengatur potongan. Cubit dengan dua jari untuk memperbesar.";
        cropFrame.classList.toggle("banner-crop",type==="banner");cropPreview.src=reader.result;
        $("cropZoom").value=1;cropDialog.showModal();requestAnimationFrame(updateCropPreview);resolve(true);
      };img.src=reader.result};reader.readAsDataURL(file);
    });
  }
  function cancelImageCrop(){pendingImageCrop=null;if(cropDialog.open)cropDialog.close()}
  $("cancelCrop").addEventListener("click",cancelImageCrop);$("cancelCropBtn").addEventListener("click",cancelImageCrop);
  function makeCroppedBlob(){
    const {img,type}=pendingImageCrop,targetRatio=type==="profile"?1:1600/620;
    let sw=img.width,sh=img.height;
    if(sw/sh>targetRatio)sw=sh*targetRatio;else sh=sw/targetRatio;
    const zoom=cropState.zoom;sw/=zoom;sh/=zoom;
    const maxX=img.width-sw,maxY=img.height-sh;
    const sx=Math.max(0,Math.min(maxX,maxX/2-cropState.x*(maxX/2)));
    const sy=Math.max(0,Math.min(maxY,maxY/2-cropState.y*(maxY/2)));
    const canvas=document.createElement("canvas");canvas.width=type==="profile"?800:1600;canvas.height=type==="profile"?800:620;
    canvas.getContext("2d").drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error("Gagal memproses crop gambar.")),"image/jpeg",.88));
  }
  $("confirmCrop").addEventListener("click",async()=>{
    if(!pendingImageCrop)return;
    const {type}=pendingImageCrop,button=$("confirmCrop");button.disabled=true;button.textContent="Memproses…";
    try{
      const blob=await makeCroppedBlob();cropDialog.close();pendingImageCrop=null;
      if(type==="banner"){
        const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error("Gambar gagal dibaca."));reader.readAsDataURL(blob)});
        localStorage.setItem(WELCOME_BANNER_KEY,dataUrl);applyWelcomeBanner();toast("Banner berhasil dipasang.");
      }else{
        const status=$("avatarUploadStatus"),picker=$("avatarFile");status.textContent="Mengunggah foto profil…";picker.disabled=true;
        try{
          const path=user.id+"/profile-"+Date.now()+".jpg";
          const {error:uploadError}=await supabaseClient.storage.from("avatars").upload(path,blob,{upsert:false,contentType:"image/jpeg",cacheControl:"3600"});if(uploadError)throw uploadError;
          const {data:publicData}=supabaseClient.storage.from("avatars").getPublicUrl(path),avatarUrl=publicData.publicUrl;
          const {data:updateData,error:updateError}=await supabaseClient.auth.updateUser({data:{avatar_url:avatarUrl}});if(updateError)throw updateError;
          user=updateData.user||user;renderAvatar(avatarUrl);status.textContent="Foto profil berhasil diperbarui.";toast("Foto profil tersimpan.");
        }catch(err){status.textContent="Foto belum berhasil disimpan.";toast(err.message||"Gagal mengunggah foto.")}finally{picker.disabled=false}
      }
    }catch(err){toast(err.message||"Gagal memproses gambar.")}
    finally{button.disabled=false;button.textContent="Gunakan gambar"}
  });
  $("avatarFile").addEventListener("change",async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    if(isGuest){toast("Foto profil tersedia setelah login.");e.target.value="";return}
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast("Pilih foto JPG, PNG, atau WebP.");e.target.value="";return}
    if(file.size>2*1024*1024){toast("Ukuran foto maksimal 2 MB.");e.target.value="";return}
    try{await openImageCrop(file,"profile")}catch(err){toast(err.message||"Gagal membuka crop foto.")}finally{e.target.value=""}
  });
  $("welcomeBannerFile").addEventListener("change",async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast("Pilih gambar JPG, PNG, atau WebP.");e.target.value="";return}
    if(file.size>8*1024*1024){toast("Ukuran gambar maksimal 8 MB.");e.target.value="";return}
    try{await openImageCrop(file,"banner")}catch(err){toast(err.message||"Gagal membuka crop banner.")}finally{e.target.value=""}
  });
  $("removeWelcomeBanner").addEventListener("click",()=>{localStorage.removeItem(WELCOME_BANNER_KEY);applyWelcomeBanner();toast("Banner sambutan dihapus.")});
  $("saveProfile").addEventListener("click",async()=>{
    const name=$("settingsName").value.trim();if(!name)return toast("Nama tidak boleh kosong.");
    if(isGuest){localStorage.setItem(GUEST_PROFILE_KEY,JSON.stringify({name}));$("profileName").textContent=name;$("welcomeName").textContent=name;setAvatarInitial("avatarInitial",name[0].toUpperCase());setAvatarInitial("settingsAvatarInitial",name[0].toUpperCase());return toast("Nama profil tamu diperbarui.")}
    const {error}=await supabaseClient.auth.updateUser({data:{display_name:name}});if(error)return toast(error.message);
    $("profileName").textContent=name;$("welcomeName").textContent=name;setAvatarInitial("avatarInitial",name[0].toUpperCase());setAvatarInitial("settingsAvatarInitial",name[0].toUpperCase());toast("Profil diperbarui.");
  });
  $("changePassword").addEventListener("click",async()=>{if(isGuest)return;const password=$("newPassword").value;if(password.length<6)return toast("Password minimal 6 karakter.");const {error}=await supabaseClient.auth.updateUser({password});if(error)return toast(error.message);$("newPassword").value="";toast("Password berhasil diubah.")});
  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),tasks,subjects},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="tasknote-backup.json";a.click();URL.revokeObjectURL(a.href);
  });
  $("importFile").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      const data=JSON.parse(await file.text());if(!Array.isArray(data.tasks))throw Error("Format backup tidak valid.");
      if(!confirm("Impor "+data.tasks.length+" tugas? Tugas yang ada tidak akan dihapus."))return;
      if(isGuest){
        for(const t of data.tasks){tasks.push({id:(crypto.randomUUID?crypto.randomUUID():"guest-"+Date.now()+"-"+Math.random()),title:String(t.title||"Tugas impor").slice(0,120),description:t.description||null,deadline:t.deadline||null,priority:["low","medium","high"].includes(t.priority)?t.priority:"medium",status:["todo","doing","done"].includes(t.status)?t.status:"todo",subject_id:null,created_at:new Date().toISOString()})}
        saveGuestData();
      }else{
        for(const t of data.tasks){const row={user_id:user.id,title:String(t.title||"Tugas impor").slice(0,120),description:t.description||null,deadline:t.deadline||null,priority:["low","medium","high"].includes(t.priority)?t.priority:"medium",status:["todo","doing","done"].includes(t.status)?t.status:"todo",subject_id:null};const {error}=await supabaseClient.from("tasks").insert(row);if(error)throw error}
        await loadTasks();
      }
      render();toast("Backup berhasil diimpor.");
    }catch(err){toast(err.message||"Gagal membaca backup.")}finally{e.target.value=""}
  });
  async function logout(){
    if(isGuest){isGuest=false;tasks=[];showApp(false);setAuthMode("login");toast("Kamu keluar dari Mode Tamu.");return}
    await supabaseClient.auth.signOut();user=null;showApp(false);toast("Kamu telah keluar.");
  }
  $("logoutBtn").addEventListener("click",logout);
  function toggleTheme(){document.body.classList.toggle("dark");localStorage.setItem("tasknote-theme",document.body.classList.contains("dark")?"dark":"light")}
  if(localStorage.getItem("tasknote-theme")==="dark")document.body.classList.add("dark");
  $("themeToggle").addEventListener("click",toggleTheme);$("settingsTheme").addEventListener("click",toggleTheme);
  // Force the navigation into a real off-canvas drawer independent of stylesheet cache.
  const drawer=$("sidebar"), backdrop=$("menuBackdrop"), menuButton=$("menuToggle");
  const forceStyle=(el,styles)=>Object.entries(styles).forEach(([k,v])=>el.style.setProperty(k,v,"important"));
  forceStyle(drawer,{position:"fixed",top:"0",left:"0",right:"auto",bottom:"0",width:"min(270px,86vw)",height:"100vh",display:"flex","flex-direction":"column","flex-wrap":"nowrap","align-items":"stretch",transform:"translateX(-110%)", "z-index":"100", "overflow-y":"auto",background:"var(--surface)"});
  forceStyle(drawer.querySelector(".brand-link"),{width:"auto",margin:"0 0 28px"});
  drawer.querySelectorAll(".nav-item").forEach(el=>forceStyle(el,{width:"100%","justify-content":"flex-start","flex-shrink":"0"}));
  forceStyle(drawer.querySelector(".side-bottom"),{width:"100%",display:"flex","flex-direction":"column","align-items":"stretch","margin-top":"auto"});
  forceStyle(backdrop,{position:"fixed",inset:"0",display:"block","z-index":"99",opacity:"0",visibility:"hidden","pointer-events":"none",background:"rgba(15,24,40,.42)"});
  forceStyle(menuButton,{display:"inline-grid",visibility:"visible","place-items":"center"});
  const setDrawer=(open)=>{drawer.style.setProperty("transform",open?"translateX(0)":"translateX(-110%)","important");backdrop.style.setProperty("opacity",open?"1":"0","important");backdrop.style.setProperty("visibility",open?"visible":"hidden","important");backdrop.style.pointerEvents=open?"auto":"none";$("appView").classList.toggle("menu-open",open);menuButton.setAttribute("aria-expanded",open?"true":"false");};
  const toggleMenu=()=>setDrawer(!$("appView").classList.contains("menu-open"));
  $("menuToggle").addEventListener("click",toggleMenu);
  $("menuBackdrop").addEventListener("click",toggleMenu);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("appView").classList.contains("menu-open"))setDrawer(false);});
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
  $("installBtn").addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").classList.add("hidden")});
  if("serviceWorker" in navigator&&location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(console.warn));
  init();
})();
const db = supabase.createClient('https://hqrheypbdvhwpnwdoqka.supabase.co', 'sb_publishable_-YVy92hAZ_-IpNJOJTX_Sg_kQVd5_ZI');
const $ = (selector) => document.querySelector(selector);
const today = new Date().toISOString().slice(0, 10);
let records = [];
let profile;
let importedRows = [];
let users = [];

document.head.insertAdjacentHTML('beforeend', '<style>body{background:radial-gradient(circle at 85% 0,#dbeafe 0,#f7faff 34%,#eef4f9 75%)}.app{max-width:1240px;padding:25px}.top{background:linear-gradient(120deg,#0b1f3a,#174f9e);border-radius:20px;padding:20px 22px;color:#fff;box-shadow:0 14px 35px #0f2a4d35}.top .sub{color:#dbeafe}.top .actions{margin:0}.tabs{padding:7px;background:#fff;border:1px solid #dbeafe;border-radius:14px;box-shadow:0 7px 20px #163a5f0b}.tabs button{border:0;font-weight:700}.tabs button.active,.primary{background:linear-gradient(135deg,#2563eb,#123b8b);box-shadow:0 6px 14px #2563eb33}.outline:hover{background:#eff6ff}.card,.panel,.case{border-color:#dbe5f0;border-radius:16px;box-shadow:0 9px 28px #163a5f0c}.card{background:linear-gradient(145deg,#fff,#f7fbff)}.card b{font-size:29px}.table-wrap{border:1px solid #e8eef5;border-radius:12px}th{background:#f8fafc}input:focus,select:focus,textarea:focus{outline:0;border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.danger{background:#fff1f2!important;color:#b42338!important;border-color:#fecdd3!important}@media(max-width:760px){.app{padding:12px}.top{padding:17px}.tabs{position:sticky;top:6px;z-index:2;overflow:auto;flex-wrap:nowrap}.tabs button{white-space:nowrap}.actions button,.actions select{width:100%}}</style>');
document.querySelector('.top').insertAdjacentHTML('beforeend', '<div class="actions" style="margin:0"><button class="outline" id="notifications">🔔 Bildirimleri aç</button><button class="outline" id="install">Uygulamayı yükle</button></div>');
document.querySelector('.top > #install')?.remove();
document.querySelector('#bulk .notice').innerHTML = 'Güncel Excel şablonu sütunları: <b>Atama Ayı, Servis/Föy No, Müşteri No, Borçlu Adı, Borçlu Türü, İcra Dairesi, İcra Dosya No, Açık Risk, Telefonlar, Kriter, Plakalar, Adres</b>. Keşif tarihi panelden seçilir.';
document.body.insertAdjacentHTML('afterbegin', '<div id="auth" style="position:fixed;inset:0;z-index:5;background:#102a43ee;display:grid;place-items:center;padding:18px"><form id="authForm" class="panel" style="width:min(420px,100%);background:white"><h2>MVC Keşif Girişi</h2><p class="muted">Hesaplar yalnızca yönetici tarafından oluşturulur.</p><label>E-posta<input name="email" type="email" required></label><br><label>Şifre<input name="password" type="password" minlength="8" required></label><div class="actions"><button class="primary">Giriş yap</button></div><p id="authMsg" class="muted"></p></form></div>');
$('#report').insertAdjacentHTML('beforeend', '<label>Araç / adres tespiti<select name="vehicleCheck"><option>Araç adreste bulundu</option><option>Araçlar adreste bulundu</option><option>Araç bulunamadı</option></select></label><label>Adres teyidi<select name="locationCheck"><option>Adres komşudan teyit edildi</option><option>Adres muhtardan teyit edildi</option><option>Adres teyit edilemedi</option></select></label><label>Ödeme durumu<select name="paymentStatus"><option>Ödeme yapma durumu yok</option><option>Ödeme yaptı</option><option>Ödeme yapacak</option><option>Fiili hacze gelinsin</option></select></label><label>Ödeme tutarı (₺)<input name="paymentAmount" type="number" min="0" step="0.01" value="0"></label><label>Ödeme sözü tarihi<input name="promiseDate" type="date"></label>');

const esc = (value) => String(value ?? '—').replace(/[&<>]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
const pill = (status) => `<span class="pill ${status === 'Tamamlandı' ? 'done' : status === 'Tekrar keşif' ? 'retry' : ''}">${esc(status)}</span>`;
function switchView(view) {
  document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
  $(`#${view}`).classList.add('active');
  document.querySelectorAll('[data-view]').forEach((el) => el.classList.toggle('active', el.dataset.view === view));
  if (view === 'dashboard') dashboard();
  if (view === 'tasks') tasks();
}
function dashboard() {
  $('#total').textContent = records.length;
  $('#today').textContent = records.filter((x) => x.date === today).length;
  $('#done').textContent = records.filter((x) => x.status === 'Tamamlandı').length;
  $('#retry').textContent = records.filter((x) => x.status === 'Tekrar keşif').length;
  $('#upcoming').innerHTML = records.slice(0, 6).map((x) => `<div class="case"><div><span class="label">${x.date} · ${esc(x.office)}</span><h3>${esc(x.number)} · ${esc(x.debtor)}</h3><p>${esc(x.address)}</p></div>${pill(x.status)}</div>`).join('') || '<div class="empty">Henüz görev yok.</div>';
}
function tasks() {
  const date = $('#taskDate').value || today;
  $('#taskDate').value = date;
  const list = records.filter((x) => x.date === date);
  const admin = profile?.role === 'yonetici';
  const options = users.map((user) => `<option value="${user.id}">${esc(user.full_name)} (${esc(user.role)})</option>`).join('');
  const bulk = admin && list.length ? `<div class="notice actions"><label>Seçili dosyaları personele ata<select id="bulkAssignPerson">${options}</select></label><button class="primary" onclick="assignSelected()">Seçilenleri ata</button><button class="outline" onclick="selectAllTasks()">Tümünü seç</button><button class="outline danger" onclick="deleteSelected()">Seçilenleri sil</button></div>` : '';
  $('#taskList').innerHTML = list.length ? `${bulk}<div class="table-wrap"><table><thead><tr>${admin ? '<th><input type="checkbox" id="selectAll"></th>' : ''}<th>İcra Dairesi</th><th>Dosya No</th><th>Borçlu Ünvanı</th><th>Bakiye</th><th>Service ID</th><th>Müşteri No</th><th>Adres</th><th>Plakalar</th><th>İşlem</th></tr></thead><tbody>${list.map((x) => `<tr>${admin ? `<td><input class="taskSelect" type="checkbox" value="${x.id}"></td>` : ''}<td>${esc(x.office)}</td><td>${esc(x.number)}</td><td>${esc(x.debtor)}</td><td>${esc(x.balance)}</td><td>${esc(x.serviceId)}</td><td>${esc(x.customerNo)}</td><td>${esc(x.address)}</td><td>${esc(x.plates)}</td><td class="actions"><button class="primary" onclick="detail('${x.id}')">Keşfe başla</button>${admin ? `<select id="assign-${x.id}">${users.map((user) => `<option value="${user.id}" ${user.id === x.assignee ? 'selected' : ''}>${esc(user.full_name)}</option>`).join('')}</select><button class="outline" onclick="assignOne('${x.id}')">Personele ilet</button><button class="outline" onclick="deleteFile('${x.id}')">Sil</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Bu tarih için atanan keşif dosyası yok.</div>';
  $('#selectAll') && ($('#selectAll').onchange = (event) => document.querySelectorAll('.taskSelect').forEach((box) => box.checked = event.target.checked));
}
function detail(id) {
  const x = records.find((row) => row.id === id);
  $('#dDate').textContent = `${x.date} · ${x.office}`;
  $('#dTitle').textContent = `${x.number} · ${x.debtor}`;
  $('#dAddress').textContent = x.address;
  $('#detailInfo').innerHTML = [['Bakiye', x.balance], ['Service ID', x.serviceId], ['Müşteri No', x.customerNo], ['Plakalar', x.plates]].map((row) => `<tr><th>${row[0]}</th><td>${esc(row[1])}</td></tr>`).join('');
  $('#report [name=id]').value = id;
  switchView('detail');
}
window.detail = detail;
async function assignFiles(ids, personId) {
  if (!ids.length || !personId) return alert('Dosya ve personel seçin.');
  const { error } = await db.from('kesif_dosyalari').update({ atanan_personel:personId }).in('id', ids);
  if (error) return alert(error.message);
  await load();
  alert(`${ids.length} dosya personele iletildi.`);
}
async function assignOne(id) { await assignFiles([id], $(`#assign-${id}`).value); }
async function assignSelected() {
  const ids = [...document.querySelectorAll('.taskSelect:checked')].map((box) => box.value);
  await assignFiles(ids, $('#bulkAssignPerson').value);
}
function selectAllTasks() {
  document.querySelectorAll('.taskSelect').forEach((box) => box.checked = true);
  const all = $('#selectAll'); if (all) all.checked = true;
}
async function deleteFile(id) {
  const item = records.find((row) => row.id === id);
  if (!confirm(`${item.number} numaralı dosya silinsin mi?`)) return;
  const { error } = await db.from('kesif_dosyalari').delete().eq('id', id);
  if (error) return alert(error.message);
  await load();
  alert('Dosya silindi.');
}
async function deleteSelected() {
  const ids = [...document.querySelectorAll('.taskSelect:checked')].map((box) => box.value);
  if (!ids.length) return alert('Silmek istediğiniz dosyaları seçin.');
  if (!confirm(`${ids.length} dosya kalıcı olarak silinsin mi?`)) return;
  const { error } = await db.from('kesif_dosyalari').delete().in('id', ids);
  if (error) return alert(error.message);
  await load();
  alert(`${ids.length} dosya silindi.`);
}
window.assignOne = assignOne;
window.assignSelected = assignSelected;
window.selectAllTasks = selectAllTasks;
window.deleteFile = deleteFile;
window.deleteSelected = deleteSelected;
async function load() {
  const { data, error } = await db.from('kesif_dosyalari').select('*').order('kesif_tarihi');
  if (error) return alert(error.message);
  records = data.map((x) => ({ id:x.id, date:x.kesif_tarihi, office:x.icra_dairesi, number:x.dosya_no, debtor:x.borclu_unvani, balance:x.bakiye, serviceId:x.service_id, customerNo:x.musteri_no, address:x.adres, plates:x.plakalar, status:x.durum, assignee:x.atanan_personel }));
  dashboard(); tasks();
}
async function loadUsers() {
  const { data, error } = await db.from('profiles').select('id,full_name,role,created_at').order('full_name');
  if (error) return alert(error.message);
  users = data;
  const options = data.map((x) => `<option value="${x.id}">${esc(x.full_name)} (${x.role})</option>`).join('');
  $('[name=assignee]').outerHTML = `<select name="assignee">${options}</select>`;
  $('#bulkPerson').innerHTML = options;
  $('#bulkDate').value = today;
  $('#userList').innerHTML = `<table><thead><tr><th>Ad</th><th>Rol</th><th>Oluşturulma</th></tr></thead><tbody>${data.map((x) => `<tr><td>${esc(x.full_name)}</td><td>${esc(x.role)}</td><td>${new Date(x.created_at).toLocaleDateString('tr-TR')}</td></tr>`).join('')}</tbody></table>`;
}
async function ready(session) {
  const { data, error } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) return $('#authMsg').textContent = error.message;
  profile = data; $('#auth').remove();
  if (profile.role !== 'yonetici') document.querySelectorAll('[data-view="add"],[data-view="bulk"],[data-view="users"],[data-go="add"],[data-go="bulk"]').forEach((el) => el.style.display = 'none');
  else await loadUsers();
  await load();
}

$('#authForm').onsubmit = async (event) => { event.preventDefault(); const result = await db.auth.signInWithPassword(Object.fromEntries(new FormData(event.target))); if (result.error) return $('#authMsg').textContent = result.error.message; ready(result.data.session); };
document.querySelectorAll('[data-view]').forEach((el) => el.onclick = () => { switchView(el.dataset.view); if (el.dataset.view === 'users') loadUsers(); });
document.querySelectorAll('[data-go]').forEach((el) => el.onclick = () => switchView(el.dataset.go));
$('#taskDate').onchange = tasks;
$('#userForm').onsubmit = async (event) => { event.preventDefault(); const result = await db.functions.invoke('create-user', { body:Object.fromEntries(new FormData(event.target)) }); if (result.error) return alert(result.error.message); event.target.reset(); await loadUsers(); alert('Kullanıcı oluşturuldu.'); };
$('#addForm').onsubmit = async (event) => { event.preventDefault(); if (profile.role !== 'yonetici') return; const d = Object.fromEntries(new FormData(event.target)); const result = await db.from('kesif_dosyalari').insert({ kesif_tarihi:d.date, icra_dairesi:d.office, dosya_no:d.number, borclu_unvani:d.debtor, bakiye:d.balance || null, service_id:d.serviceId, musteri_no:d.customerNo, adres:d.address, plakalar:d.plates, atanan_personel:d.assignee }); if (result.error) return alert(result.error.message); event.target.reset(); await load(); switchView('tasks'); };
$('#report').onsubmit = async (event) => { event.preventDefault(); const d = Object.fromEntries(new FormData(event.target)); const status = d.status === 'Bulunamadı' ? 'Tekrar keşif' : 'Tamamlandı'; const [a, b] = await Promise.all([db.from('kesif_dosyalari').update({ durum:status }).eq('id', d.id), db.from('kesif_sonuclari').upsert({ dosya_id:d.id, adres_sonucu:d.status, mal_tespiti:d.asset, arac_durumu:d.vehicleCheck, adres_teyidi:d.locationCheck, odeme_durumu:d.paymentStatus, odeme_tutari:Number(d.paymentAmount || 0), odeme_sozu_tarihi:d.promiseDate || null, notlar:d.note })]); if (a.error || b.error) return alert((a.error || b.error).message); const item = records.find((row) => row.id === d.id); await load(); await notify('Keşif sonucu kaydedildi', `${item?.number || 'Dosya'} · ${d.status}`); switchView('tasks'); };

let serviceWorkerRegistration;
async function enableNotifications() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return alert('Bu cihaz tarayıcı bildirimi desteklemiyor. Uygulamayı güncel Chrome veya Safari ile açın.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return alert('Bildirim izni verilmedi. Tarayıcı ayarlarından MVC Keşif için bildirim izni açabilirsiniz.');
  serviceWorkerRegistration = await navigator.serviceWorker.ready;
  $('#notifications').textContent = '🔔 Bildirimler açık';
  alert('Bu cihaz için bildirimler açıldı.');
}
async function notify(title, body) {
  if (Notification.permission !== 'granted') return;
  const registration = serviceWorkerRegistration || await navigator.serviceWorker.ready;
  registration.showNotification(title, { body, icon:'../assets/mvc_icon.png', badge:'../assets/mvc_icon.png', tag:'mvc-kesif' });
}
$('#notifications').onclick = enableNotifications;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').then((registration) => { serviceWorkerRegistration = registration; if (Notification.permission === 'granted') $('#notifications').textContent = '🔔 Bildirimler açık'; }).catch(() => {});

function normal(value) { return String(value ?? '').toLocaleLowerCase('tr-TR').replaceAll('ı','i').replaceAll('ş','s').replaceAll('ğ','g').replaceAll('ü','u').replaceAll('ö','o').replaceAll('ç','c').replace(/[^a-z0-9]/g, ''); }
function valueOf(row, names) { const key = Object.keys(row).find((name) => names.includes(normal(name))); return key ? row[key] : ''; }
function toIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  const text = String(value ?? '').trim();
  if (!text) return '';
  const tr = text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  return tr ? `${tr[3]}-${tr[2].padStart(2,'0')}-${tr[1].padStart(2,'0')}` : (/^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '');
}
function parseBalance(value) {
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return null;
  if (text.includes(',') && text.includes('.')) return text.replaceAll('.', '').replace(',', '.');
  return text.replace(',', '.');
}
function csvRows(text) {
  const rows = []; let current = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) { const char = text[i]; if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; } else if (!quoted && (char === ',' || char === ';')) { current.push(cell.trim()); cell = ''; } else if (!quoted && (char === '\n' || char === '\r')) { if (char === '\r' && text[i + 1] === '\n') i += 1; current.push(cell.trim()); if (current.some(Boolean)) rows.push(current); current = []; cell = ''; } else cell += char; }
  current.push(cell.trim()); if (current.some(Boolean)) rows.push(current); return rows;
}
function rowsFromCsv(text) { const rows = csvRows(text); if (rows.length < 2) return []; const headers = rows[0]; return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))); }
function prepareItems(rows, defaultDate, assignee) {
  const invalid = []; const items = [];
  rows.forEach((row, index) => {
    const debtor = valueOf(row, ['adiunvani','borcluunvani','borcluadi','borclu','unvan']);
    const customerNo = valueOf(row, ['musterino','musterinumara']);
    const office = valueOf(row, ['icradairesi']); const number = valueOf(row, ['dosyano','icradosyano']);
    const balance = valueOf(row, ['bakiye','acikrisk']); const serviceId = valueOf(row, ['servisdosyaid','serviceid','servisid','servisfoyno']);
    const address = valueOf(row, ['adres']); const plates = valueOf(row, ['aracplakalari','plakalar','aracplaka']);
    const date = toIsoDate(valueOf(row, ['kesiftarihi'])) || defaultDate;
    if (!debtor || !office || !number || !address || !date) { invalid.push(index + 2); return; }
    items.push({ kesif_tarihi:date, icra_dairesi:office, dosya_no:number, borclu_unvani:debtor, bakiye:parseBalance(balance), service_id:serviceId || null, musteri_no:customerNo || null, adres:address, plakalar:plates || null, atanan_personel:assignee });
  });
  return { items, invalid };
}
$('#xlsxFile').onchange = async (event) => {
  const file = event.target.files[0]; if (!file) return;
  try { const workbook = XLSX.read(await file.arrayBuffer(), { type:'array', cellDates:true }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; importedRows = XLSX.utils.sheet_to_json(sheet, { defval:'', raw:false, dateNF:'yyyy-mm-dd' }); $('#csv').value = XLSX.utils.sheet_to_csv(sheet); $('#importInfo')?.remove(); $('#xlsxFile').insertAdjacentHTML('afterend', `<p id="importInfo" class="notice">${importedRows.length} satır şablondan okundu. "CSV’den içe aktar" düğmesiyle yükleyebilirsiniz.</p>`); } catch (error) { importedRows = []; alert(`Excel okunamadı: ${error.message}`); }
};
$('#import').onclick = async () => {
  if (profile?.role !== 'yonetici') return alert('Toplu ekleme yalnızca yöneticiler içindir.');
  const assignee = $('#bulkPerson').value; const defaultDate = $('#bulkDate').value;
  if (!assignee) return alert('Atanan personeli seçin.');
  const rows = importedRows.length ? importedRows : rowsFromCsv($('#csv').value.trim());
  if (!rows.length) return alert('Önce örnek şablon Excel dosyasını seçin veya CSV verisini yapıştırın.');
  const { items, invalid } = prepareItems(rows, defaultDate, assignee);
  if (!items.length) return alert('Geçerli satır bulunamadı. Dosya No, Borçlu Ünvanı, İcra Dairesi, Adres ve Keşif Tarihi alanlarını kontrol edin.');
  const { error } = await db.from('kesif_dosyalari').insert(items);
  if (error) return alert(error.message);
  importedRows = []; $('#csv').value = ''; $('#xlsxFile').value = ''; $('#importInfo')?.remove(); await load(); switchView('tasks'); alert(`${items.length} dosya başarıyla atandı.${invalid.length ? ` ${invalid.length} eksik satır atlandı.` : ''}`);
};
$('#downloadTemplate').onclick = () => { const link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,Atama Ayı,Servis/Föy No,Müşteri No,Borçlu Adı,Borçlu Türü,İcra Dairesi,İcra Dosya No,Açık Risk,Telefonlar,Kriter,Plakalar,Adres%0A2026-09,15301889351805,1110563624,Örnek Firma,Tüzel kişi,İstanbul 8. İcra Dairesi,2026/35058,20272.48,05321234567,İstanbul 8. İcra Dairesi-2026/35058,34 ABC 123,Başakşehir İstanbul'; link.download = 'kesif-guncel-sablon.csv'; link.click(); };

document.querySelector('.tabs').insertAdjacentHTML('beforeend', '<button data-view="reports" id="reportTab">Raporlar</button>');
document.querySelector('.app').insertAdjacentHTML('beforeend', '<section id="reports" class="view"><div class="panel"><h2>Ödeme raporları</h2><div class="cards"><div class="card"><span class="label">Bugün</span><b id="payDay">₺0</b></div><div class="card"><span class="label">Bu hafta</span><b id="payWeek">₺0</b></div><div class="card"><span class="label">Bu ay</span><b id="payMonth">₺0</b></div></div><div id="resultSummary" class="notice"></div></div></section>');
$('#reportTab').onclick = async () => { switchView('reports'); const { data, error } = await db.from('kesif_sonuclari').select('odeme_tutari,completed_at,adres_sonucu'); if (error) return alert(error.message); const now = new Date(); const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const week = new Date(day); week.setDate(day.getDate() - ((day.getDay() + 6) % 7)); const month = new Date(now.getFullYear(), now.getMonth(), 1); const sum = (from) => data.filter((x) => new Date(x.completed_at) >= from).reduce((n, x) => n + Number(x.odeme_tutari || 0), 0); const fmt = (n) => new Intl.NumberFormat('tr-TR', { style:'currency', currency:'TRY' }).format(n); $('#payDay').textContent = fmt(sum(day)); $('#payWeek').textContent = fmt(sum(week)); $('#payMonth').textContent = fmt(sum(month)); const groups = data.reduce((a, x) => { const key = x.adres_sonucu || 'Sonuç yok'; a[key] = (a[key] || 0) + 1; return a; }, {}); $('#resultSummary').textContent = `Sonuç dağılımı: ${Object.entries(groups).map(([key, value]) => `${key}: ${value}`).join(' · ')}`; };
(async () => { const { data:{ session } } = await db.auth.getSession(); if (session) ready(session); })();

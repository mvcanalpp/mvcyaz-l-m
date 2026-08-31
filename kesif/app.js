const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const seed = [
  { id: 1, date: today, office: 'İstanbul 3. İcra Dairesi', number: '2026/1234', debtor: 'Mehmet Kaya', balance: '125.000 ₺', serviceId: 'SRV-18', customerNo: 'M-442', address: 'Kadıköy, İstanbul', plates: '34 ABC 123', assignee: 'Ahmet Yılmaz', status: 'Bekliyor' },
  { id: 2, date: tomorrow, office: 'Üsküdar İcra Dairesi', number: '2026/1456', debtor: 'Yıldız Ticaret Ltd.', balance: '78.500 ₺', serviceId: 'SRV-21', customerNo: 'M-651', address: 'Üsküdar, İstanbul', plates: '', assignee: 'Ahmet Yılmaz', status: 'Bekliyor' }
];
let records = JSON.parse(localStorage.getItem('mvc-kesif-v2') || 'null') || seed;
const $ = selector => document.querySelector(selector);
const save = () => localStorage.setItem('mvc-kesif-v2', JSON.stringify(records));
const esc = value => String(value || '—').replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
const pill = status => `<span class="pill ${status === 'Tamamlandı' ? 'done' : status === 'Tekrar keşif' ? 'retry' : ''}">${esc(status)}</span>`;

function go(view) {
  document.querySelectorAll('.view').forEach(item => item.classList.remove('active'));
  $(`#${view}`).classList.add('active');
  document.querySelectorAll('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  if (view === 'dashboard') dashboard();
  if (view === 'tasks') tasks();
}

function dashboard() {
  $('#total').textContent = records.length;
  $('#today').textContent = records.filter(item => item.date === today).length;
  $('#done').textContent = records.filter(item => item.status === 'Tamamlandı').length;
  $('#retry').textContent = records.filter(item => item.status === 'Tekrar keşif').length;
  $('#upcoming').innerHTML = records.slice().sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(item => `<div class="case"><div><span class="label">${item.date} · ${esc(item.office)}</span><h3>${esc(item.number)} · ${esc(item.debtor)}</h3><p>${esc(item.address)} · ${esc(item.assignee)}</p></div>${pill(item.status)}</div>`).join('');
}

function tasks() {
  const date = $('#taskDate').value || today;
  $('#taskDate').value = date;
  const list = records.filter(item => item.date === date);
  $('#taskList').innerHTML = list.length ? `<div class="table-wrap"><table><thead><tr><th>İcra Dairesi</th><th>Dosya No</th><th>Borçlu Ünvanı</th><th>Bakiye</th><th>Service ID</th><th>Müşteri No</th><th>Adres</th><th>Plakalar</th><th></th></tr></thead><tbody>${list.map(item => `<tr><td>${esc(item.office)}</td><td>${esc(item.number)}</td><td>${esc(item.debtor)}</td><td>${esc(item.balance)}</td><td>${esc(item.serviceId)}</td><td>${esc(item.customerNo)}</td><td>${esc(item.address)}</td><td>${esc(item.plates)}</td><td><button class="primary" onclick="detail(${item.id})">Keşfe başla</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Bu tarih için atanan keşif dosyası yok.</div>';
}

function detail(id) {
  const item = records.find(record => record.id === id);
  $('#dDate').textContent = `${item.date} · ${item.office}`;
  $('#dTitle').textContent = `${item.number} · ${item.debtor}`;
  $('#dAddress').textContent = item.address;
  $('#detailInfo').innerHTML = [['Bakiye', item.balance], ['Service ID', item.serviceId], ['Müşteri No', item.customerNo], ['Plakalar', item.plates], ['Atanan personel', item.assignee]].map(row => `<tr><th>${row[0]}</th><td>${esc(row[1])}</td></tr>`).join('');
  $('#report [name=id]').value = id;
  go('detail');
}
window.detail = detail;

document.querySelectorAll('[data-view]').forEach(item => item.onclick = () => go(item.dataset.view));
document.querySelectorAll('[data-go]').forEach(item => item.onclick = () => go(item.dataset.go));
$('#taskDate').onchange = tasks;
$('#addForm').onsubmit = event => {
  event.preventDefault();
  records.push({ id: Date.now(), ...Object.fromEntries(new FormData(event.target)), status: 'Bekliyor' });
  save(); event.target.reset(); go('tasks');
};
$('#report').onsubmit = event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const item = records.find(record => record.id === Number(data.id));
  Object.assign(item, { note: data.note, locationCheck: data.locationCheck, vehicleCheck: data.vehicleCheck, paymentStatus: data.paymentStatus, promiseDate: data.promiseDate, asset: data.asset, status: data.status === 'Bulunamadı' ? 'Tekrar keşif' : 'Tamamlandı' });
  save(); go('tasks');
};
$('#import').onclick = () => {
  const lines = $('#csv').value.trim().split(/\r?\n/).filter(Boolean);
  const start = lines[0]?.toLowerCase().includes('tarih') ? 1 : 0;
  let added = 0;
  for (const line of lines.slice(start)) {
    const values = line.split(',').map(value => value.trim());
    if (values.length < 9) continue;
    const [date, office, number, debtor, balance, serviceId, customerNo, address, plates, assignee] = values;
    records.push({ id: Date.now() + added++, date, office, number, debtor, balance, serviceId, customerNo, address, plates, assignee: assignee || 'Ahmet Yılmaz', status: 'Bekliyor' });
  }
  save(); alert(`${added} dosya içe aktarıldı.`); $('#csv').value = ''; go('tasks');
};
$('#downloadTemplate').onclick = () => {
  const file = new Blob(['tarih,icra_dairesi,dosya_no,borclu_unvani,bakiye,service_id,musteri_no,adres,plakalar,personel\n2026-09-01,İstanbul 3. İcra Dairesi,2026/1234,Mehmet Kaya,125000,SRV-18,M-442,Kadıköy İstanbul,34 ABC 123,Ahmet Yılmaz'], { type: 'text/csv' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(file); link.download = 'kesif-dosya-sablonu.csv'; link.click();
};
$('#report').insertAdjacentHTML('beforeend', `<label>Araç / adres tespiti<select name="vehicleCheck"><option>Seçilmedi</option><option>Araç adreste bulundu</option><option>Araçlar adreste bulundu</option><option>Araç bulunamadı</option></select></label><label>Adres teyidi<select name="locationCheck"><option>Seçilmedi</option><option>Adres komşudan teyit edildi</option><option>Adres muhtardan teyit edildi</option><option>Adres teyit edilemedi</option></select></label><label>Ödeme durumu<select name="paymentStatus" id="paymentStatus"><option>Ödeme yapma durumu yok</option><option>Ödeme yaptı</option><option>Ödeme yapacak</option><option>Fiili hacze gelinsin</option></select></label><label id="promiseDateWrap">Ödeme sözü tarihi<input name="promiseDate" type="date"></label>`);
$('#paymentStatus').onchange = event => $('#promiseDateWrap').style.display = event.target.value === 'Ödeme yapacak' ? 'grid' : 'none';
$('#promiseDateWrap').style.display = 'none';
let deferred; addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferred = event; });
$('#install').onclick = async () => { if (!deferred) return alert('Tarayıcı menüsünden Ana ekrana ekle seçeneğini kullanın.'); deferred.prompt(); deferred = null; };
dashboard(); if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

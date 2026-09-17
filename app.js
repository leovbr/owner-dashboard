const PRODUCTS = [
  ['1 potong ayam original', 8000],
  ['1 ayam spicy tanpa nasi', 11000],
  ['1 ayam spicy pakai nasi', 13000],
  ['1 ayam geprek tanpa nasi', 11000],
  ['1 ayam geprek pakai nasi', 13000],
  ['1 jamur crispy', 5000],
  ['1 tusuk bakso', 1000],
  ['1 sambal geprek saja', 3000],
  ['1 nasi saja', 3000],
  ['1 cup usus ayam', 5000],
  ['1 hati rampela', 5000]
];

const STORAGE_KEY = 'owner_dashboard_reports_v1';
const $ = id => document.getElementById(id);
const rupiah = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n || 0);

let currentExpenses = [];

function today(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getReports(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};}catch{return {};}
}
function saveReports(data){localStorage.setItem(STORAGE_KEY, JSON.stringify(data));}

function renderProducts(savedSales = {}){
  $('productsList').innerHTML = PRODUCTS.map(([name,price],i)=>`
    <div class="product-row">
      <div><div class="product-name">${name}</div><div class="product-price">${rupiah(price)} / pcs</div></div>
      <input class="product-qty" data-index="${i}" type="number" min="0" step="1" value="${Number(savedSales[i] || 0)}" aria-label="Jumlah ${name}">
      <div class="product-total" id="productTotal${i}">${rupiah((savedSales[i]||0)*price)}</div>
    </div>`).join('');
  document.querySelectorAll('.product-qty').forEach(input=>input.addEventListener('input',updateTotals));
}

function renderExpenses(expenses = []){
  currentExpenses = expenses.length ? expenses.map(x=>({...x})) : [];
  if(!currentExpenses.length) currentExpenses.push({name:'',amount:''});
  drawExpenses();
}

function drawExpenses(){
  $('expensesList').innerHTML = currentExpenses.map((e,i)=>`
    <div class="expense-row">
      <input data-exp-name="${i}" type="text" placeholder="Contoh: beli bahan" value="${escapeHtml(e.name || '')}">
      <input data-exp-amount="${i}" type="number" min="0" placeholder="Rp" value="${e.amount === '' ? '' : Number(e.amount || 0)}">
      <button class="remove-expense" data-remove-exp="${i}" title="Hapus">×</button>
    </div>`).join('');
  document.querySelectorAll('[data-exp-name]').forEach(el=>el.addEventListener('input',e=>{currentExpenses[+e.target.dataset.expName].name=e.target.value;updateTotals();}));
  document.querySelectorAll('[data-exp-amount]').forEach(el=>el.addEventListener('input',e=>{currentExpenses[+e.target.dataset.expAmount].amount=e.target.value;updateTotals();}));
  document.querySelectorAll('[data-remove-exp]').forEach(el=>el.addEventListener('click',()=>{currentExpenses.splice(+el.dataset.removeExp,1);if(!currentExpenses.length)currentExpenses.push({name:'',amount:''});drawExpenses();updateTotals();}));
  updateTotals();
}

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function getSales(){
  const sales={};
  document.querySelectorAll('.product-qty').forEach(el=>sales[el.dataset.index]=Math.max(0,parseInt(el.value||0,10)));
  return sales;
}
function calculateIncome(sales=getSales()){
  return PRODUCTS.reduce((sum,[,price],i)=>sum+(Number(sales[i])||0)*price,0);
}
function calculateExpenses(){return currentExpenses.reduce((sum,e)=>sum+(Number(e.amount)||0),0);}
function updateTotals(){
  const sales=getSales();
  PRODUCTS.forEach(([,price],i)=>{const el=$(`productTotal${i}`);if(el)el.textContent=rupiah((sales[i]||0)*price);});
  const income=calculateIncome(sales), expenses=calculateExpenses(), profit=income-expenses;
  $('incomeTotal').textContent=rupiah(income);
  $('expenseTotal').textContent=rupiah(expenses);
  $('expenseTotalBottom').textContent=rupiah(expenses);
  $('profitTotal').textContent=rupiah(profit);
}

function loadDate(date, notify=false){
  const reports=getReports();
  const report=reports[date];
  $('reportDate').value=date;
  renderProducts(report?.sales || {});
  renderExpenses(report?.expenses || []);
  $('statusText').textContent=report ? `Tersimpan • ${new Date(report.updatedAt).toLocaleString('id-ID')}` : 'Laporan baru';
  updateTotals();
  if(notify)toast(report?'Laporan dimuat':'Belum ada laporan untuk tanggal ini');
}

function saveCurrent(){
  const date=$('reportDate').value;
  if(!date){toast('Pilih tanggal dulu');return;}
  const sales=getSales();
  const cleanExpenses=currentExpenses.filter(e=>String(e.name||'').trim() || Number(e.amount));
  const income=calculateIncome(sales), expenses=cleanExpenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const reports=getReports();
  reports[date]={date,sales,expenses:cleanExpenses.map(e=>({name:String(e.name||'').trim(),amount:Number(e.amount)||0})),income,expenseTotal:expenses,profit:income-expenses,updatedAt:new Date().toISOString()};
  saveReports(reports);
  currentExpenses=cleanExpenses.length?cleanExpenses:[{name:'',amount:''}];
  $('statusText').textContent=`Tersimpan • ${new Date().toLocaleString('id-ID')}`;
  renderHistory();
  toast('Laporan berhasil disimpan ✓');
}

function renderHistory(){
  const reports=getReports();
  const dates=Object.keys(reports).sort((a,b)=>b.localeCompare(a));
  if(!dates.length){$('historyList').innerHTML='<div class="history-empty">Belum ada laporan tersimpan.</div>';return;}
  $('historyList').innerHTML=dates.map(date=>{const r=reports[date];return `
    <div class="history-item">
      <div><div class="history-date">${new Date(`${date}T00:00:00`).toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div><div class="history-meta">Omzet ${rupiah(r.income)} • Pengeluaran ${rupiah(r.expenseTotal)}</div></div>
      <div class="history-profit">${rupiah(r.profit)}</div>
      <div class="history-actions"><button class="load-btn" data-load="${date}">Buka laporan</button><button class="delete-btn" data-delete="${date}">Hapus</button></div>
    </div>`}).join('');
  document.querySelectorAll('[data-load]').forEach(b=>b.addEventListener('click',()=>{loadDate(b.dataset.load,true);window.scrollTo({top:0,behavior:'smooth'});}));
  document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{if(confirm(`Hapus laporan ${b.dataset.delete}?`)){const data=getReports();delete data[b.dataset.delete];saveReports(data);renderHistory();if($('reportDate').value===b.dataset.delete)loadDate(today());toast('Laporan dihapus');}}));
}

function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2200);}

$('reportDate').value=today();
renderProducts();
renderExpenses();
renderHistory();
updateTotals();
$('loadDateBtn').addEventListener('click',()=>loadDate($('reportDate').value,true));
$('saveBtn').addEventListener('click',saveCurrent);
$('addExpenseBtn').addEventListener('click',()=>{currentExpenses.push({name:'',amount:''});drawExpenses();document.querySelector('[data-exp-name]:last-of-type')?.focus();});
$('clearSalesBtn').addEventListener('click',()=>{document.querySelectorAll('.product-qty').forEach(i=>i.value=0);updateTotals();});
$('clearHistoryBtn').addEventListener('click',()=>{if(confirm('Hapus semua laporan tersimpan di perangkat ini?')){localStorage.removeItem(STORAGE_KEY);renderHistory();toast('Semua riwayat dihapus');}});

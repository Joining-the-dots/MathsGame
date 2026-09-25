'use strict';
const prospects = JSON.parse(document.getElementById('prospect-data').textContent);
const $ = id => document.getElementById(id);
const selection = new Set();
let group = 'ALL', visible = [], columns = [];
const definitions = [
  {key:'institution', label:'Institution', width:235},
  {key:'priority', label:'Approach priority', width:135},
  {key:'products', label:'Potential Citi products', width:250},
  {key:'metalSize', label:'Metals business / size', width:380},
  {key:'pitch', label:'Why approach / pitch angle', width:320},
  {key:'metals', label:'Metals', width:150},
  {key:'businessSize', label:'Wider business scale', width:310},
  {key:'country', label:'Country', width:150, extra:true},
  {key:'category', label:'Client category', width:200, extra:true},
  {key:'offerings', label:'Existing product offering', width:240, extra:true},
  {key:'custody', label:'Current custody — source summary', width:265},
  {key:'citi', label:'Citi relationship — source record', width:225},
  {key:'evidence', label:'Evidence of external activity', width:235, extra:true},
  {key:'sources', label:'Research sources', width:170},
];
const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function plainValue(row, key) {
  if(key === 'priority') return row.priority+' (source score '+row.score+')';
  if(key === 'sources') return row.sources.join('\n');
  return row[key] || 'Not disclosed in source';
}
function fillOptions(id, values) {
  [...new Set(values)].filter(Boolean).sort().forEach(value=>{const o=new Option(value,value);$(id).add(o);});
}
fillOptions('country',prospects.map(r=>r.country));
fillOptions('category',prospects.map(r=>r.category));
fillOptions('product',prospects.flatMap(r=>r.products.split('; ')));
function render() {
  const q=$('search').value.trim().toLocaleLowerCase();
  visible=prospects.filter(r=>(group==='ALL'||r.group===group)&&
    (!$('priority').value||r.priority===$('priority').value)&&
    (!$('metal').value||r.metalCodes.includes($('metal').value))&&
    (!$('product').value||r.products.split('; ').includes($('product').value))&&
    (!$('country').value||r.country===$('country').value)&&
    (!$('category').value||r.category===$('category').value)&&
    (!q||[r.search,r.pitch,r.products,r.priority].join(' ').toLocaleLowerCase().includes(q)));
  const sort=$('sort').value;
  visible.sort((a,b)=>sort==='score'?b.score-a.score||a.institution.localeCompare(b.institution):a[sort].localeCompare(b[sort])||b.score-a.score);
  columns=definitions.filter(c=>!c.extra||$('extended').checked);
  const table=$('prospects');
  table.style.width=(54+columns.reduce((sum,c)=>sum+c.width,0))+'px';
  table.querySelector('thead').innerHTML='<tr><th class="row-gutter"><input id="select-visible" type="checkbox" aria-label="Select all visible prospects"></th>'+columns.map((c,i)=>'<th style="width:'+c.width+'px"'+(i===0?' class="institution-column"':'')+'><span class="col-letter">'+String.fromCharCode(65+i)+'</span>'+escapeHTML(c.label)+'</th>').join('')+'</tr>';
  table.querySelector('tbody').innerHTML=visible.map((r,i)=>'<tr data-id="'+r.id+'"'+(selection.has(r.id)?' class="selected"':'')+'><td class="row-gutter"><label><input type="checkbox" data-select="'+r.id+'" aria-label="Select '+escapeHTML(r.institution)+'"'+(selection.has(r.id)?' checked':'')+'><span>'+(i+1)+'</span></label></td>'+columns.map((c,j)=>{
    let content=escapeHTML(plainValue(r,c.key));
    if(c.key==='institution') content='<button class="institution-link" data-research="'+r.id+'">'+escapeHTML(r.institution)+'</button><div class="institution-meta">'+escapeHTML(r.country+' · '+r.category)+'</div>';
    if(c.key==='priority') content='<span class="priority '+r.priority.toLowerCase()+'">'+r.priority+'</span><span class="score">Source score '+r.score+'</span>';
    if(c.key==='products') content=r.products.split('; ').map(p=>'<span class="product">'+escapeHTML(p)+'</span>').join('');
    if(c.key==='metalSize'||c.key==='businessSize') content=plainValue(r,c.key).split(' | ').map(v=>'<p class="measure">'+escapeHTML(v)+'</p>').join('');
    if(c.key==='sources') content='<button class="source-link" data-research="'+r.id+'">Open full research ↗</button><div class="source-list">'+r.sources.slice(0,3).map((url,n)=>'<a href="'+escapeHTML(url)+'" target="_blank" rel="noopener">Source '+(n+1)+'</a>').join('')+'</div><span class="source-total">'+r.sources.length+' source link'+(r.sources.length===1?'':'s')+' in export</span>';
    return '<td'+(j===0?' class="institution-column"':'')+'>'+content+'</td>';
  }).join('')+'</tr>').join('');
  $('shown').textContent=visible.length+' of 85 prospects';
  $('empty').hidden=visible.length>0;
  $('copy-all').disabled=$('download').disabled=!visible.length;
  $('select-visible').addEventListener('change',event=>{visible.forEach(r=>event.target.checked?selection.add(r.id):selection.delete(r.id));render();});
  updateSelection();
}
function updateSelection() {
  const n=visible.filter(r=>selection.has(r.id)).length;
  const hidden=selection.size-n;
  $('selected-count').textContent=n+' selected'+(hidden?' ('+hidden+' outside current filter)':'');
  $('copy-selected').disabled=!n;
  $('copy-selected').textContent=n?'Copy selected ('+n+')':'Copy selected';
  $('select-visible').checked=visible.length>0&&n===visible.length;
  $('select-visible').indeterminate=n>0&&n<visible.length;
  document.querySelectorAll('#prospects tbody tr').forEach(tr=>tr.classList.toggle('selected',selection.has(+tr.dataset.id)));
}
function reset() {
  group='ALL';
  for(const id of ['search','priority','product','metal','country','category']) $(id).value='';
  $('sort').value='score';
  document.querySelectorAll('#groups button').forEach(b=>b.classList.toggle('active',b.dataset.group==='ALL'));
  render();
}
document.querySelectorAll('#groups button').forEach(b=>b.addEventListener('click',()=>{group=b.dataset.group;document.querySelectorAll('#groups button').forEach(x=>x.classList.toggle('active',x===b));render();}));
for(const id of ['search','priority','product','metal','country','category','sort','extended']) $(id).addEventListener(id==='search'?'input':'change',render);
$('reset').addEventListener('click',reset);
$('empty-reset').addEventListener('click',reset);
$('prospects').addEventListener('change',e=>{if(e.target.matches('[data-select]')){const id=+e.target.dataset.select;e.target.checked?selection.add(id):selection.delete(id);updateSelection();}});
$('prospects').addEventListener('click',e=>{const button=e.target.closest('[data-research]');if(button)showResearch(+button.dataset.research);});
function showResearch(id) {
  const r=prospects.find(r=>r.id===id);
  const original=$('research-row-'+id).nextElementSibling;
  const wrapper=document.createElement('div');
  // Clone the original detail so every citation and evidence badge remains available.
  for(const node of original.cells[1].childNodes) wrapper.appendChild(node.cloneNode(true));
  wrapper.querySelectorAll('[onclick]').forEach(el=>el.removeAttribute('onclick'));
  wrapper.querySelectorAll('button').forEach(el=>el.remove());
  wrapper.querySelectorAll('[style]').forEach(el=>{if(el.style.display==='none')el.style.display='';});
  $('research-title').textContent=r.institution;
  $('research-body').replaceChildren(wrapper);
  $('research-dialog').showModal();
}
$('close-research').addEventListener('click',()=>$('research-dialog').close());
$('close-copy').addEventListener('click',()=>$('copy-dialog').close());
$('manual-copy').addEventListener('click',e=>e.target.select());
// A native HTML table is pasted as cells by Excel. TSV is the plain-text fallback.
// Text cells are protected against spreadsheet formula interpretation.
function spreadsheetText(value) {
  const text=String(value).replace(/[\t\r\n]+/g,' ').replace(/\s+/g,' ').trim();
  return /^[=+\-@]/.test(text)?"'"+text:text;
}
function exportData(rows) {
  const matrix=[columns.map(c=>c.label),...rows.map(r=>columns.map(c=>spreadsheetText(plainValue(r,c.key))))];
  const tsv=matrix.map(r=>r.join('\t')).join('\r\n');
  const html='<html><head><meta charset="utf-8"></head><body><table border="1" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt">'+matrix.map((r,i)=>'<tr>'+r.map((v,j)=>{
    const tag=i?'td':'th';
    let inner=escapeHTML(v);
    if(i&&columns[j].key==='sources') inner=rows[i-1].sources.map(url=>'<a href="'+escapeHTML(url)+'">'+escapeHTML(url)+'</a>').join('<br>');
    return '<'+tag+' style="border:1px solid #cad4d0;padding:6px;vertical-align:top;white-space:normal;mso-number-format:\'\\@\';'+(!i?'background:#174f46;color:#ffffff;font-weight:bold;':'')+'">'+inner+'</'+tag+'>';
  }).join('')+'</tr>').join('')+'</table></body></html>';
  return {matrix,tsv,html};
}
async function copyRows(rows) {
  if(!rows.length)return;
  const output=exportData(rows);
  try {
    if(!navigator.clipboard?.write||!window.ClipboardItem) throw new Error('Clipboard unavailable');
    await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([output.html],{type:'text/html'}),'text/plain':new Blob([output.tsv],{type:'text/plain'})})]);
    $('status').textContent='Copied '+rows.length+' rows × '+columns.length+' columns, with headers. Paste into Excel.';
  } catch(error) {
    $('manual-copy').value=output.tsv;
    $('copy-dialog').showModal();$('manual-copy').focus();$('manual-copy').select();
    $('status').textContent='Clipboard access unavailable. Manual copy or Download TSV is ready.';
  }
}
$('copy-all').addEventListener('click',()=>copyRows(visible));
$('copy-selected').addEventListener('click',()=>copyRows(visible.filter(r=>selection.has(r.id))));
$('download').addEventListener('click',()=>{
  const output=exportData(visible), url=URL.createObjectURL(new Blob(['\uFEFF'+output.tsv],{type:'text/tab-separated-values;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='metals-prospects-'+visible.length+'-rows.tsv';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('status').textContent='Downloaded '+visible.length+' rows. Open the TSV in Excel.';
});
render();

function pwdeShow(code){
  document.querySelectorAll('#view_pwde .pwde-c').forEach(function(b){ b.style.display=(code==='ALL'||b.dataset.code===code)?'':'none'; });
  document.querySelectorAll('#view_pwde .pwde-btn').forEach(function(b){ b.classList.toggle('on', b.dataset.code===code); });
  pwdeflt();
}
function pwdeflt(){
  var q=((document.getElementById('t100q_pwde')||{}).value||'').toLowerCase(); var n=0;
  var msel=[]; document.querySelectorAll('#t100mf_pwde input[type=checkbox][value]:checked').forEach(function(b){msel.push(b.value);});
  var minb=parseInt((document.getElementById('t100sz_pwde')||{}).value||'0',10)||0;
  var so=(document.getElementById('t100so_pwde')||{}).value||'score';
  var evOnly=!!((document.getElementById('t100ev_pwde')||{}).checked);
  var cc=(document.getElementById('t100cc_pwde')||{}).value||'';
  var ct=(document.getElementById('t100ct_pwde')||{}).value||'';
  var fsel=[]; document.querySelectorAll('#t100tf_pwde input:checked').forEach(function(b){fsel.push(b.value);});
  document.querySelectorAll('#view_pwde .pwde-c').forEach(function(blk){
    if(blk.style.display==='none') return;
    var tb=blk.querySelector('tbody'); if(!tb) return;
    var pairs=[]; Array.prototype.forEach.call(tb.querySelectorAll('tr.mrow'),function(r){ var w=r.nextElementSibling; pairs.push([r,(w&&w.classList.contains('fxrow'))?w:null]); });
    pairs.sort(function(a,b){ var ka=parseFloat(a[0].dataset[so==='size'?'size':(so==='aum'?'aum':'score')]||0), kb=parseFloat(b[0].dataset[so==='size'?'size':(so==='aum'?'aum':'score')]||0); if(kb!==ka) return kb-ka; return parseFloat(b[0].dataset.score||0)-parseFloat(a[0].dataset.score||0); });
    var i=0;
    pairs.forEach(function(p){ var r=p[0], w=p[1];
      var rm=(r.dataset.metals||'').split('|');
      var metOK=msel.length===0||msel.some(function(m){return rm.indexOf(m)>=0;});
      var szOK=!minb||(parseInt(r.dataset.band||'0',10)>=minb);
      var evOK=!evOnly||/trades ext\. Y(?!\?)/.test(r.cells[6].textContent);
      var wtxt=w?w.textContent:'';
      var geoOK=(!cc||r.dataset.ctry===cc)&&(!ct||r.dataset.cat===ct);
      var rf=(r.dataset.forms||'').split('|');
      var fOK=fsel.length===0||fsel.some(function(f){return rf.indexOf(f)>=0;});
      var ok=metOK&&szOK&&evOK&&geoOK&&fOK&&(!q||(r.textContent+' '+wtxt).toLowerCase().indexOf(q)>=0);
      r.style.display=ok?'':'none'; if(w) w.style.display='none';
      var car=r.querySelector('.fpcar'); if(car) car.style.transform='';
      if(ok){ n++; i++; var rk=r.querySelector('td.rk'); if(rk) rk.innerHTML='<span class="fpcar">&#9656;</span> '+i; }
      tb.appendChild(r); if(w) tb.appendChild(w);
    });
  });
  var el=document.getElementById('t100n_pwde'); if(el) el.textContent=n+' shown';
}
function fpexp(r){
  var w=r.nextElementSibling; if(!w||!w.classList.contains('fxrow')) return;
  var shown=(w.style.display!=='none');
  w.style.display=shown?'none':'table-row';
  var car=r.querySelector('.fpcar'); if(car) car.style.transform=shown?'':'rotate(90deg)';
}

pwdeShow('CH');

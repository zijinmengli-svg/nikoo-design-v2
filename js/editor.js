/* ============================================
   editor.js — Edit mode for nikoo-design-v2
   - Right-click any <img>: replace or delete
   - Drag-reorder P2 thumbnails within their strip
   - localStorage persistence (key: nikoo-portfolio-v2)
   ============================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'nikoo-portfolio-v2';
  var editToggle  = document.getElementById('editToggle');
  var editBanner  = document.getElementById('editBanner');
  if (!editToggle || !editBanner) return;

  var isEditMode   = false;
  var dragSrcThumb = null;

  /* ---- Edit mode toggle ---- */
  editToggle.addEventListener('click', function () {
    isEditMode = !isEditMode;
    document.body.classList.toggle('edit-mode', isEditMode);
    editBanner.classList.toggle('is-visible', isEditMode);
    editToggle.textContent = isEditMode ? '✓ Done' : '✏ Edit';
    editToggle.classList.toggle('is-active', isEditMode);
    if (isEditMode) enableThumbDrag();
    else disableThumbDrag();
  });

  /* ---- Context menu ---- */
  var ctxMenu = document.createElement('div');
  ctxMenu.id = 'editorContextMenu';
  ctxMenu.style.cssText = [
    'position:fixed', 'z-index:9999', 'background:#111',
    'border:1px solid #2a2a2a', 'border-radius:6px', 'padding:4px',
    'display:none', 'min-width:140px',
    'box-shadow:0 8px 24px rgba(0,0,0,0.4)', 'font-family:inherit'
  ].join(';');
  document.body.appendChild(ctxMenu);

  var ctxTargetImg = null;

  function hideCtxMenu() {
    ctxMenu.style.display = 'none';
    ctxTargetImg = null;
  }

  function createCtxMenuItem(label, onClick, danger) {
    var item = document.createElement('button');
    item.textContent = label;
    item.style.cssText = [
      'display:block', 'width:100%', 'text-align:left',
      'padding:8px 12px', 'font-size:12px',
      'color:' + (danger ? '#f87171' : '#fff'),
      'background:none', 'border:none', 'border-radius:4px',
      'cursor:pointer', 'font-family:inherit'
    ].join(';');
    item.addEventListener('mouseenter', function () { this.style.background = '#222'; });
    item.addEventListener('mouseleave', function () { this.style.background = 'none'; });
    item.addEventListener('click', function () { onClick(); hideCtxMenu(); });
    return item;
  }

  document.addEventListener('contextmenu', function (e) {
    if (!isEditMode) return;
    var img = e.target.closest('img');
    if (!img) return;
    e.preventDefault();
    ctxTargetImg = img;
    ctxMenu.innerHTML = '';
    ctxMenu.appendChild(createCtxMenuItem('🖼 替换图片', replaceImage, false));
    ctxMenu.appendChild(createCtxMenuItem('🗑 删除图片', deleteImage, true));
    ctxMenu.style.display = 'block';
    ctxMenu.style.left = Math.min(e.clientX, window.innerWidth  - 168) + 'px';
    ctxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 96)  + 'px';
  });

  document.addEventListener('click',   function (e) { if (!ctxMenu.contains(e.target)) hideCtxMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideCtxMenu(); });

  function replaceImage() {
    if (!ctxTargetImg) return;
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.addEventListener('change', function () {
      var file = this.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        ctxTargetImg.src = ev.target.result;
        ctxTargetImg.style.opacity = '1';
        ctxTargetImg.style.visibility = '';
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  function deleteImage() {
    if (!ctxTargetImg) return;
    ctxTargetImg.style.opacity    = '0';
    ctxTargetImg.style.visibility = 'hidden';
  }

  /* ---- P2 thumbnail drag-reorder ---- */
  function enableThumbDrag() {
    document.querySelectorAll('.p2-thumb').forEach(function (thumb) {
      thumb.setAttribute('draggable', 'true');
      thumb.addEventListener('dragstart',  onThumbDragStart);
      thumb.addEventListener('dragover',   onThumbDragOver);
      thumb.addEventListener('dragleave',  onThumbDragLeave);
      thumb.addEventListener('drop',       onThumbDrop);
      thumb.addEventListener('dragend',    onThumbDragEnd);
      thumb.style.cursor = 'grab';
    });
  }

  function disableThumbDrag() {
    document.querySelectorAll('.p2-thumb').forEach(function (thumb) {
      thumb.removeAttribute('draggable');
      thumb.removeEventListener('dragstart',  onThumbDragStart);
      thumb.removeEventListener('dragover',   onThumbDragOver);
      thumb.removeEventListener('dragleave',  onThumbDragLeave);
      thumb.removeEventListener('drop',       onThumbDrop);
      thumb.removeEventListener('dragend',    onThumbDragEnd);
      thumb.style.cursor = '';
      thumb.classList.remove('dragging', 'drag-over');
    });
    dragSrcThumb = null;
  }

  function onThumbDragStart(e) {
    dragSrcThumb = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    e.stopPropagation();
  }

  function onThumbDragOver(e) {
    if (this === dragSrcThumb) return;
    if (this.closest('.p2-strip') !== dragSrcThumb.closest('.p2-strip')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
  }

  function onThumbDragLeave() { this.classList.remove('drag-over'); }

  function onThumbDrop(e) {
    e.preventDefault();
    if (this === dragSrcThumb) return;
    if (this.closest('.p2-strip') !== dragSrcThumb.closest('.p2-strip')) return;
    this.classList.remove('drag-over');
    var parent = this.parentNode;
    var srcIdx = Array.from(parent.children).indexOf(dragSrcThumb);
    var dstIdx = Array.from(parent.children).indexOf(this);
    parent.insertBefore(dragSrcThumb, srcIdx < dstIdx ? this.nextSibling : this);
  }

  function onThumbDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.p2-thumb').forEach(function (t) { t.classList.remove('drag-over'); });
    dragSrcThumb = null;
  }

  /* ---- Stable image ID ---- */
  function getImgId(img) {
    var card = img.closest('.card');
    if (card) {
      var thumbs = Array.from(card.querySelectorAll('.p2-thumb'));
      var idx = thumbs.indexOf(img);
      if (idx >= 0) return (card.id || 'card') + ':thumb:' + idx;
    }
    return 'other:' + (img.getAttribute('src') || '').split('/').pop();
  }

  /* ---- Save (merge with existing state from category editor) ---- */
  function saveState() {
    var state;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? JSON.parse(raw) : {};
    } catch (e) { state = {}; }
    /* preserve cross-editor keys (state.categories from category.html) */
    state.images     = {};
    state.thumbOrder = {};
    state.version    = state.version && state.version >= 2 ? state.version : 2;

    document.querySelectorAll('img').forEach(function (img) {
      var isHidden = img.style.visibility === 'hidden';
      var src = img.getAttribute('src');
      if (!isHidden && !(src && src.startsWith('data:'))) return;
      state.images[getImgId(img)] = { src: isHidden ? null : src, hidden: isHidden };
    });

    document.querySelectorAll('.card').forEach(function (card) {
      var strip = card.querySelector('.p2-strip');
      if (!strip) return;
      state.thumbOrder[card.id] = Array.from(strip.querySelectorAll('.p2-thumb')).map(function (t) {
        return t.getAttribute('alt') || t.getAttribute('src');
      });
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      showToast('✓ 已保存');
    } catch (e) {
      showToast('保存失败：图片数据过大，请减少替换数量', true);
    }
  }

  /* ---- Restore (accept any version, ignore unknown keys) ---- */
  function restoreState() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var state;
    try { state = JSON.parse(raw); } catch (e) { return; }
    if (!state) return;

    if (state.thumbOrder) {
      Object.keys(state.thumbOrder).forEach(function (cardId) {
        var card  = document.getElementById(cardId);
        if (!card) return;
        var strip = card.querySelector('.p2-strip');
        if (!strip) return;
        var map = {};
        strip.querySelectorAll('.p2-thumb').forEach(function (t) {
          map[t.getAttribute('alt') || t.getAttribute('src')] = t;
        });
        var label = strip.querySelector('.p2-names');
        state.thumbOrder[cardId].forEach(function (key) {
          if (map[key]) strip.insertBefore(map[key], label);
        });
      });
    }

    if (state.images) {
      document.querySelectorAll('img').forEach(function (img) {
        var saved = state.images[getImgId(img)];
        if (!saved) return;
        if (saved.hidden) { img.style.opacity = '0'; img.style.visibility = 'hidden'; }
        else if (saved.src) { img.src = saved.src; }
      });
    }
  }

  /* ---- Toast ---- */
  function showToast(msg, isError) {
    var prev = document.getElementById('editorToast');
    if (prev) prev.remove();
    var t = document.createElement('div');
    t.id = 'editorToast';
    t.textContent = msg;
    t.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
      'background:' + (isError ? '#450a0a' : '#111'),
      'color:'       + (isError ? '#fca5a5' : '#e5e5e5'),
      'padding:10px 22px', 'border-radius:8px', 'font-size:13px',
      'font-family:inherit', 'z-index:10001', 'pointer-events:none',
      'border:1px solid ' + (isError ? '#7f1d1d' : '#2a2a2a'),
      'white-space:nowrap', 'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
      'opacity:1', 'transition:opacity 0.4s'
    ].join(';');
    document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; }, 2200);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 2600);
  }

  var saveBtn  = document.getElementById('editSaveBtn');
  var clearBtn = document.getElementById('editClearBtn');
  if (saveBtn)  saveBtn.addEventListener('click', saveState);
  if (clearBtn) clearBtn.addEventListener('click', function () {
    if (window.confirm('确认清除所有已保存的修改？页面将刷新恢复原始状态。')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });

  restoreState();
})();

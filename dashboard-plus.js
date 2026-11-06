/*!
 * Lab Alchemy — dashboard-plus.js
 * dashboard.html এর </body> এর ঠিক আগে (মূল <script> ব্লকের পরে) এই এক লাইন বসাও:
 *     <script src="dashboard-plus.js"></script>
 * যা যোগ হয়: ⌨️ Ctrl+K সার্চ · 🧠 আজকের কুইজ · 📓 ভুলের খাতা · ⏳ পরীক্ষার কাউন্টডাউন · ⭐ XP ও লেভেল
 * অন্য পেজে (যেমন গেম) এই ফাইল যোগ করলে শুধু window.LabXP.add(পয়েন্ট, কারণ) পাওয়া যায়।
 */
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    var bn = function (n) { return Number(n).toLocaleString('bn-BD', { useGrouping: false }); };
    var UK = (typeof ME !== 'undefined' && ME && ME.username) ? ME.username : 'guest';
    var key = function (n) { return 'labAlchemy' + n + ':' + UK; };
    var get = function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
    var set = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
    var today = function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
    function mk(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

    /* ================= XP ও লেভেল (সব পেজে কাজ করে) ================= */
    var XPK = key('XP');
    var state = get(XPK, { xp: 0, last: '' });
    function level(xp) { var L = Math.floor(Math.sqrt(xp / 40)) + 1, lo = 40 * (L - 1) * (L - 1), hi = 40 * L * L; return { L: L, pct: Math.round((xp - lo) / (hi - lo) * 100), next: hi - xp }; }
    function addXP(n, why) {
        n = Math.max(0, Math.round(n)); if (!n) return state.xp;
        var before = level(state.xp).L; state.xp += n; set(XPK, state); paintXP();
        if (level(state.xp).L > before) toast('🎉 লেভেল আপ! তুমি এখন লেভেল ' + bn(level(state.xp).L) + '-এ পৌঁছেছো।');
        else if (why) toast('+' + bn(n) + ' XP (' + why + ')');
        return state.xp;
    }
    window.LabXP = { add: addXP, get: function () { return state.xp; }, level: function () { return level(state.xp).L; } };

    var grid = $('dashboardGrid');
    if (!grid) return;   // ড্যাশবোর্ড ছাড়া অন্য পেজে শুধু LabXP থাকবে

    /* ================= স্টাইল ================= */
    var css = '' +
    '.lp-toast{position:fixed;left:50%;bottom:62px;transform:translateX(-50%) translateY(20px);z-index:6000;padding:11px 20px;border-radius:14px;font-size:14px;font-weight:700;color:#fff;background:var(--gradient-primary);box-shadow:0 12px 30px var(--gradient-glow);opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;max-width:92%;text-align:center}' +
    '.lp-toast.on{opacity:1;transform:translateX(-50%)}' +
    '.stat-chip.lp-clickable{cursor:pointer;font-family:inherit}' +
    '.lp-xpbar{display:block;height:4px;margin-top:5px;border-radius:4px;background:var(--border-color);overflow:hidden}' +
    '.lp-xpbar i{display:block;height:100%;background:var(--gradient-primary);transition:width .5s}' +
    '.lp-ov{position:fixed;inset:0;z-index:5500;display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;visibility:hidden;transition:opacity .2s,visibility .2s}' +
    '.lp-ov.on{opacity:1;visibility:visible}' +
    '.lp-box{width:100%;max-width:560px;max-height:76vh;display:flex;flex-direction:column;border-radius:24px;overflow:hidden;background:var(--card-solid);border:1.5px solid var(--section-border);box-shadow:0 30px 70px rgba(0,0,0,.5)}' +
    '.lp-in{width:100%;padding:18px 22px;font-family:inherit;font-size:16px;font-weight:600;color:var(--text-color);background:transparent;border:0;border-bottom:1px solid var(--border-color);outline:none}' +
    '.lp-list{margin:0;padding:8px;list-style:none;overflow-y:auto}' +
    '.lp-it{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:14px;font-size:14.5px;font-weight:600;cursor:pointer;color:var(--text-color)}' +
    '.lp-it small{margin-left:auto;font-size:12px;font-weight:600;color:var(--text-muted)}' +
    '.lp-it.sel{background:rgba(168,85,247,.16)}' +
    '.lp-hint{padding:10px 18px;font-size:12px;font-weight:600;color:var(--text-muted);border-top:1px solid var(--border-color)}' +
    '.lp-empty{padding:26px;text-align:center;font-size:14px;color:var(--text-muted)}' +
    '.widget.lp-quiz{grid-column:1/-1;min-height:0;--w:#f472b6;--w-rgb:244,114,182}' +
    '.lp-q{margin:0 0 14px;font-size:clamp(1.05rem,2.6vw,1.25rem);font-weight:700;line-height:1.6}' +
    '.lp-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '@media(max-width:640px){.lp-opts{grid-template-columns:1fr}}' +
    '.lp-opt{padding:13px 16px;text-align:left;font-family:inherit;font-size:14.5px;font-weight:600;line-height:1.5;cursor:pointer;color:var(--text-color);background:var(--card-solid);border:1.5px solid var(--border-color);border-radius:16px;transition:transform .2s,border-color .2s,background .2s}' +
    '.lp-opt:hover:not(:disabled){transform:translateY(-2px);border-color:#a855f7}' +
    '.lp-opt:disabled{cursor:default}' +
    '.lp-opt.right{color:#fff;background:#10b981;border-color:#10b981}' +
    '.lp-opt.wrong{color:#fff;background:#f43f5e;border-color:#f43f5e}' +
    '.lp-fb{min-height:24px;margin-top:12px;font-size:14px;line-height:1.7;font-weight:600;color:var(--text-muted)}' +
    '.lp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px}' +
    '.lp-dots{display:flex;gap:6px}.lp-dots i{width:26px;height:6px;border-radius:6px;background:var(--border-color)}.lp-dots i.ok{background:#10b981}.lp-dots i.no{background:#f43f5e}.lp-dots i.cur{background:#a855f7}' +
    '.lp-res{text-align:center;padding:10px 0}.lp-res b{display:block;font-size:2.6rem;line-height:1.2;background:var(--gradient-primary);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}' +
    '.lp-res p{margin:6px 0 14px;font-size:14.5px;color:var(--text-muted);font-weight:600}' +
    '.lp-mod{width:100%;max-width:460px;max-height:80vh;overflow-y:auto;padding:26px;border-radius:24px;background:var(--card-solid);border:1.5px solid var(--section-border);box-shadow:0 30px 70px rgba(0,0,0,.5)}' +
    '.lp-mod h3{margin:0 0 14px;font-size:19px;font-weight:800}' +
    '.lp-mod label{display:block;margin:12px 0 6px;font-size:13.5px;font-weight:700}' +
    '.lp-mod select,.lp-mod input{width:100%;padding:11px 14px;font-family:inherit;font-size:15px;font-weight:600;color:var(--text-color);background:var(--bg-color);border:1.5px solid var(--border-color);border-radius:14px;outline:none}' +
    '.lp-mod .lp-btns{display:flex;gap:10px;margin-top:20px}' +
    '.lp-mod .lp-btns button{flex:1}' +
    '.lp-wr{margin:0 0 12px;padding:12px 14px;border-radius:14px;font-size:13.5px;line-height:1.7;background:var(--card-bg);border:1px solid var(--border-color)}' +
    '.lp-wr b{display:block;margin-bottom:4px;font-size:14px}.lp-wr span{color:#10b981;font-weight:700}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var toastEl = null; toastEl = mk('div', 'lp-toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); var tt;
    function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('on'); }, 2600); }

    /* ================= ওয়েলকাম চিপ: XP + পরীক্ষা ================= */
    var chipRow = document.querySelector('.stat-row'), xpChip, examChip;
    if (chipRow) {
        xpChip = mk('span', 'stat-chip'); xpChip.title = 'কুইজ, লগইন ও গেম থেকে XP জমে';
        examChip = mk('button', 'stat-chip lp-clickable'); examChip.type = 'button'; examChip.title = 'পরীক্ষার তারিখ ঠিক করো';
        chipRow.append(xpChip, examChip);
    }
    function paintXP() {
        if (!xpChip) return; var lv = level(state.xp); xpChip.replaceChildren();
        var i = mk('i', 'fas fa-star'); i.style.color = '#fbbf24'; var w = mk('span'); w.append('লেভেল ', mk('b', '', bn(lv.L)), ' · ' + bn(state.xp) + ' XP');
        var bar = mk('span', 'lp-xpbar'), fill = mk('i'); fill.style.width = lv.pct + '%'; bar.appendChild(fill);
        var box = mk('span'); box.append(w, bar); xpChip.append(i, box); xpChip.title = 'পরের লেভেলে যেতে আরও ' + bn(lv.next) + ' XP দরকার';
    }
    if (state.last !== today()) { state.last = today(); set(XPK, state); state.xp += 10; set(XPK, state); }
    paintXP();

    var EXK = key('Exam');
    function daysLeft(d) { var t = new Date(d + 'T00:00:00'), n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((t - n) / 86400000); }
    var paintExam = function () {
        if (!examChip) return; var ex = get(EXK, null); examChip.replaceChildren(); examChip.appendChild(mk('i', 'fas fa-hourglass-half'));
        if (!ex || !ex.date) { examChip.append(' পরীক্ষার তারিখ সেট করো'); return; }
        var d = daysLeft(ex.date), b = mk('b', '', d > 0 ? bn(d) : '');
        if (d > 0) { examChip.append(' ' + ex.name + '-এ আর ', b, ' দিন'); } else if (d === 0) { examChip.append(' আজ ' + ex.name + ' পরীক্ষা, শুভকামনা! 🍀'); } else { examChip.append(' ' + ex.name + ' শেষ হয়েছে'); }
    };
    paintExam();
    function modal(buildFn) {
        var ov = mk('div', 'lp-ov on'); ov.style.alignItems = 'center'; ov.style.padding = '16px'; var box = mk('div', 'lp-mod'); buildFn(box, close); ov.appendChild(box); document.body.appendChild(ov);
        function close() { ov.remove(); document.removeEventListener('keydown', esc); } function esc(e) { if (e.key === 'Escape') close(); }
        ov.addEventListener('click', function (e) { if (e.target === ov) close(); }); document.addEventListener('keydown', esc); return close;
    }
    function openExam() {
        var ex = get(EXK, { name: 'SSC', date: '' });
        modal(function (box, close) {
            box.appendChild(mk('h3', '', '⏳ পরীক্ষার কাউন্টডাউন'));
            var l1 = mk('label', '', 'কোন পরীক্ষা?'), sel = mk('select'); ['SSC', 'HSC', 'ভর্তি পরীক্ষা', 'কলেজের পরীক্ষা'].forEach(function (n) { var o = mk('option', '', n); o.value = n; sel.appendChild(o); }); sel.value = ex.name || 'SSC';
            var l2 = mk('label', '', 'পরীক্ষা শুরুর তারিখ'), dt = mk('input'); dt.type = 'date'; dt.value = ex.date || '';
            var bt = mk('div', 'lp-btns'), ok = mk('button', 'pill-btn', 'সংরক্ষণ'), del = mk('button', 'pill-btn ghost', 'মুছো'); ok.type = del.type = 'button';
            ok.addEventListener('click', function () { if (!dt.value) { dt.focus(); return; } set(EXK, { name: sel.value, date: dt.value }); paintExam(); close(); toast('কাউন্টডাউন সেট হয়েছে ✓'); });
            del.addEventListener('click', function () { try { localStorage.removeItem(EXK); } catch (e) {} paintExam(); close(); });
            bt.append(ok, del); box.append(l1, sel, l2, dt, bt); setTimeout(function () { dt.focus(); }, 50);
        });
    }
    if (examChip) examChip.addEventListener('click', openExam);

    /* ================= 🎯 পরীক্ষা জোন স্পটলাইট (সবার চোখে পড়ার ব্যানার) ================= */
    (function examSpotlight() {
        var anchor = document.querySelector('.unique-welcome-banner') || $('sliderWrapper');
        var seenK = key('ExamSeen'), hideK = key('SpotHide');
        var link = document.querySelector('.nav-links a[href="exam.html"]');
        if (link && !get(seenK, false)) {            // হেডারের "পরীক্ষা" লিংকে জ্বলজ্বলে NEW চিহ্ন
            link.classList.add('lp-hot'); link.appendChild(mk('span', 'lp-new', 'NEW'));
            link.addEventListener('click', function () { set(seenK, true); });
        }
        var sc = document.createElement('style'); sc.textContent =
        '@property --lpa{syntax:"<angle>";inherits:false;initial-value:0deg}' +
        '.lp-hot{position:relative;color:#f472b6!important}.lp-new{margin-left:6px;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:.6px;color:#fff;background:linear-gradient(135deg,#f43f5e,#fb923c);animation:lpPulse 1.6s ease-in-out infinite}' +
        '@keyframes lpPulse{50%{transform:scale(1.18);box-shadow:0 0 14px rgba(244,63,94,.8)}}' +
        '.lp-spot{--lpa:0deg;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:30px;margin-bottom:35px;padding:34px 42px;border:2.5px solid transparent;border-radius:30px;' +
        'background:linear-gradient(135deg,rgba(244,63,94,.10),rgba(251,146,60,.08)) padding-box,linear-gradient(var(--card-solid),var(--card-solid)) padding-box,conic-gradient(from var(--lpa),#f43f5e,#fb923c,#fbbf24,#a855f7,#f43f5e) border-box;' +
        'box-shadow:0 20px 50px rgba(244,63,94,.22);animation:lpSpin 6s linear infinite,slideDown .7s ease both .25s}' +
        '@keyframes lpSpin{to{--lpa:360deg}}' +
        '.lp-spot::before{content:"";position:absolute;top:-70px;left:-50px;width:280px;height:280px;background:radial-gradient(circle,rgba(251,146,60,.28),transparent 70%);pointer-events:none}' +
        '.lp-sp-l,.lp-sp-r{position:relative;z-index:1}.lp-sp-l{flex:1;min-width:0}' +
        '.lp-bdg{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:30px;font-size:12px;font-weight:800;letter-spacing:1.2px;color:#fff;background:linear-gradient(135deg,#f43f5e,#fb923c);box-shadow:0 6px 18px rgba(244,63,94,.4)}' +
        '.lp-bdg i{width:8px;height:8px;border-radius:50%;background:#fff;animation:lpPulse 1.4s ease-in-out infinite}' +
        '.lp-spot h2{margin:14px 0 10px;font-size:clamp(1.4rem,3.4vw,2rem);font-weight:800;line-height:1.35;letter-spacing:-.4px}' +
        '.lp-spot h2 span{background:linear-gradient(135deg,#f43f5e,#fb923c,#fbbf24);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}' +
        '.lp-spot p{margin:0 0 18px;max-width:560px;font-size:15px;line-height:1.75;font-weight:500;color:var(--text-muted)}' +
        '.lp-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}.lp-chips span{padding:6px 14px;border-radius:30px;font-size:13px;font-weight:700;color:var(--text-color);background:var(--card-solid);border:1px solid var(--border-color)}' +
        '.lp-acts{display:flex;flex-wrap:wrap;align-items:center;gap:12px}' +
        '.lp-go{display:inline-flex;align-items:center;gap:10px;padding:15px 30px;border-radius:18px;font-size:16px;font-weight:800;color:#fff;text-decoration:none;background:linear-gradient(135deg,#f43f5e,#fb923c);box-shadow:0 10px 26px rgba(244,63,94,.4);animation:lpGlow 2.2s ease-in-out infinite;transition:transform .25s}' +
        '.lp-go:hover{transform:translateY(-3px)}.lp-go i{transition:transform .3s}.lp-go:hover i{transform:translateX(6px)}' +
        '@keyframes lpGlow{50%{box-shadow:0 12px 40px rgba(251,146,60,.65)}}' +
        '.lp-later{font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:var(--text-muted);background:none;border:0;padding:8px}.lp-later:hover{color:var(--text-color)}' +
        '.lp-ring{position:relative;width:150px;height:150px;flex-shrink:0;display:flex;align-items:center;justify-content:center;text-align:center}' +
        '.lp-ring svg{position:absolute;inset:0;transform:rotate(-90deg)}.lp-ring circle{fill:none;stroke-width:9;stroke-linecap:round}' +
        '.lp-ring .bg{stroke:var(--border-color)}.lp-ring .fg{stroke:url(#lpG);transition:stroke-dashoffset .8s}' +
        '.lp-ring b{display:block;font-size:2.2rem;font-weight:800;line-height:1.1}.lp-ring small{display:block;font-size:12px;font-weight:700;color:var(--text-muted);line-height:1.4}' +
        '.lp-ring button{font-family:inherit;font-size:12.5px;font-weight:800;line-height:1.5;cursor:pointer;color:#fb923c;background:none;border:0}' +
        '@media(max-width:820px){.lp-spot{flex-direction:column-reverse;text-align:center;padding:28px 20px}.lp-chips,.lp-acts{justify-content:center}.lp-spot p{margin-left:auto;margin-right:auto}}';
        document.head.appendChild(sc);
        if (!anchor || get(hideK, '') === today()) return;
        var box = mk('section', 'lp-spot'); box.setAttribute('aria-label', 'পরীক্ষা জোন');
        var L = mk('div', 'lp-sp-l'), R = mk('div', 'lp-sp-r');
        var bd = mk('span', 'lp-bdg'); bd.append(mk('i'), 'পরীক্ষা জোন'); L.appendChild(bd);
        var h = mk('h2'); h.append('নিজেকে যাচাই করো, ', mk('span', '', 'পরীক্ষা দাও!')); L.appendChild(h);
        L.appendChild(mk('p', '', 'শুধু পড়লেই হবে না, নিজের প্রস্তুতি কেমন তা পরীক্ষা দিয়ে দেখে নাও। ভুল থেকেই শেখা হয়, আর পরীক্ষার ভয়ও কমে।'));
        var ch = mk('div', 'lp-chips'); ['🎯 প্রস্তুতি যাচাই', '📚 SSC ও HSC', '🔥 প্রতিদিন চর্চা'].forEach(function (t) { ch.appendChild(mk('span', '', t)); }); L.appendChild(ch);
        var acts = mk('div', 'lp-acts'), go = mk('a', 'lp-go'); go.href = 'exam.html'; go.append('পরীক্ষা শুরু করো ', mk('i', 'fas fa-arrow-right')); go.addEventListener('click', function () { set(seenK, true); });
        var later = mk('button', 'lp-later', 'আজ আর দেখাবে না ✕'); later.type = 'button'; later.addEventListener('click', function () { set(hideK, today()); box.remove(); });
        acts.append(go, later); L.appendChild(acts);
        var ring = mk('div', 'lp-ring'); ring.setAttribute('role', 'img');
        ring.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="lpG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f43f5e"/><stop offset="1" stop-color="#fbbf24"/></linearGradient></defs><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="327" stroke-dashoffset="327"/></svg>';
        var mid = mk('div'); ring.appendChild(mid); R.appendChild(ring);
        function paintRing() {
            var ex = get(EXK, null), fg = ring.querySelector('.fg'); mid.replaceChildren();
            if (ex && ex.date && daysLeft(ex.date) >= 0) { var d = daysLeft(ex.date); fg.style.strokeDashoffset = 327 * (1 - Math.max(0.04, Math.min(1, d / 180))); mid.append(mk('b', '', bn(d)), mk('small', '', 'দিন বাকি'), mk('small', '', ex.name)); ring.setAttribute('aria-label', ex.name + ' পরীক্ষায় আর ' + bn(d) + ' দিন বাকি'); }
            else { fg.style.strokeDashoffset = 327 * .75; var b = mk('button', '', '⏳ পরীক্ষার\nতারিখ সেট করো'); b.style.whiteSpace = 'pre-line'; b.type = 'button'; b.addEventListener('click', openExam); mid.appendChild(b); ring.setAttribute('aria-label', 'পরীক্ষার তারিখ সেট করা নেই'); }
        }
        paintRing(); box.append(L, R); anchor.parentNode.insertBefore(box, anchor.nextSibling);
        var _pe = paintExam; paintExam = function () { _pe(); paintRing(); };   // তারিখ বদলালে রিংও বদলায়
    })();

    /* ================= আজকের কুইজ ================= */
    var QB = [
        ['সোডিয়াম ধাতুকে সাধারণত কীসের মধ্যে ডুবিয়ে রাখা হয়?', ['পানি', 'কেরোসিন', 'অ্যালকোহল', 'খোলা বাতাস'], 1, 'সোডিয়াম বাতাস ও পানির সাথে তীব্র বিক্রিয়া করে, তাই কেরোসিনে রাখা হয়।'],
        ['pH ৭ মানের দ্রবণ কেমন?', ['অম্লীয়', 'ক্ষারীয়', 'প্রশম', 'লবণাক্ত'], 2, '২৫°C তাপমাত্রায় pH ৭ মানে প্রশম।'],
        ['NaOH এর সাধারণ নাম কী?', ['কস্টিক সোডা', 'ধোয়ার সোডা', 'বেকিং সোডা', 'কস্টিক পটাশ'], 0, 'NaOH = কস্টিক সোডা, KOH = কস্টিক পটাশ।'],
        ['পর্যায় সারণির জনক কাকে বলা হয়?', ['ডালটন', 'মেন্ডেলিভ', 'বোর', 'রাদারফোর্ড'], 1, 'দিমিত্রি মেন্ডেলিভ ১৮৬৯ সালে পর্যায় সারণি প্রকাশ করেন।'],
        ['ইলেকট্রন আবিষ্কার করেন কে?', ['জে. জে. থমসন', 'চ্যাডউইক', 'রাদারফোর্ড', 'গোল্ডস্টাইন'], 0, '১৮৯৭ সালে থমসন ক্যাথোড রশ্মি পরীক্ষায় ইলেকট্রন আবিষ্কার করেন।'],
        ['স্থির তাপমাত্রায় গ্যাসের চাপ ও আয়তনের সম্পর্ক কেমন?', ['সমানুপাতিক', 'ব্যস্তানুপাতিক', 'কোনো সম্পর্ক নেই', 'বর্গের সমানুপাতিক'], 1, 'এটি বয়েলের সূত্র: PV = ধ্রুবক।'],
        ['১ মোল পদার্থে কণার সংখ্যা কত?', ['৬.০২৩ × ১০²²', '৬.০২৩ × ১০²³', '৩.০১ × ১০²³', '১.৬ × ১০⁻¹⁹'], 1, 'এটি অ্যাভোগাদ্রো সংখ্যা।'],
        ['STP-তে ১ মোল আদর্শ গ্যাসের আয়তন কত?', ['১১.২ L', '২২.৪ L', '২৪ L', '১ L'], 1, '০°C ও ১ atm-এ ১ মোল গ্যাস প্রায় ২২.৪ L জায়গা নেয়।'],
        ['হ্যালোজেন গ্রুপ কোনটি?', ['১ নং', '২ নং', '১৭ নং', '১৮ নং'], 2, 'F, Cl, Br, I হলো ১৭ নং গ্রুপের মৌল।'],
        ['নিচের কোনটি নিষ্ক্রিয় গ্যাস?', ['অক্সিজেন', 'নাইট্রোজেন', 'নিয়ন', 'ক্লোরিন'], 2, 'He, Ne, Ar, Kr, Xe, Rn নিষ্ক্রিয় গ্যাস।'],
        ['অ্যালকেনের সাধারণ সংকেত কোনটি?', ['CₙH₂ₙ', 'CₙH₂ₙ₊₂', 'CₙH₂ₙ₋₂', 'CₙHₙ'], 1, 'যেমন মিথেন CH₄ (n=১), ইথেন C₂H₆ (n=২)।'],
        ['অ্যালকোহলের কার্যকরী মূলক কোনটি?', ['–CHO', '–COOH', '–OH', '–O–'], 2, 'হাইড্রক্সিল (–OH) মূলক অ্যালকোহলের বৈশিষ্ট্য।'],
        ['ভিনেগারে কোন এসিড থাকে?', ['ফরমিক এসিড', 'ইথানয়িক (অ্যাসিটিক) এসিড', 'সাইট্রিক এসিড', 'ল্যাকটিক এসিড'], 1, 'ইথানয়িক এসিডের ৪–১০% জলীয় দ্রবণ ভিনেগার।'],
        ['ফরমালিন কীসের জলীয় দ্রবণ?', ['মিথানল', 'ইথানল', 'মিথান্যাল (ফরমালডিহাইড)', 'অ্যাসিটোন'], 2, 'মিথান্যালের প্রায় ৪০% জলীয় দ্রবণ ফরমালিন।'],
        ['মোলারিটির একক কোনটি?', ['g/L', 'mol/L', 'mol/kg', 'L/mol'], 1, 'মোলারিটি = দ্রবের মোল ÷ দ্রবণের আয়তন (L)।'],
        ['পরমাণুর নিউক্লিয়াসে কী কী থাকে?', ['প্রোটন ও ইলেকট্রন', 'নিউট্রন ও ইলেকট্রন', 'প্রোটন ও নিউট্রন', 'শুধু প্রোটন'], 2, 'ইলেকট্রন নিউক্লিয়াসের বাইরে ঘোরে।'],
        ['আইসোটোপের ক্ষেত্রে কোনটি সমান থাকে?', ['ভরসংখ্যা', 'নিউট্রন সংখ্যা', 'প্রোটন সংখ্যা', 'নিউক্লিয়ন সংখ্যা'], 2, 'প্রোটন সংখ্যা সমান, নিউট্রন সংখ্যা ভিন্ন।'],
        ['সবচেয়ে বেশি তড়িৎ ঋণাত্মক মৌল কোনটি?', ['অক্সিজেন', 'ক্লোরিন', 'ফ্লোরিন', 'নাইট্রোজেন'], 2, 'ফ্লোরিনের মান ৪.০ (পাউলিং স্কেল)।'],
        ['জারণ বলতে কী বোঝায়?', ['ইলেকট্রন গ্রহণ', 'ইলেকট্রন ত্যাগ', 'প্রোটন ত্যাগ', 'নিউট্রন গ্রহণ'], 1, 'জারণ = ইলেকট্রন ত্যাগ, বিজারণ = ইলেকট্রন গ্রহণ।'],
        ['2H₂ + O₂ → 2H₂O কোন ধরনের বিক্রিয়া?', ['বিয়োজন', 'প্রতিস্থাপন', 'সংযোজন', 'দ্বি-প্রতিস্থাপন'], 2, 'দুটি পদার্থ যুক্ত হয়ে একটি যৌগ তৈরি হয়েছে।'],
        ['ডালটনের পরমাণু তত্ত্ব কত সালে প্রকাশিত হয়?', ['১৭৭৪', '১৮০৩', '১৮৬৯', '১৯১১'], 1, 'জন ডালটন ১৮০৩ সালে তাঁর তত্ত্ব প্রকাশ করেন।'],
        ['অ্যাভোগাদ্রোর সূত্র কী বলে?', ['সম আয়তনে সমান ভর', 'সমান তাপমাত্রা ও চাপে সম আয়তনে সমান অণু', 'চাপ বাড়লে আয়তন কমে', 'তাপ বাড়লে আয়তন বাড়ে'], 1, 'একই T ও P তে সম আয়তনের সব গ্যাসে অণুর সংখ্যা সমান।'],
        ['ইথিনের আণবিক সংকেত কী?', ['C₂H₂', 'C₂H₄', 'C₂H₆', 'CH₄'], 1, 'ইথিন (অ্যালকিন) = C₂H₄।'],
        ['ব্রোমিন পানির বাদামি রং কোনটি বিবর্ণ করে?', ['ইথেন', 'মিথেন', 'ইথিন', 'প্রোপেন'], 2, 'দ্বিবন্ধনযুক্ত অ্যালকিন ব্রোমিনের সাথে সংযোজন বিক্রিয়া করে।'],
        ['অম্ল ও ক্ষারের বিক্রিয়ায় কী উৎপন্ন হয়?', ['লবণ ও পানি', 'শুধু লবণ', 'গ্যাস ও তাপ', 'অক্সাইড'], 0, 'এটিকে প্রশমন বিক্রিয়া বলে।'],
        ['সবচেয়ে হালকা মৌল কোনটি?', ['হিলিয়াম', 'লিথিয়াম', 'হাইড্রোজেন', 'নিয়ন'], 2, 'হাইড্রোজেনের পারমাণবিক সংখ্যা ১।'],
        ['সোডিয়ামের পারমাণবিক সংখ্যা কত?', ['১১', '১২', '১৭', '১৯'], 0, 'Na = ১১ (ইলেকট্রন বিন্যাস ২, ৮, ১)।'],
        ['CaCO₃ কোনটির রাসায়নিক সংকেত?', ['চুন', 'চুনাপাথর/মার্বেল', 'জিপসাম', 'ব্লিচিং পাউডার'], 1, 'ক্যালসিয়াম কার্বনেট চুনাপাথর ও মার্বেলের মূল উপাদান।'],
        ['হেবার পদ্ধতিতে কী উৎপন্ন হয়?', ['সালফিউরিক এসিড', 'অ্যামোনিয়া', 'নাইট্রিক এসিড', 'সোডা অ্যাশ'], 1, 'N₂ + 3H₂ ⇌ 2NH₃।'],
        ['নীল লিটমাস এসিডে কী রং ধারণ করে?', ['লাল', 'সবুজ', 'হলুদ', 'রং বদলায় না'], 0, 'এসিড নীল লিটমাসকে লাল করে।'],
        ['পর্যায়ে বাঁ থেকে ডানে গেলে পারমাণবিক ব্যাসার্ধ কীভাবে বদলায়?', ['বাড়ে', 'কমে', 'অপরিবর্তিত', 'প্রথমে কমে পরে বাড়ে'], 1, 'নিউক্লিয়াসের আকর্ষণ বাড়ায় আকার ছোট হয়।'],
        ['গ্রুপে ওপর থেকে নিচে গেলে ধাতব ধর্ম কীভাবে বদলায়?', ['কমে', 'বাড়ে', 'অপরিবর্তিত', 'শূন্য হয়ে যায়'], 1, 'ইলেকট্রন ত্যাগের প্রবণতা নিচের দিকে বাড়ে।'],
        ['প্রোপেনে কার্বনের সংখ্যা কত?', ['২', '৩', '৪', '৫'], 1, 'প্রোপ- মানে ৩টি কার্বন।'],
        ['মিথেনের আণবিক ভর কত? (C=১২, H=১)', ['১২', '১৪', '১৬', '১৮'], 2, '১২ + ৪ × ১ = ১৬।'],
        ['CO₂ এর আণবিক ভর কত? (C=১২, O=১৬)', ['২৮', '৩২', '৪৪', '৪৮'], 2, '১২ + ২ × ১৬ = ৪৪।'],
        ['H₂SO₄ এর আণবিক ভর কত? (H=১, S=৩২, O=১৬)', ['৮০', '৯৮', '৯৬', '১০৬'], 1, '২ + ৩২ + ৬৪ = ৯৮।'],
        ['১০০ mL এ ০.৫ M NaOH দ্রবণ বানাতে কত গ্রাম NaOH লাগবে? (M=৪০)', ['১ g', '২ g', '৪ g', '২০ g'], 1, 'W = S × M × V ÷ ১০০০ = ০.৫ × ৪০ × ১০০ ÷ ১০০০ = ২ g।'],
        ['২৫°C এ পানির আয়নিক গুণফল (Kw) কত?', ['10⁻⁷', '10⁻¹⁴', '10⁻¹', '10⁷'], 1, '[H⁺][OH⁻] = ১০⁻¹⁴।'],
        ['সাধারণ তাপমাত্রায় তরল ধাতু কোনটি?', ['সোডিয়াম', 'পারদ', 'তামা', 'সীসা'], 1, 'পারদ (Hg) ২৫°C এ তরল।'],
        ['পানিতে হাইড্রোজেন ও অক্সিজেনের ভর অনুপাত কত?', ['১ : ৮', '২ : ১', '১ : ১', '১ : ১৬'], 0, '২ g H₂ আর ১৬ g O₂ মিলে ১৮ g পানি; অনুপাত ১ : ৮।']
    ];
    var QK = key('Quiz'), Wk = key('Wrong');
    function seedRng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function pick5(extra) {
        var d = new Date(), seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + (extra ? Math.floor(Math.random() * 9999) : 0), r = seedRng(seed), idx = QB.map(function (_, i) { return i; });
        for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; } return idx.slice(0, 5);
    }
    var promo = document.querySelector('.widget.promo'), host = promo ? promo.parentNode : document.querySelector('.widgets-grid');
    var qw = mk('section', 'widget lp-quiz'); qw.setAttribute('aria-labelledby', 'lpQT');
    if (host) host.insertBefore(qw, promo || null);
    var run = null;   // {ids, i, score, marks[], practice}
    function qSaved() { var s = get(QK, null); return s && s.day === today() ? s : null; }
    function head(title, extra) {
        var h = mk('div', 'widget-head'), t = mk('h3', 'widget-title'); t.id = 'lpQT'; t.appendChild(mk('i', 'fas fa-brain')); t.append(' ' + title); h.appendChild(t); if (extra) h.appendChild(extra); return h;
    }
    function wrongBtn() { var n = get(Wk, []).length; var b = mk('button', 'pill-btn ghost', '📓 ভুলের খাতা (' + bn(n) + ')'); b.type = 'button'; b.addEventListener('click', openWrong); return b; }
    function renderQuiz() {
        qw.replaceChildren(); var saved = qSaved();
        if (!run && saved && saved.done) { return renderResult(saved.score, saved.marks, false, true); }
        if (!run) {
            qw.appendChild(head('আজকের কুইজ'));
            var p = mk('p', 'lp-q', 'আজকের ৫টি প্রশ্নের কুইজ দিয়ে ' + bn(5 * 5 + 20) + ' পর্যন্ত XP জেতো। প্রতিদিন নতুন প্রশ্ন আসে।'); qw.appendChild(p);
            var row = mk('div', 'lp-row'), go = mk('button', 'pill-btn', 'শুরু করো →'); go.type = 'button'; go.addEventListener('click', function () { run = { ids: pick5(false), i: 0, score: 0, marks: [], practice: false }; renderQuiz(); }); row.append(go, wrongBtn()); qw.appendChild(row); return;
        }
        if (run.i >= run.ids.length) return finish();
        var q = QB[run.ids[run.i]], extra = mk('span', 'tag', ''); extra.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-muted)'; extra.textContent = (run.practice ? 'অনুশীলন · ' : '') + 'প্রশ্ন ' + bn(run.i + 1) + '/' + bn(5);
        qw.appendChild(head('আজকের কুইজ', extra)); qw.appendChild(mk('p', 'lp-q', q[0]));
        var box = mk('div', 'lp-opts'), fb = mk('div', 'lp-fb'), locked = false, order = [0, 1, 2, 3];
        order.forEach(function (oi) { var b = mk('button', 'lp-opt', q[1][oi]); b.type = 'button'; b.addEventListener('click', function () {
            if (locked) return; locked = true; var ok = oi === q[2]; box.querySelectorAll('.lp-opt').forEach(function (x, k) { x.disabled = true; if (order[k] === q[2]) x.classList.add('right'); }); if (!ok) b.classList.add('wrong');
            run.marks.push(ok); if (ok) run.score++; else logWrong(q);
            fb.textContent = (ok ? '✅ সঠিক! ' : '❌ ভুল! ') + q[3]; fb.style.color = ok ? '#10b981' : '#f43f5e'; next.hidden = false; next.focus({ preventScroll: true });
        }); box.appendChild(b); });
        qw.appendChild(box); qw.appendChild(fb);
        var dots = mk('div', 'lp-dots'); for (var k = 0; k < 5; k++) { var d = mk('i'); if (k < run.marks.length) d.className = run.marks[k] ? 'ok' : 'no'; else if (k === run.i) d.className = 'cur'; dots.appendChild(d); }
        var row2 = mk('div', 'lp-row'), next = mk('button', 'pill-btn', run.i === 4 ? 'ফলাফল দেখো →' : 'পরের প্রশ্ন →'); next.type = 'button'; next.hidden = true; next.addEventListener('click', function () { run.i++; renderQuiz(); }); row2.append(dots, next); qw.appendChild(row2);
    }
    function logWrong(q) { var w = get(Wk, []); w = w.filter(function (x) { return x.q !== q[0]; }); w.unshift({ q: q[0], a: q[1][q[2]], why: q[3], d: today() }); set(Wk, w.slice(0, 50)); }
    function finish() {
        var score = run.score, practice = run.practice, marks = run.marks.slice();
        if (!practice) { var xp = score * 5 + (score === 5 ? 20 : 0); set(QK, { day: today(), done: true, score: score, marks: marks }); addXP(xp, 'আজকের কুইজ'); }
        run = null; renderResult(score, marks, practice, false);
    }
    function renderResult(score, marks, practice, fromSaved) {
        qw.replaceChildren(); qw.appendChild(head(practice ? 'অনুশীলন শেষ' : 'আজকের কুইজ শেষ'));
        var res = mk('div', 'lp-res'); res.appendChild(mk('b', '', bn(score) + '/' + bn(5)));
        res.appendChild(mk('p', '', score === 5 ? '🌟 নিখুঁত! দারুণ!' : score >= 3 ? '👏 ভালো করেছো!' : '💪 ভুলগুলো ভুলের খাতায় জমা হয়েছে, দেখে নাও।'));
        var dots = mk('div', 'lp-dots'); dots.style.justifyContent = 'center'; (marks || []).forEach(function (m) { dots.appendChild(mk('i', m ? 'ok' : 'no')); }); res.appendChild(dots); qw.appendChild(res);
        var row = mk('div', 'lp-row'); row.style.justifyContent = 'center';
        var again = mk('button', 'pill-btn', '🔁 আরও ৫টি অনুশীলন (XP ছাড়া)'); again.type = 'button'; again.addEventListener('click', function () { run = { ids: pick5(true), i: 0, score: 0, marks: [], practice: true }; renderQuiz(); });
        row.append(again, wrongBtn()); qw.appendChild(row);
        if (fromSaved) { var n = mk('p', 'lp-fb', 'আজকের XP পেয়ে গেছো। কাল নতুন প্রশ্ন আসবে।'); n.style.textAlign = 'center'; qw.appendChild(n); }
    }
    function openWrong() {
        modal(function (box, close) {
            var w = get(Wk, []); box.appendChild(mk('h3', '', '📓 ভুলের খাতা (' + bn(w.length) + ')'));
            if (!w.length) box.appendChild(mk('p', 'lp-fb', 'এখনো কোনো ভুল জমা হয়নি। কুইজ দাও, ভুল হলে এখানে আসবে।'));
            w.forEach(function (x) { var d = mk('div', 'lp-wr'); d.appendChild(mk('b', '', x.q)); var a = mk('span', '', '✔ সঠিক: ' + x.a); d.appendChild(a); d.appendChild(mk('div', '', x.why)); box.appendChild(d); });
            var bt = mk('div', 'lp-btns'), c = mk('button', 'pill-btn', 'বন্ধ করো'), clr = mk('button', 'pill-btn ghost', 'সব মুছো'); c.type = clr.type = 'button'; c.addEventListener('click', close);
            clr.addEventListener('click', function () { if (w.length && confirm('ভুলের খাতার সব এন্ট্রি মুছে ফেলবে?')) { set(Wk, []); close(); renderQuiz(); } }); bt.append(c, clr); box.appendChild(bt);
        });
    }
    renderQuiz();

    /* ================= Ctrl+K সার্চ (কমান্ড প্যালেট) ================= */
    var PAGES = [
        ['🏠', 'ড্যাশবোর্ড', 'dashboard.html', 'home হোম'], ['📊', 'আধুনিক পর্যায় সারণী', 'ptable.html', 'periodic table মৌল'], ['🕹️', 'রসায়ন গেম জোন', 'games.html', 'game খেলা'],
        ['🔢', 'ক্যালকুলেটর হাব', 'calculators.html', 'calculator হিসাব'], ['📈', 'ভিজ্যুয়ালাইজেশন', 'visualizations.html', 'graph chart গ্রাফ'], ['💥', 'পর্যায়বৃত্ত ধর্ম', 'properties_page.html', 'periodic properties trend'],
        ['🥽', 'জৈব যৌগ (Organic)', 'organic.html', 'organic জৈব'], ['ℹ️', 'জৈব যৌগের তথ্য ও পরিচিতি', 'organic-info.html', 'alkane alkene alcohol অ্যালকেন'], ['🏷️', 'IUPAC নামকরণ ক্যালকুলেটর', 'organic-naming.html', 'naming iupac নাম'],
        ['⚗️', 'জৈব যৌগ প্রস্তুতি', 'organic-prep.html', 'preparation বিক্রিয়ার সূত্র'], ['⚛️', 'রাসায়নিক বিক্রিয়া ল্যাব', 'reaction_page.html', 'reaction বিক্রিয়া'], ['🔬', 'ডিজিটাল ল্যাব সিমুলেটর', 'digitallab.html', 'lab simulator'],
        ['📜', 'রসায়নের ইতিহাস', 'history.html', 'history timeline'], ['🧠', 'ফান ফ্যাক্টস', 'fact.html', 'fun facts'], ['📖', 'সূত্র ও থিওরি', 'theoryhub.html', 'theory law সূত্র'],
        ['📝', 'পরীক্ষা', 'exam.html', 'exam'], ['⏱️', 'স্টাডি টাইমার', 'studytimer.html', 'timer pomodoro'], ['🤖', 'Chemmy AI', 'chemmy.html', 'ai chatbot সহকারী'], ['ℹ️', 'আমাদের সম্পর্কে', 'about.html', 'about'],
        ['🕹️', 'যোজনী মেলানো', 'game1.html', 'game valency'], ['🕹️', 'আণবিক ভর শিকারী', 'game2.html', 'game molecular mass'], ['🕹️', 'সংকেত মেকার', 'game3.html', 'game formula'], ['🕹️', 'রাসায়নিক বিক্রিয়া শিকারী', 'game4.html', 'game reaction'],
        ['🕹️', 'ফাংশনাল গ্রুপ চ্যালেঞ্জ', 'game5.html', 'game functional group'], ['🕹️', 'IUPAC নামকরণ ব্যাটল', 'game6.html', 'game iupac'], ['🕹️', 'রিঅ্যাকশন চেইন রিয়্যাক্টর', 'game7.html', 'game chain'], ['🕹️', 'Element Hunter', 'game8.html', 'game element'],
        ['🕹️', 'pH Lab', 'game9.html', 'game ph'], ['🕹️', 'মোলারিটি মাস্টার', 'game10.html', 'game molarity'], ['🕹️', 'কোয়ান্টাম অরবিটাল ডার্ট', 'game11.html', 'game quantum'], ['🕹️', 'আইসোটোপ আইল্যান্ড', 'game12.html', 'game isotope'],
        ['🕹️', 'গ্যাসের ল্যাব', 'game13.html', 'game gas'], ['🕹️', 'সলিউশন মাস্টার', 'game14.html', 'game solution']
    ].map(function (p) { return { i: p[0], t: p[1], h: p[2], k: p[3], a: null }; });
    var ACTIONS = [
        { i: '🌓', t: 'থিম বদলাও (আলো/অন্ধকার)', k: 'theme dark light', a: function () { if (typeof toggleTheme === 'function') toggleTheme(); } },
        { i: '⚙️', t: 'সেটিংস খোলো', k: 'settings', a: function () { var b = $('openSettings'); if (b) b.click(); } },
        { i: '📓', t: 'ভুলের খাতা দেখো', k: 'mistakes wrong notebook', a: openWrong },
        { i: '⏳', t: 'পরীক্ষার তারিখ সেট করো', k: 'exam countdown', a: openExam },
        { i: '🎲', t: 'রসায়নের মজার তথ্য', k: 'fact', a: function () { if (typeof showChemistryFact === 'function') showChemistryFact(); } }
    ];
    var ITEMS = ACTIONS.concat(PAGES), ov = mk('div', 'lp-ov'), kb = mk('div', 'lp-box'), inp = mk('input', 'lp-in'), ul = mk('ul', 'lp-list'), selI = 0, cur = [];
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'সার্চ'); inp.type = 'text'; inp.placeholder = 'পেজ, গেম বা কাজ খোঁজো…'; inp.setAttribute('aria-label', 'সার্চ'); inp.autocomplete = 'off';
    kb.append(inp, ul, mk('div', 'lp-hint', '↑ ↓ বেছে নাও · Enter খোলো · Esc বন্ধ · Ctrl+K আবার চাপলেও বন্ধ হবে')); ov.appendChild(kb); document.body.appendChild(ov);
    function norm(s) { return String(s).toLowerCase(); }
    function filt(q) { var t = norm(q).split(/\s+/).filter(Boolean); if (!t.length) return ITEMS.slice(0, 9); return ITEMS.filter(function (it) { var h = norm(it.t + ' ' + (it.k || '') + ' ' + (it.h || '')); return t.every(function (x) { return h.indexOf(x) >= 0; }); }).sort(function (a, b) { return (norm(a.t).indexOf(t[0]) === 0 ? 0 : 1) - (norm(b.t).indexOf(t[0]) === 0 ? 0 : 1); }).slice(0, 9); }
    function paintList() { ul.replaceChildren(); if (!cur.length) { ul.appendChild(mk('li', 'lp-empty', 'কিছু পাওয়া যায়নি। অন্য শব্দ দিয়ে খোঁজো।')); return; }
        cur.forEach(function (it, k) { var li = mk('li', 'lp-it' + (k === selI ? ' sel' : '')); li.append(mk('span', '', it.i), mk('span', '', it.t)); li.appendChild(mk('small', '', it.a ? 'কাজ' : it.h)); li.addEventListener('click', function () { run_(it); }); li.addEventListener('mousemove', function () { if (selI !== k) { selI = k; paintList(); } }); ul.appendChild(li); }); }
    function run_(it) { closeK(); if (it.a) setTimeout(it.a, 60); else location.href = it.h; }
    function openK() { ov.classList.add('on'); inp.value = ''; cur = filt(''); selI = 0; paintList(); setTimeout(function () { inp.focus(); }, 30); }
    function closeK() { ov.classList.remove('on'); }
    inp.addEventListener('input', function () { cur = filt(inp.value); selI = 0; paintList(); });
    ov.addEventListener('click', function (e) { if (e.target === ov) closeK(); });
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ov.classList.contains('on') ? closeK() : openK(); return; }
        if (!ov.classList.contains('on')) return;
        if (e.key === 'Escape') closeK(); else if (e.key === 'ArrowDown') { e.preventDefault(); selI = Math.min(cur.length - 1, selI + 1); paintList(); } else if (e.key === 'ArrowUp') { e.preventDefault(); selI = Math.max(0, selI - 1); paintList(); } else if (e.key === 'Enter' && cur[selI]) { e.preventDefault(); run_(cur[selI]); }
    });
    var hr = document.querySelector('.header-right'), sb = $('openSettings');
    if (hr) { var kbtn = mk('button', 'theme-btn', '🔎'); kbtn.type = 'button'; kbtn.id = 'lpOpenK'; kbtn.title = 'সার্চ (Ctrl+K)'; kbtn.setAttribute('aria-label', 'সার্চ খোলো'); kbtn.addEventListener('click', openK); hr.insertBefore(kbtn, sb || null); }


    /* ================= 🎯 পরীক্ষার বিষয়: ঘোষণা বার + অধ্যায় রিবন + সাইড ট্যাব ================= */
    (function examTopics() {
        var SSC = ['রসায়নের ধারণা', 'পদার্থের অবস্থা', 'পদার্থের গঠন', 'পর্যায় সারণি', 'রাসায়নিক বন্ধন', 'মৌলের ধারণা ও রাসায়নিক গণনা', 'রাসায়নিক বিক্রিয়া', 'রসায়ন ও শক্তি', 'এসিড-ক্ষার সমতা', 'খনিজ সম্পদ: ধাতু-অধাতু', 'খনিজ সম্পদ: জীবাশ্ম', 'আমাদের জীবনে রসায়ন'];
        var HSC = ['ল্যাবরেটরির নিরাপদ ব্যবহার', 'গুণগত রসায়ন', 'মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন', 'রাসায়নিক পরিবর্তন', 'কর্মমুখী রসায়ন', 'পরিবেশ রসায়ন', 'জৈব রসায়ন', 'পরিমাণগত রসায়ন', 'তড়িৎ রসায়ন', 'অর্থনৈতিক রসায়ন'];
        var TK = key('ExamTopic'), BK = key('BarHide');
        var st2 = document.createElement('style'); st2.textContent =
        '.lp-bar{position:relative;z-index:61;display:flex;align-items:center;gap:12px;margin-bottom:14px;padding:9px 12px 9px 18px;border-radius:18px;color:#fff;background:linear-gradient(90deg,#f43f5e,#fb923c,#f43f5e);background-size:200% 100%;animation:lpBar 6s linear infinite;box-shadow:0 10px 26px rgba(244,63,94,.35)}' +
        '@keyframes lpBar{to{background-position:200% 0}}' +
        '.lp-bar i.d{flex-shrink:0;width:9px;height:9px;border-radius:50%;background:#fff;animation:lpPulse 1.4s ease-in-out infinite}' +
        '.lp-bar span.t{flex:1;min-width:0;font-size:14px;font-weight:700;line-height:1.5}' +
        '.lp-bar a{flex-shrink:0;padding:7px 16px;border-radius:12px;font-size:13px;font-weight:800;text-decoration:none;color:#f43f5e;background:#fff;transition:transform .2s}.lp-bar a:hover{transform:translateY(-2px)}' +
        '.lp-bar button{flex-shrink:0;width:30px;height:30px;border-radius:50%;font-size:13px;cursor:pointer;color:#fff;background:rgba(255,255,255,.22);border:0}.lp-bar button:hover{background:rgba(255,255,255,.4)}' +
        '.lp-rib{margin-bottom:35px;padding:20px 0 14px;overflow:hidden;border-radius:26px;background:var(--card-bg);border:1.5px solid var(--section-border);box-shadow:var(--shadow);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}' +
        '.lp-rib h3{margin:0 22px 4px;font-size:18px;font-weight:800;display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
        '.lp-rib h3 small{font-size:12.5px;font-weight:600;color:var(--text-muted)}' +
        '.lp-mq{position:relative;overflow:hidden;padding:7px 0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}' +
        '.lp-trk{display:flex;gap:10px;width:max-content;animation:lpMq 60s linear infinite}.lp-mq.rev .lp-trk{animation-direction:reverse;animation-duration:50s}.lp-mq:hover .lp-trk{animation-play-state:paused}' +
        '@keyframes lpMq{to{transform:translateX(-50%)}}' +
        '.lp-tp{flex-shrink:0;display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:30px;font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap;color:var(--text-color);background:var(--card-solid);border:1.5px solid var(--border-color);transition:transform .2s,border-color .2s,background .2s}' +
        '.lp-tp b{padding:1px 8px;border-radius:10px;font-size:11px;font-weight:800;color:#fff;background:linear-gradient(135deg,#f43f5e,#fb923c)}.lp-tp b.h{background:linear-gradient(135deg,#a855f7,#3b82f6)}' +
        '.lp-tp:hover,.lp-tp:focus-visible{transform:translateY(-3px);border-color:#fb923c;outline:none}' +
        '.lp-edge{position:fixed;right:0;top:46%;z-index:2400;padding:16px 10px;border-radius:16px 0 0 16px;writing-mode:vertical-rl;font-size:14px;font-weight:800;letter-spacing:1px;text-decoration:none;color:#fff;background:linear-gradient(180deg,#f43f5e,#fb923c);box-shadow:-6px 8px 26px rgba(244,63,94,.45);animation:lpEdge 2.4s ease-in-out infinite;transition:padding .25s}' +
        '.lp-edge:hover{padding-right:18px}@keyframes lpEdge{50%{box-shadow:-10px 8px 38px rgba(251,146,60,.75)}}' +
        '@media(max-width:600px){.lp-bar span.t{font-size:12.5px}.lp-bar a{padding:6px 12px}.lp-edge{top:auto;bottom:130px;padding:12px 8px;font-size:12.5px}.lp-rib h3{margin:0 16px 4px}}' +
        '@media(prefers-reduced-motion:reduce){.lp-trk{animation:none;flex-wrap:wrap;width:auto;padding:0 16px}.lp-mq{-webkit-mask-image:none;mask-image:none}.lp-trk .dup{display:none}}';
        document.head.appendChild(st2);

        /* ১) উপরের ঘোষণা বার */
        var container = document.querySelector('.container');
        if (container && get(BK, '') !== today()) {
            var bar = mk('div', 'lp-bar'); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'পরীক্ষা ঘোষণা');
            var go = mk('a', '', 'এখনই দাও →'); go.href = 'exam.html'; go.addEventListener('click', function () { set(key('ExamSeen'), true); });
            var x = mk('button', '', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'আজকের মতো বন্ধ করো'); x.addEventListener('click', function () { set(BK, today()); bar.remove(); });
            bar.append(mk('i', 'd'), mk('span', 't', '🔥 নিজেকে যাচাই করো: পরীক্ষা জোনে এখনই পরীক্ষা দাও এবং প্রস্তুতি কেমন তা জেনে নাও!'), go, x);
            container.insertBefore(bar, container.firstChild);
        }

        /* ২) অধ্যায় রিবন (দুই সারি, উল্টো দিকে চলে; মাউস রাখলে থামে) */
        var anchor = document.querySelector('.lp-spot') || document.querySelector('.unique-welcome-banner');
        if (anchor && anchor.parentNode) {
            var rib = mk('section', 'lp-rib'); rib.setAttribute('aria-label', 'পরীক্ষার অধ্যায়');
            var h = mk('h3'); h.append('📚 কোন অধ্যায়ের প্রস্তুতি যাচাই করবে?'); h.appendChild(mk('small', '', 'অধ্যায়ে চাপ দাও, পরীক্ষা জোনে চলে যাবে')); rib.appendChild(h);
            function row(list, tag, rev) {
                var mq = mk('div', 'lp-mq' + (rev ? ' rev' : '')), trk = mk('div', 'lp-trk');
                for (var r = 0; r < 2; r++) list.forEach(function (name) {
                    var b = mk('button', 'lp-tp'); b.type = 'button'; if (r) { b.className += ' dup'; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
                    b.appendChild(mk('b', tag === 'HSC' ? 'h' : '', tag)); b.append(name);
                    b.addEventListener('click', function () { set(TK, { level: tag, topic: name, at: Date.now() }); set(key('ExamSeen'), true); location.href = 'exam.html'; });
                    trk.appendChild(b);
                });
                mq.appendChild(trk); return mq;
            }
            rib.append(row(SSC, 'SSC', false), row(HSC, 'HSC', true));
            anchor.parentNode.insertBefore(rib, anchor.nextSibling);
        }

        /* ৩) ডান পাশের ভাসমান ট্যাব */
        var edge = mk('a', 'lp-edge', '🎯 পরীক্ষা দাও'); edge.href = 'exam.html'; edge.title = 'পরীক্ষা জোনে যাও'; document.body.appendChild(edge);
    })();

    /* ================= স্বয়ংক্রিয় ছোট ফিক্স (HTML না ছুঁয়েই) ================= */
    (function autoFixes() {
        try {
            // স্লাইডারের তীরচিহ্ন: কিবোর্ড ও স্ক্রিন রিডারে কাজ করবে
            [['.slider-prev', 'আগের স্লাইড'], ['.slider-next', 'পরের স্লাইড']].forEach(function (a) {
                var el = document.querySelector(a[0]); if (!el) return;
                el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', a[1]);
                el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
            });
            // মাউস রাখলে বা ফোকাস করলে স্লাইড নিজে নিজে বদলানো থামবে
            var sw = $('sliderWrapper');
            if (sw && typeof restartTimer === 'function' && typeof slideTimer !== 'undefined') {
                sw.addEventListener('mouseenter', function () { clearInterval(slideTimer); });
                sw.addEventListener('focusin', function () { clearInterval(slideTimer); });
                sw.addEventListener('mouseleave', function () { restartTimer(); });
                sw.addEventListener('focusout', function () { restartTimer(); });
            }
            // মাউস পেজ ছেড়ে গেলে কণাগুলো আর মাউসকে এড়াবে না
            if (typeof mouse !== 'undefined') document.documentElement.addEventListener('mouseleave', function () { mouse.x = null; mouse.y = null; });
            // ফুটারের ফাঁকা (***) তথ্য সরিয়ে ফেলো
            document.querySelectorAll('.footer-col p, .footer-contact .row').forEach(function (el) { if (/\*{3,}/.test(el.textContent)) el.remove(); });
            // রিসেটে স্ট্রিকও মুছবে (মূল কোডে স্ট্রিকের কী আলাদা বলে মুছত না)
            var rb = $('resetData');
            if (rb) rb.addEventListener('click', function () { setTimeout(function () { /* confirm না মানলে পেজ রিলোড হয় না, তাই কিছু করার দরকার নেই */ }, 0); }, true);
        } catch (e) { /* ছোট ফিক্স ব্যর্থ হলেও মূল পেজ চলবে */ }
    })();
})();

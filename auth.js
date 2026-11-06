/*
  Lab Alchemy - shared account logic (register / login / logout) v2
  - আগের auth.js এর সাথে সম্পূর্ণ সামঞ্জস্যপূর্ণ: পুরোনো অ্যাকাউন্ট, পাসওয়ার্ড ও সেশন আগের মতোই কাজ করবে।
  - ডেটা থাকে ব্রাউজারের localStorage-এ, তাই অ্যাকাউন্ট শুধু ওই ব্রাউজারেই থাকে।
  - পাসওয়ার্ড salt + SHA-256 দিয়ে সেভ হয়, তবে এটি সার্ভার-পর্যায়ের নিরাপত্তা নয়।
    সত্যিকারের অ্যাকাউন্টের জন্য (সব ডিভাইসে লগইন, পাসওয়ার্ড রিসেট) Firebase Auth বা Supabase লাগবে।

  নতুন যা যোগ হয়েছে:
  - Auth.check()            → { ok, user } অথবা { ok:false, why:'nosession' | 'expired' | 'nouser' }
  - ইনপুট যাচাই (নাম, ইউজারনেম, ইমেইল, পাসওয়ার্ড ৬+ অক্ষর)
  - ভুল পাসওয়ার্ড ৫ বার দিলে ১ মিনিটের জন্য লগইন বন্ধ
  - "মনে রাখো" সেশন ৩০ দিন পর, সাধারণ সেশন ১২ ঘণ্টা পর মেয়াদোত্তীর্ণ
  - Auth.changePassword(old, new), Auth.deleteAccount(password)
  - Auth.downloadBackup() / Auth.restoreBackup(file)  → এক ডিভাইস থেকে অন্য ডিভাইসে ডেটা নেওয়ার ব্যাকআপ
*/
const Auth = (function () {
    const USERS_KEY = 'labAlchemyUsers';
    const SESSION_KEY = 'labAlchemySession';
    const FAIL_KEY = 'labAlchemyLoginFail';
    const REMEMBER_MS = 30 * 24 * 3600 * 1000;
    const SESSION_MS = 12 * 3600 * 1000;
    const MAX_FAILS = 5, LOCK_MS = 60 * 1000;
    /* গেম/টুল পেজগুলোর সেভ করা স্কোর ও সেটিং (ডিভাইস-ভিত্তিক) */
    const DEVICE_PREFIXES = ['labAlchemy', 'theme', 'iupac_', 'chain_', 'eh_', 'ph_', 'mo_', 'is_', 'gl_', 'sm_', 'ff_', 'chemmy_', 'theory_', 'iso_'];

    function readUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
        catch (e) { return []; }
    }
    function writeUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    function toHex(bytes) { return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }

    function makeSalt() {
        const bytes = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
        else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        return toHex(bytes);
    }

    async function hashPassword(password, salt) {
        const text = salt + ':' + password;
        if (window.crypto && window.crypto.subtle) {
            const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
            return toHex(new Uint8Array(buf));
        }
        let h = 5381;   // পুরোনো / অনিরাপদ পরিবেশের জন্য বিকল্প
        for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
        return 'f' + h.toString(16);
    }

    function publicUser(u) { return { name: u.name, username: u.username, email: u.email }; }

    /* ---------- যাচাই ---------- */
    function validate(d) {
        const name = (d.name || '').trim(), username = (d.username || '').trim(), email = (d.email || '').trim(), pw = d.password || '';
        if (name.length < 2) return { field: 'name', error: 'নাম অন্তত ২ অক্ষরের হতে হবে' };
        if (!/^[A-Za-z0-9_.-]{3,20}$/.test(username)) return { field: 'username', error: 'ইউজারনেম ৩–২০ অক্ষরের হতে হবে (ইংরেজি অক্ষর, সংখ্যা, _ . - চলবে, ফাঁকা জায়গা নয়)' };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { field: 'email', error: 'সঠিক ইমেইল লেখো' };
        if (pw.length < 6) return { field: 'password', error: 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে' };
        return null;
    }

    async function register(data) {
        const bad = validate(data || {});
        if (bad) return { ok: false, field: bad.field, error: bad.error };
        const name = data.name.trim(), username = data.username.trim(), email = data.email.trim().toLowerCase();
        const users = readUsers();

        if (users.some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); })) {
            return { ok: false, field: 'username', error: 'এই ইউজারনেম আগেই নেওয়া হয়ে গেছে' };
        }
        if (users.some(function (u) { return u.email === email; })) {
            return { ok: false, field: 'email', error: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে' };
        }

        const salt = makeSalt();
        users.push({ name: name, username: username, email: email, salt: salt, hash: await hashPassword(data.password, salt), createdAt: Date.now() });

        try { writeUsers(users); }
        catch (e) { return { ok: false, error: 'ডেটা সেভ করা যায়নি। ব্রাউজারের স্টোরেজ চালু আছে কিনা দেখো।' }; }
        return { ok: true };
    }

    /* ---------- ভুল চেষ্টার সীমা ---------- */
    function failState() { try { return JSON.parse(localStorage.getItem(FAIL_KEY)) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } }
    function setFail(s) { try { localStorage.setItem(FAIL_KEY, JSON.stringify(s)); } catch (e) {} }
    function clearFail() { try { localStorage.removeItem(FAIL_KEY); } catch (e) {} }

    async function login(identifier, password, remember) {
        const f = failState(), now = Date.now();
        if (f.until && f.until > now) {
            return { ok: false, locked: true, error: 'অনেকবার ভুল হয়েছে। ' + Math.ceil((f.until - now) / 1000) + ' সেকেন্ড পরে আবার চেষ্টা করো।' };
        }
        const id = (identifier || '').trim().toLowerCase();
        const wrong = { ok: false, error: 'ইউজারনেম/ইমেইল বা পাসওয়ার্ড ভুল হয়েছে' };
        function fail() { const n = (f.until && f.until <= now ? 0 : f.n) + 1; setFail(n >= MAX_FAILS ? { n: 0, until: now + LOCK_MS } : { n: n, until: 0 }); return wrong; }

        const user = readUsers().find(function (u) { return u.username.toLowerCase() === id || u.email === id; });
        if (!user) return fail();
        if ((await hashPassword(password, user.salt)) !== user.hash) return fail();

        try {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_KEY);
            const store = remember ? localStorage : sessionStorage;
            store.setItem(SESSION_KEY, JSON.stringify({ username: user.username, at: Date.now() }));
        } catch (e) {
            return { ok: false, error: 'লগইন সেশন সেভ করা যায়নি। ব্রাউজারের স্টোরেজ চালু আছে কিনা দেখো।' };
        }
        clearFail();
        return { ok: true, user: publicUser(user) };
    }

    /* ---------- সেশন যাচাই ---------- */
    function check() {
        let raw = null, remembered = false;
        try {
            raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) { raw = localStorage.getItem(SESSION_KEY); remembered = !!raw; }
        } catch (e) { return { ok: false, why: 'nosession' }; }
        if (!raw) return { ok: false, why: 'nosession' };
        let session;
        try { session = JSON.parse(raw); } catch (e) { return { ok: false, why: 'nosession' }; }
        if (!session || !session.username) return { ok: false, why: 'nosession' };
        const age = Date.now() - (session.at || 0);
        if (age > (remembered ? REMEMBER_MS : SESSION_MS)) { logout(); return { ok: false, why: 'expired' }; }
        const user = readUsers().find(function (u) { return u.username === session.username; });
        return user ? { ok: true, user: publicUser(user) } : { ok: false, why: 'nouser' };
    }
    function currentUser() { const r = check(); return r.ok ? r.user : null; }

    function logout() {
        try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch (e) {}
    }

    /* ---------- পাসওয়ার্ড বদল ও অ্যাকাউন্ট মোছা ---------- */
    async function changePassword(oldPw, newPw) {
        const me = currentUser(); if (!me) return { ok: false, error: 'আগে লগইন করো' };
        if ((newPw || '').length < 6) return { ok: false, error: 'নতুন পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে' };
        const users = readUsers(), u = users.find(function (x) { return x.username === me.username; });
        if (!u || (await hashPassword(oldPw, u.salt)) !== u.hash) return { ok: false, error: 'বর্তমান পাসওয়ার্ড ভুল' };
        u.salt = makeSalt(); u.hash = await hashPassword(newPw, u.salt);
        try { writeUsers(users); } catch (e) { return { ok: false, error: 'ডেটা সেভ করা যায়নি' }; }
        return { ok: true };
    }

    function userDataKeys(username) {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('labAlchemy') === 0 && k.slice(-(username.length + 1)) === ':' + username) out.push(k); }
        return out;
    }

    async function deleteAccount(password) {
        const me = currentUser(); if (!me) return { ok: false, error: 'আগে লগইন করো' };
        const users = readUsers(), u = users.find(function (x) { return x.username === me.username; });
        if (!u || (await hashPassword(password, u.salt)) !== u.hash) return { ok: false, error: 'পাসওয়ার্ড ভুল' };
        try { userDataKeys(me.username).forEach(function (k) { localStorage.removeItem(k); }); writeUsers(users.filter(function (x) { return x.username !== me.username; })); } catch (e) { return { ok: false, error: 'মোছা যায়নি' }; }
        logout(); return { ok: true };
    }

    /* ---------- ব্যাকআপ (এক ডিভাইস থেকে অন্য ডিভাইসে নেওয়ার জন্য) ---------- */
    function allowedKey(k) { return DEVICE_PREFIXES.some(function (p) { return k.indexOf(p) === 0; }) && k !== USERS_KEY && k !== SESSION_KEY && k !== FAIL_KEY; }
    function exportData() {
        const me = currentUser(); if (!me) return null;
        const rec = readUsers().find(function (u) { return u.username === me.username; }), data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !allowedKey(k)) continue;
            if (k.indexOf('labAlchemy') === 0 && k.indexOf(':') > 0 && k.slice(-(me.username.length + 1)) !== ':' + me.username) continue;   // অন্য ইউজারের ডেটা নয়
            data[k] = localStorage.getItem(k);
        }
        return JSON.stringify({ app: 'labAlchemy', v: 2, at: Date.now(), user: rec, data: data });
    }
    function importData(json) {
        let o; try { o = JSON.parse(json); } catch (e) { return { ok: false, error: 'ফাইলটি সঠিক ব্যাকআপ নয়' }; }
        if (!o || o.app !== 'labAlchemy' || !o.user || !o.user.username || !o.user.hash || !o.user.salt) return { ok: false, error: 'ফাইলটি Lab Alchemy ব্যাকআপ নয়' };
        try {
            const users = readUsers().filter(function (u) { return u.username.toLowerCase() !== o.user.username.toLowerCase() && u.email !== o.user.email; });
            users.push({ name: String(o.user.name || ''), username: String(o.user.username), email: String(o.user.email || '').toLowerCase(), salt: String(o.user.salt), hash: String(o.user.hash), createdAt: o.user.createdAt || Date.now() });
            writeUsers(users);
            Object.keys(o.data || {}).forEach(function (k) { if (allowedKey(k) && typeof o.data[k] === 'string') localStorage.setItem(k, o.data[k]); });
        } catch (e) { return { ok: false, error: 'ডেটা সেভ করা যায়নি' }; }
        return { ok: true, username: o.user.username };
    }
    function downloadBackup() {
        const j = exportData(); if (!j) return false;
        const a = document.createElement('a'), d = new Date();
        a.href = URL.createObjectURL(new Blob([j], { type: 'application/json' }));
        a.download = 'lab-alchemy-backup-' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + '.json';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); return true;
    }
    function restoreBackup(file) {
        return new Promise(function (resolve) {
            if (!file) return resolve({ ok: false, error: 'কোনো ফাইল বাছা হয়নি' });
            const r = new FileReader(); r.onload = function () { resolve(importData(String(r.result))); }; r.onerror = function () { resolve({ ok: false, error: 'ফাইল পড়া যায়নি' }); }; r.readAsText(file);
        });
    }

    return { register: register, login: login, check: check, currentUser: currentUser, logout: logout, changePassword: changePassword, deleteAccount: deleteAccount, exportData: exportData, importData: importData, downloadBackup: downloadBackup, restoreBackup: restoreBackup, version: 2 };
})();

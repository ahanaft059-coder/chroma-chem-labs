/*
  Lab Alchemy - shared account logic (register / login / logout)
  Data is stored in the browser's localStorage, so accounts only exist
  in the browser where they were created. Passwords are salted + hashed
  (SHA-256) before saving, but this is NOT real server-side security.
*/
const Auth = (function () {
    const USERS_KEY = 'labAlchemyUsers';
    const SESSION_KEY = 'labAlchemySession';

    function readUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
        catch (e) { return []; }
    }

    function writeUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function toHex(bytes) {
        return Array.from(bytes).map(function (b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }

    function makeSalt() {
        const bytes = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(bytes);
        } else {
            for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        }
        return toHex(bytes);
    }

    async function hashPassword(password, salt) {
        const text = salt + ':' + password;
        if (window.crypto && window.crypto.subtle) {
            const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
            return toHex(new Uint8Array(buf));
        }
        // Fallback for very old / non-secure contexts
        let h = 5381;
        for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
        return 'f' + h.toString(16);
    }

    function publicUser(u) {
        return { name: u.name, username: u.username, email: u.email };
    }

    async function register(data) {
        const name = (data.name || '').trim();
        const username = (data.username || '').trim();
        const email = (data.email || '').trim().toLowerCase();
        const users = readUsers();

        if (users.some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); })) {
            return { ok: false, field: 'username', error: 'এই ইউজারনেম আগেই নেওয়া হয়ে গেছে' };
        }
        if (users.some(function (u) { return u.email === email; })) {
            return { ok: false, field: 'email', error: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে' };
        }

        const salt = makeSalt();
        users.push({
            name: name,
            username: username,
            email: email,
            salt: salt,
            hash: await hashPassword(data.password, salt),
            createdAt: Date.now()
        });

        try { writeUsers(users); }
        catch (e) { return { ok: false, error: 'ডেটা সেভ করা যায়নি। ব্রাউজারের স্টোরেজ চালু আছে কিনা দেখো।' }; }

        return { ok: true };
    }

    async function login(identifier, password, remember) {
        const id = (identifier || '').trim().toLowerCase();
        const wrong = { ok: false, error: 'ইউজারনেম/ইমেইল বা পাসওয়ার্ড ভুল হয়েছে' };

        const user = readUsers().find(function (u) {
            return u.username.toLowerCase() === id || u.email === id;
        });
        if (!user) return wrong;
        if ((await hashPassword(password, user.salt)) !== user.hash) return wrong;

        try {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_KEY);
            // Always keep a copy in localStorage so the session survives page changes
            // in every browser; "remember" only decides whether it expires with the tab.
            const payload = JSON.stringify({ username: user.username, at: Date.now(), remember: !!remember });
            localStorage.setItem(SESSION_KEY, payload);
            if (!remember) sessionStorage.setItem(SESSION_KEY, payload);
        } catch (e) {
            return { ok: false, error: 'লগইন সেশন সেভ করা যায়নি। ব্রাউজারের স্টোরেজ চালু আছে কিনা দেখো।' };
        }
        return { ok: true, user: publicUser(user) };
    }

    // Returns { user, why } - why: 'storage' | 'nosession' | 'nouser' | null
    function check() {
        let raw = null;
        try { raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY); }
        catch (e) { return { user: null, why: 'storage' }; }
        if (!raw) return { user: null, why: 'nosession' };
        try {
            const session = JSON.parse(raw);
            const user = readUsers().find(function (u) { return u.username === session.username; });
            return user ? { user: publicUser(user), why: null } : { user: null, why: 'nouser' };
        } catch (e) { return { user: null, why: 'nosession' }; }
    }
    function currentUser() { return check().user; }

    function logout() {
        try {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_KEY);
        } catch (e) {}
    }

    return { register: register, login: login, currentUser: currentUser, check: check, logout: logout };
})();

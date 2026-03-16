const cache = {};

export async function colorUsernames() {
  const els = document.querySelectorAll('a.username:not([data-colored])');
  if (!els.length) return;

  els.forEach(el => el.setAttribute('data-colored', '1'));

  const usernames = [...new Set(
    [...els]
      .map(el => {
        const match = (el.getAttribute('href') || '').match(/\/user\/([^/?#]+)/);
        return match ? decodeURIComponent(match[1]) : null;
      })
      .filter(Boolean)
  )];

  await Promise.all(usernames.map(async (uname) => {
    try {
      if (cache[uname] === undefined) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_by_username`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ p_username: uname })
        });
        const data = await res.json();
        cache[uname] = {
          russian: data?.[0]?.russian || false,
          role: data?.[0]?.role || 'user'
        };
      }

      const { russian, role } = cache[uname];
      document.querySelectorAll(`a.username[href="/user/${encodeURIComponent(uname)}"]`).forEach(el => {
        if (role === 'admin')       el.classList.add('admin');
        else if (role === 'mod')    el.classList.add('mod');
        else if (russian)           el.classList.add('russian');
        else                        el.classList.add('foreign');
      });
    } catch {
      document.querySelectorAll(`a.username[href="/user/${encodeURIComponent(uname)}"]`).forEach(el => {
        el.classList.add('foreign');
      });
    }
  }));
}

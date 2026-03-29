// 'use client';

// import { useState, useEffect } from 'react';
// import { useTranslations } from 'next-intl';
// import UsernameLink from '@/components/UsernameLink';
// import UserAvatar from "@/components/UserAvatar";
// import { db } from '@/lib/config';

// const SUPABASE_URL = 'https://ytyhhmwnnlkhhpvsurlm.supabase.co';

// export default function ProfileTemplatePage() {
//   const t = useTranslations('settings');

//   const [profile, setProfile] = useState(null);
//   const [meta, setMeta] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [username, setUsername] = useState('');
//   const [message, setMessage] = useState(null);

//   useEffect(() => {
//     async function load() {
//       if (!db) return;
//       const { data: { user } } = await db.auth.getUser();
//       if (!user) { window.location.href = '/'; return; }
//       const m = user.user_metadata || {};
//       const uname = m.username;
//       setUsername(uname);
//       setMeta(m);
//       const { data: profileData } = await db.from('profiles').select('*').eq('id', user.id).single();
//       setProfile(profileData);

//       setLoading(false);
//     }
//     load();
//   }, []);

//   if (loading) return <div className="loading">{t('loading')}</div>;

//   return (
//     <div id="content_wrap">
//       <div id="content">
//         <div className={`userprofile wrap`}>

//           {/* SIDEBAR */}
//           <div className={`content_right sidebar`}>
//             <div className="center">
//               <h3 id="profile_username_wrap">
//                 <UsernameLink username={username} />
//               </h3>
//             </div>
//             <div className="center">
//               <div style={{ display: 'inline-block', textAlign: 'center' }}>
//                     <UserAvatar
//                         username={username}
//                         size={100}
//                         className="p200"
//                     />
//               </div>
//             </div>
//             <nav className="settingsNav">
//               <ul className="leftmenu">
//                 <li><a href={`/user/${username}`}>{t('nav.myPage')}</a></li>
//                 <li><a href="/profile">{t('nav.settings')}</a></li>
//                 <li><a href="/profile/change-password" className="selected">{t('nav.changePassword')}</a></li>
//                 <li><a href="/profile/blacklist">{t('nav.blacklist')}</a></li>
//               </ul>
//             </nav>
//           </div>

//           <div className={`content_left panel`}>
//             <h1 className="pageTitle">{t('changePassword.pageTitle')}</h1>
//             {message && (
//               <div className={`msg ${message.type}`}>{message.text}</div>
//             )}

//             <section className="section">
//               <h2 className="sectionTitle">Text</h2>
//               <hr className="divider" />
//               <div className="field">
//                 <span className="label">Text</span>
//               </div>
//             </section>

//           </div>

//         </div>
//         <div style={{ clear: 'both' }} />
//       </div>
//     </div>
//   );
// }

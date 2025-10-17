import React , {createContext,useContext,useEffect,useState, useCallback} from 'react'
// Proxy auth via backend API
const API_BASE = import.meta?.env?.VITE_BACKEND_URL || 'http://localhost:3001';
const fetchJson = async (url, options = {}) => {
  const resp = await fetch(url, { credentials: 'include', ...options });
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try { const e = await resp.json(); msg = e.error || msg; } catch {}
    throw new Error(msg);
  }
  return resp.json();
};


const UserAuthContextSupabase = createContext();

export function UserAuthContextSupabaseProvider({children}) {
  const [user,setUser] = useState(null); // app user profile (not raw auth user)
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null); // raw auth user
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false); // ensure we don't flip loading=false before /me returns
  const [errorContext, setErrorContext] = useState({});

  const signIn = async (email,password) =>{
  const data = await fetchJson(`${API_BASE}/api/auth/signin`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})});
    // Minimal session handling on client: store user id; for protected routes, rely on backend checks or pass token later if needed
    setSession(data.session || null);
    setAuthUser(data.user || null);
    return data;
  }

  const signUp = async (email,password) => {
  const data = await fetchJson(`${API_BASE}/api/auth/signup`,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password})});
    setSession(data.session || null);
    setAuthUser(data.user || null);
    return data;
  }

  const logOut = async () => {
    await fetchJson(`${API_BASE}/api/auth/signout`,{ method:'POST' });
    setSession(null);
    setAuthUser(null);
  }

    

    // useEffect(()=>{
    //     const unsubscribe = onAuthStateChanged(auth,(currentUser)=>{
    //         console.log("Auth",currentUser);
    //         setUser(currentUser);
    //     })

    //     return ()=>{
    //         unsubscribe();
    //     }
    // },[])
    useEffect(()=>{
      // Hydrate from backend cookie JWT
      (async () => {
        try {
          const data = await fetchJson(`${API_BASE}/api/auth/me`);
          if (data?.user) {
            setSession({});
            setAuthUser({ id: data.user.user_id, email: data.user.email });
          } else {
            setSession(null); setAuthUser(null);
          }
        } catch {
          setSession(null); setAuthUser(null);
        } finally {
          setHydrated(true);
        }
      })();
    },[])

    // const fetchAppUser = useCallback( async (uid) => {
    //   if(!uid){ setUser(null); return; }
    //   try {
    //     // Attempt with user_id first
    //     let { data, error, status } = await supabase
    //       .from('app_users')
    //       .select('*')
    //       .eq('user_id', uid)
    //       .single();
    //       console.log("fetchAppUser data", data, error, status);

    //     let {data : authDetail,error : errEmail} = await supabase
    //       .from('auth.users')
    //       .select('email, email_confirmed_at')
    //       .eq('id', uid)
    //       .single();
    //       if(errEmail){
    //         throw errEmail
    //       }
      
          
    //     if (error && status === 406) error = null; // empty result
    //     // if (error) {
    //     //   // fallback attempt with id
    //     //   let fb = await supabase
    //     //     .from('app_users')
    //     //     .select('*')
    //     //     .eq('id', uid)
    //     //     .single();
    //     //   if (!fb.error) {
    //     //     data = fb.data;
    //     //   }
    //     // }
    //     if (data) {
    //       setUser({
    //         ...data,
    //         ...authDetail,
    //         role: data.role || 'patient'
    //       })
    //     } else {
    //       setUser(null);
    //     }
    //   } catch (e) {
    //     console.log('fetchAppUser error', e);
    //     setUser(null);
    //   } finally {
    //     setLoading(false);
    //   }
    // },[]);

    const fetchAppUser = useCallback(async (uid) => {
  setLoading(true);
  try {
    if (!uid) { setUser(null); return; }

    // รันขนาน เพื่อลด latency
    const [appUsersRes, authRes] = await Promise.all([
      fetchJson(`${API_BASE}/api/users/${uid}`),
    ]);
    const userPayload = appUsersRes?.user || null;
    setUser(userPayload ? { ...userPayload, role: userPayload.role || 'patient' } : null);
  } catch (e) {
    console.error('fetchAppUser error', e);
    setUser(null);
  } finally {
    setLoading(false);
  }
}, [setLoading, setUser]);


    useEffect(()=>{
      if (!hydrated) return; // wait until /me completed
      if (authUser?.id) {
        setLoading(true);
        fetchAppUser(authUser.id)
      } else {
        setUser(null); setLoading(false);
      }
    },[authUser, hydrated, fetchAppUser]);


  return (
    <UserAuthContextSupabase.Provider value={{
  user, // app user row (may contain role)
      authUser, // raw auth user
      role: user?.role || 'guest',
      loadingUser: loading,
      verify: user?.verify,
      errorContext: errorContext,
      emailVerified: !!user?.email_confirmed_at,
      signIn, signUp, logOut, session, refreshProfile: ()=> authUser?.id && fetchAppUser(authUser.id),setErrorContext
    }}>
      {children}
    </UserAuthContextSupabase.Provider>
  )
}

export const useUserAuthSupabase = () => {
    return useContext(UserAuthContextSupabase);
}
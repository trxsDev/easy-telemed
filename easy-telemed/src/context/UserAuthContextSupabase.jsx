import React , {createContext,useContext,useEffect,useState, useCallback} from 'react'
import { supabase } from '../api/SupabaseClient'


const UserAuthContextSupabase = createContext();

export function UserAuthContextSupabaseProvider({children}) {
  const [user,setUser] = useState(null); // app user profile (not raw auth user)
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null); // raw auth user
  const [loading, setLoading] = useState(true);
  const [errorContext, setErrorContext] = useState({});

    const signIn = (email,password) =>{
        return supabase.auth.signInWithPassword({ email, password });
    }

    const signUp = (email,password) => {
        return supabase.auth.signUp({email,password});
    }

    const logOut = () => {
        return supabase.auth.signOut();
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
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setAuthUser(session?.user || null)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setAuthUser(session?.user || null)
      })
      return () => subscription.unsubscribe()
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
      supabase
        .from('app_users')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle(),                    // ✅ ไม่เจอแถวก็ไม่ error
      supabase.auth.getUser(),            // ✅ ดึง email/last_sign_in_at ของ "ตัวเอง"
    ]);

    if (appUsersRes.error) throw appUsersRes.error;
    if (authRes.error) throw authRes.error;

    const appUser = appUsersRes.data;
    const authUser = authRes.data?.user;

    if (appUser) {
      const authDetail = authUser && authUser.id === uid
        ? {
            email: authUser.email ?? null,
            email_confirmed_at: authUser.email_confirmed_at ?? null,
            last_sign_in_at: authUser.last_sign_in_at ?? null,
          }
        : {}; // ถ้า uid ที่ขอมิใช่ตัวเอง จะไม่ได้ข้อมูลจาก getUser()

      setUser({
        ...appUser,
        ...authDetail,
        role: appUser.role || 'patient',
      });
    } else {
      setUser(null);
    }
  } catch (e) {
    console.error('fetchAppUser error', e);
    setUser(null);
  } finally {
    setLoading(false);
  }
}, [supabase, setUser, setLoading]);


    useEffect(()=>{
      if (authUser?.id) {
        setLoading(true);
        fetchAppUser(authUser.id)
      } else {
        setUser(null); setLoading(false);
      }
    },[authUser, fetchAppUser]);


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
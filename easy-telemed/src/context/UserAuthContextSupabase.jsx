import React , {createContext,useContext,useEffect,useState} from 'react'

import { supabase } from '../api/SupabaseClient'


const UserAuthContextSupabase = createContext();

export function UserAuthContextSupabaseProvider({children}) {
    const [user,setUser] = useState({});
    const [session, setSession] = useState(null);

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
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  },[])

  useEffect(() => {
    getProfile();
  }, [session]);

  const getProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let { data, error, status } = await supabase
        .from("profiles")
        .select(`username, website, avatar_url`)
        .eq("id", user.id)
        .single();
      if (error && status !== 406) {
        throw error;
      }
      if (data) {
        setUser(data);
      }
    } catch (error) {
      console.log(error);
    }
  };


  return (
    <UserAuthContextSupabase.Provider value={{user,signIn,signUp,logOut,session}}>
      {children}
    </UserAuthContextSupabase.Provider>
  )
}

export const useUserAuthSupabase = () => {
    return useContext(UserAuthContextSupabase);
}
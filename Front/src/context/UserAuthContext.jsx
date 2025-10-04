import React , {createContext,useContext,useEffect,useState} from 'react'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

import {auth} from '../firebase'


const userAuthContext = createContext();

export function UserAuthContextProvider({children}) {
    const [user,setUser] = useState({});

    const signIn = (email,password) =>{
        return signInWithEmailAndPassword(auth,email,password);
    }

    const signUp = (email,password) => {
        return createUserWithEmailAndPassword(auth,email,password);
    }

    const logOut = () => {
        return signOut(auth);
    }

    useEffect(()=>{
        const unsubscribe = onAuthStateChanged(auth,(currentUser)=>{
            console.log("Auth",currentUser);
            setUser(currentUser);
        })

        return ()=>{
            unsubscribe();
        }
    },[])

  return (
    <userAuthContext.Provider value={{user,signIn,signUp,logOut}}>
      {children}
    </userAuthContext.Provider>
  )
}

export const useUserAuth = () => {
    return useContext(userAuthContext);
}
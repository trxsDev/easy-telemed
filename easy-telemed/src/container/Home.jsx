import { useState,useEffect } from "react";
import { useUserAuth } from "../context/userAuthContext";
function Home() {
  const [userAuth, setUserAuth] = useState([]);
  const { user } = useUserAuth();
  console.log("User in Home:", user);
  useEffect(() => {
    if (user) {
      setUserAuth(user);
    }
  }, [user]);

  return (
    <div>
      <h1>Home</h1>
      {user && (
        <div>
          <div>Auth uid : {user?.uid}</div>
          <div>Email : {user?.email}</div>
          <div>Token : {user?.stsTokenManager?.accessToken}</div>
        </div>
      )}
      <p>This is the home page.</p>
    </div>
  );
}

export default Home;

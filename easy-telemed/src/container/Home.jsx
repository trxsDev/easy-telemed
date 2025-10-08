import { useState,useEffect } from "react";
import { useUserAuthSupabase } from "../context/UserAuthContextSupabase";
function Home() {
  const [userAuth, setUserAuth] = useState([]);
  const { user } = useUserAuthSupabase();
  console.log("User in Home:", user);
  useEffect(() => {
    if (user) {
      setUserAuth(user);
    }
  }, [user]);

  return (
    <div>
      <h1>Dashboard@Home</h1>
      <h2>Welcome, {userAuth.username}</h2>
      <p>This is the home page.</p>
    </div>
  );
}

export default Home;

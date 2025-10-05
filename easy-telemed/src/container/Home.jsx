import { useState,useEffect } from "react";
import { useUserAuth } from "../context/UserAuthContext";
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
      <h1>Dashboard@Home</h1>
      <p>This is the home page.</p>
    </div>
  );
}

export default Home;

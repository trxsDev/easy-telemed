import { useState,useEffect } from "react";
import { useUserAuthSupabase } from "../context/UserAuthContextSupabase";
import { useTranslation } from "react-i18next";
function Home() {
  const { t, i18n } = useTranslation();
  const [userAuth, setUserAuth] = useState([]);
  const { user } = useUserAuthSupabase();
  console.log("User in Home:", user);
  console.log("user : ",user.display_name )
  useEffect(() => {
    if (user) {
      setUserAuth(user);
    }
  }, [user]);

  return (
    <div>
      <h1>Dashboard@Home</h1>
      <h2>{t("WELCOME","Welcome")}, {user.display_name || 'Guest'}</h2>
      <p>{t("GREETING","How are you today?")} </p>
    </div>
  );
}

export default Home;

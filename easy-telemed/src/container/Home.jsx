import { useUserAuthSupabase } from "../context/UserAuthContextSupabase";
import { useTranslation } from "react-i18next";
function Home() {
  const { t } = useTranslation();
  const { user } = useUserAuthSupabase();
  console.log("User in Home:", user);
  console.log("user : ", user?.display_name);

  return (
    <div>
      <h1>Dashboard@Home</h1>
      <h2>{t("WELCOME","Welcome")}, {user?.display_name || 'Guest'}</h2>
      <p>{t("GREETING","How are you today?")} </p>
    </div>
  );
}

export default Home;

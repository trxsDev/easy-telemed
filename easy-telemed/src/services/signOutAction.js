import { auth } from "../firebase";
import { useUserAuth } from "../context/userAuthContext";
import { useNavigate } from "react-router-dom";

export default async function signOutAction() {
  const { logOut } = useUserAuth();
  await logOut(auth);
  const navigate = useNavigate();
  navigate("/welcome");
  
}
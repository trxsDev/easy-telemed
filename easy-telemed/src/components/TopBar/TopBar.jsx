import {Link} from "react-router-dom"
import { CustomizeButton } from "../element/CustomizeButton";
import { LoginOutlined } from "@ant-design/icons";
import "./TopBar.css"
import medcross from "../../assets/medcross.svg"
const TopBar = () => {
    return (
        <div className="topbar">
            <h1>Easy Tele <img src={medcross} alt="medical cross" className="cross-icon" /> med</h1>
            <Link to="/signin">
            <CustomizeButton iconElement={<LoginOutlined />}>
              Sign In
            </CustomizeButton>
          </Link>
        </div>
    );
}
export default TopBar;
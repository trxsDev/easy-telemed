import { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Divider,
  Button,
  Tooltip,
  Progress,
  Spin,
  Statistic,
} from "antd";
import { TeamOutlined, UserAddOutlined } from "@ant-design/icons";
import React from "react";
import "./styles.css";
import { useTranslation } from "react-i18next";
import { supabase } from "../../api/SupabaseClient";
import UserTable from "../../components/UserTable/UserTable";
import DoctorTable from "../../components/UserTable/DoctorTable";
import PieGauge from "../../components/Chart/PieGauge";
import PieDonut from "../../components/Chart/PieDonut";
const { Title, Text } = Typography;

function UserDashboard() {
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState("patient");
  const [userData, setUserData] = useState([]);
  const [data, setData] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [specialtiesCountSet, setSpecialtiesCountSet] = useState({});
  const fetchUser = async () => {
    try {
      const { data, error } = await supabase.from("v_all_users").select("*");
      if (error) throw error;
      console.log("User data:", data);
      setUserData(data);
      setData([
        {
          label: "Patient",
          value: data.reduce(
            (acc, user) => (user.all_user_role === "patient" ? acc + 1 : acc),
            0
          ),
        },
        {
          label: "Doctor",
          value: data.reduce(
            (acc, user) => (user.all_user_role === "doctor" ? acc + 1 : acc),
            0
          ),
        },
      ]);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const getCountUser = (data) => {
    return data.reduce((acc, item) => acc + item.value, 0);
  };

  useEffect(() => {
    const count = getCountUser(data);
    setUserCount(count);
  }, [data]);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    console.log("activeView:", activeView);
  }, [activeView]);

  useEffect(() => {
    if (activeView === "doctor") {
      try {
        const fetchDoctorData = async () => {
          const { data, error } = await supabase
            .from("v_doctor_over")
            .select("*");
          if (error) throw error;
          console.log("Doctor data:", data);

          const doctorList = data.map((data) => ({
            role: data.role,
            specialties: data.specialties ? JSON.parse(data.specialties) : null,
          }));

          console.log("Doctor List with parsed specialties:", doctorList);

          const specialtiesCount = doctorList.reduce((acc, doctor) => {
            // Check if specialties exists and has a name property
            if (doctor.specialties && doctor.specialties.name) {
              const specialty = doctor.specialties.id;
              if (acc[specialty]) {
                acc[specialty] += 1;
              } else {
                acc[specialty] = 1;
              }
            } else {
              console.warn("Doctor specialties is invalid:", doctor);
            }
            return acc;
          }, {});

          const specdata = Object.keys(specialtiesCount).map((key) => {
            const doctor = doctorList.find(
              (doctor) => doctor.specialties.id === parseInt(key)
            );

            let label = "Unknown";
            if (doctor && doctor.specialties) {
              if (i18n.language === "th" && doctor.specialties.name_th) {
                label = doctor.specialties.name_th;
              } else {
                label = doctor.specialties.name;
              }
            }

            console.log("Mapping specialty:", key, "to label:", label);

            return {
              label: label,
              value: specialtiesCount[key],
            };
          });

          console.log("Specialties Count:", specdata);

          setSpecialtiesCountSet(specdata);
        };
        fetchDoctorData();
      } catch (error) {
        console.error("Error fetching doctor data:", error);
      }
    }
  }, [activeView, i18n.language]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 16,
        width: "100%",
        margin: "0",
        padding: "0",
      }}
    >
      <Card className="card-userDashboard">
        <div className="card-userDashboard__header">
          <TeamOutlined className="card-userDashboard__icon" />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {t("USER_DASHBOARD", "User Dashboard")}
            </Title>
            <Text type="secondary" className="subtitle"></Text>
          </div>
        </div>
        <Divider style={{ margin: "16px 0 24px" }} />
        <div style={{ marginBottom: 24, display: "flex", gap: 8 }}>
          <Button
            type={activeView === "patient" ? "primary" : "default"}
            onClick={() => setActiveView("patient")}
          >
            {t("PATIENT", "Patient")}
          </Button>
          <Button
            type={activeView === "doctor" ? "primary" : "default"}
            onClick={() => setActiveView("doctor")}
            block
          >
            {t("DOCTOR", "Doctor")}
          </Button>
        </div>

        <div className={activeView === "patient" ? "patient-dash" : ""}>
          {data && data.length > 0 && getCountUser(data) > 0 ? (
            activeView === "patient" ? (
              <PieGauge data={data} count={userCount} />
            ) : (
              <div className="container">
                <div className="h-[32%] w-[40%]">
                  <PieGauge
                    data={data}
                    count={userCount}
                    height={200}
                    width={200}
                  />
                </div>
                <div className="h-[32%] w-[30%]">
                  <PieDonut data={specialtiesCountSet}  height={200} width={100}/>
                </div>
                {/* <div className="h-[32%] grow">3</div>
                <div className="h-[32%] w-1/4">4</div>
                <div className="h-[32%] w-[40%]">5</div> */}
              </div>
            )
          ) : (
            <div className="spinner">
              <Spin size="large" />
            </div>
          )}
        </div>
      </Card>
      <Card
        className="card-userDashboard-side"
        style={{ flex: 1, width: "100%" }}
      >
        {activeView === "patient" ? (
          <UserTable
            userData={userData.filter(
              (user) => user.all_user_role === "patient"
            )}
          />
        ) : (
          <DoctorTable
            userData={userData.filter(
              (user) => user.all_user_role === "doctor"
            )}

            t={t}
          />
        )}
      </Card>
    </div>
  );
}

export default UserDashboard;

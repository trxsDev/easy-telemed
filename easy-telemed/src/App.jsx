// src/App.jsx
import { Link } from "react-router-dom";
import { CustomizeButton } from "./components/element/CustomizeButton";
import { LoginOutlined, ArrowRightOutlined } from "@ant-design/icons";
import TopBar from "./components/TopBar/TopBar";
import "./App.css";
import { useTranslation } from "react-i18next";
import useLordIcon from "./hooks/useLordIcon";

const FEATURE_ITEMS = [
  {
    key: "queue",
    icon: {
      src: "https://cdn.lordicon.com/xirobkro.json",
      trigger: "hover",
      colors: "primary:#4156ff,secondary:#4edee0",
    },
  },
  {
    key: "security",
    icon: {
      src: "https://cdn.lordicon.com/sjoccsdj.json",
      trigger: "loop-on-hover",
      colors: "primary:#365eff,secondary:#46d0ff",
    },
  },
  {
    key: "integration",
    icon: {
      src: "https://cdn.lordicon.com/abfverha.json",
      trigger: "hover",
      colors: "primary:#4156ff,secondary:#2dd4ff",
    },
  },
];

const CARE_STEP_KEYS = ["register", "consult", "summary"];

export default function App() {
  const { t } = useTranslation();
  useLordIcon();

  return (
    <>
      <TopBar />
      <main className="landing">
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <h2>{t("landing.title")}</h2>
            <h1>{t("landing.title-part2")}</h1>
            <p>{t("landing.subtitle")}</p>

            <div className="landing-hero__actions">
              <Link to="/signin">
                <CustomizeButton
                  type="primary"
                  icon={<LoginOutlined />}
                  style={{ padding: "12px 28px", fontSize: 16 }}
                >
                  {t("landing.ctaPrimary")}
                </CustomizeButton>
              </Link>
              <Link to="/signup" className="landing-hero__ghost">
                {t("landing.ctaSecondary")}
                <ArrowRightOutlined />
              </Link>
            </div>

            <div className="landing-hero__stats">
              <div>
                <strong>24/7</strong>
                <span>{t("landing.statsPatients")}</span>
              </div>
              <div>
                <strong>15 min</strong>
                <span>{t("landing.statsDoctors")}</span>
              </div>
              <div>
                <strong>99.9%</strong>
                <span>{t("landing.statsSatisfaction")}</span>
              </div>
            </div>
          </div>

          <div className="landing-hero__visual">
            <div className="landing-hero__card">
              <div className="landing-hero__card-header">
                <span className="dot dot--green" />
                <span className="dot dot--amber" />
                <span className="dot dot--blue" />
              </div>
              <div className="landing-hero__card-body">
                <h4>{t("landing.heroCard.title")}</h4>
                <ul>
                  <li>✔ {t("landing.heroCard.bullet.video")}</li>
                  <li>✔ {t("landing.heroCard.bullet.docs")}</li>
                  <li>✔ {t("landing.heroCard.bullet.security")}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
{/* 
        <section className="landing-partners">
          <p>{t("landing.trustedBy")}</p>
          <div className="landing-partners__logos">
            <span>MedTech Lab</span>
            <span>HealthCoder</span>
            <span>PharmaConnect</span>
            <span>WellCare</span>
          </div>
        </section> */}

        <section className="landing-section landing-features">
          <h2>{t("landing.features.title")}</h2>
          <p className="landing-section__subtitle">{t("landing.features.subtitle")}</p>
          <div className="landing-features__grid">
            {FEATURE_ITEMS.map((feature) => (
              <article key={feature.key} className="landing-feature-card">
                <div className="landing-feature-card__icon">
                  <lord-icon
                    src={feature.icon.src}
                    trigger={feature.icon.trigger}
                    colors={feature.icon.colors}
                    delay={feature.icon.delay ?? "0"}
                    style={{ width: "64px", height: "64px" }}
                  />
                </div>
                <h3>{t(`landing.features.items.${feature.key}.title`)}</h3>
                <p>{t(`landing.features.items.${feature.key}.description`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-steps">
          <div className="landing-steps__content">
            <h3>{t("landing.steps.title")}</h3>
            <h2>{t("landing.steps.title-part2")}</h2>
            <p className="landing-section__subtitle">{t("landing.steps.subtitle")}</p>
            <div className="landing-steps__list">
              {CARE_STEP_KEYS.map((key, idx) => (
                <div key={key} className="landing-step">
                  <div className="landing-step__index">{idx + 1}</div>
                  <div>
                    <h4>{t(`landing.steps.items.${key}.title`)}</h4>
                    <p>{t(`landing.steps.items.${key}.description`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="landing-steps__visual">
            <div className="landing-steps__screen">
              <div className="landing-steps__screen-header">
                <span />
                <span />
                <span />
              </div>
              <div className="landing-steps__screen-body">
                <h5>{t("landing.steps.previewTitle")}</h5>
                <p>{t("landing.steps.previewSubtitle")}</p>
                <ul>
                  <li>• {t("landing.steps.previewList.plan")}</li>
                  <li>• {t("landing.steps.previewList.medication")}</li>
                  <li>• {t("landing.steps.previewList.reminder")}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-cta">
          <div className="landing-cta__card">
            <div>
              <h2>{t("landing.cta.title")}</h2>
              <p>{t("landing.cta.subtitle")}</p>
            </div>
            <div className="landing-cta__actions">
              <Link to="/signin">
                <CustomizeButton type="primary" icon={<LoginOutlined />}>
                  {t("landing.cta.startNow")}
                </CustomizeButton>
              </Link>
              <Link to="/doctor-register" className="landing-cta__ghost">
                {t("landing.cta.createAccount")}
                <ArrowRightOutlined />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

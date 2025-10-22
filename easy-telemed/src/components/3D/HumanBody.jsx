import React, {
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useTranslation, withTranslation } from "react-i18next";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

const EPSILON = 0.008;

const REGION_IDS = [
  "head",
  "chest",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
];

const DEFAULT_REGION_LABELS = {
  head: "Head",
  chest: "Chest",
  leftArm: "Left Arm",
  rightArm: "Right Arm",
  leftLeg: "Left Leg",
  rightLeg: "Right Leg",
};

function ensureOverlayStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("human-body-overlay-style")) return;

  const style = document.createElement("style");
  style.id = "human-body-overlay-style";
  style.textContent = `
    .human-body-marker {
      position: absolute;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #7cc7ff;
      background: rgba(124,199,255,.25);
      transform: translate(-50%, -50%);
      box-shadow: 0 0 10px rgba(124,199,255,.45);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

const defaultModelUrl = (() => {
  const viteBase =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.BASE_URL;
  const base = viteBase && viteBase !== "/" ? viteBase.replace(/\/?$/, "/") : "/";
  return `${base}HumanBody.obj`;
})();

function computeRegions(bounds, labels = DEFAULT_REGION_LABELS) {
  if (!bounds) return [];

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);

  const headHeight = size.y * 0.18;
  const torsoHeight = size.y * 0.3;
  const legsHeight = size.y - headHeight - torsoHeight;
  const width = size.x;
  const depth = size.z;

  return [
    {
      id: "head",
      label: labels.head,
      position: [center.x, bounds.max.y - headHeight / 2, center.z],
      dimensions: [width * 0.48, headHeight, depth],
    },
    {
      id: "chest",
      label: labels.chest,
      position: [center.x, bounds.max.y - headHeight - torsoHeight / 2, center.z],
      dimensions: [width * 0.6, torsoHeight, depth],
    },
    {
      id: "leftArm",
      label: labels.leftArm,
      position: [
        bounds.min.x + width * 0.2,
        bounds.max.y - headHeight - torsoHeight * 0.2,
        center.z,
      ],
      dimensions: [width * 0.35, torsoHeight * 0.8, depth * 0.9],
    },
    {
      id: "rightArm",
      label: labels.rightArm,
      position: [
        bounds.max.x - width * 0.2,
        bounds.max.y - headHeight - torsoHeight * 0.2,
        center.z,
      ],
      dimensions: [width * 0.35, torsoHeight * 0.8, depth * 0.9],
    },
    {
      id: "leftLeg",
      label: labels.leftLeg,
      position: [center.x - width * 0.15, bounds.min.y + legsHeight / 2, center.z],
      dimensions: [width * 0.35, legsHeight * 0.9, depth],
    },
    {
      id: "rightLeg",
      label: labels.rightLeg,
      position: [center.x + width * 0.15, bounds.min.y + legsHeight / 2, center.z],
      dimensions: [width * 0.35, legsHeight * 0.9, depth],
    },
  ];
}

function LoadingFallback({ message }) {
  return (
    <div
      style={{
        inset: 0,
        position: "absolute",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "4px solid rgba(255,255,255,0.35)",
          borderTop: "4px solid #fff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <div style={{ opacity: 0.9 }}>{message}</div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("3D Model Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div
          style={{
            inset: 0,
            position: "absolute",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#333",
            flexDirection: "column",
            textAlign: "center",
            padding: 20,
            gap: 8,
          }}
        >
          <div style={{ fontSize: 48 }}>🤖</div>
          <div>{t("MODEL_LOAD_FAILED", "Could not load 3D model.")}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {t(
              "MODEL_LOAD_HINT",
              "Please check if the model file exists and is accessible."
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const TranslatedModelErrorBoundary = withTranslation()(ModelErrorBoundary);

const Model = forwardRef(function Model({ url, onReady }, ref) {
  const object = useLoader(OBJLoader, url);

  useEffect(() => {
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (!(child.material instanceof THREE.MeshStandardMaterial)) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#d6d6d6"),
            metalness: 0.05,
            roughness: 0.85,
          });
        }
      }
    });

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    const normalizedBox = new THREE.Box3().setFromObject(object);
    onReady?.(normalizedBox);
  }, [object, onReady]);

  useImperativeHandle(
    ref,
    () => ({
      object,
    }),
    [object]
  );

  return <primitive object={object} />;
});

function HumanBody({
  onBodyPartSelect,
  selectedParts = [],
  modelUrl,
  height = 580,
}) {
  const { t } = useTranslation();
  ensureOverlayStyles();

  const [selection, setSelection] = useState(() => new Set(selectedParts));
  const [markers, setMarkers] = useState([]);
  const [bounds, setBounds] = useState(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const rotationRad = useMemo(
    () => (rotationDeg * Math.PI) / 180,
    [rotationDeg]
  );
  const modelRef = useRef(null);

  const regionLabels = useMemo(
    () => ({
      head: t("BODY_REGION_HEAD", "Head"),
      chest: t("BODY_REGION_CHEST", "Chest"),
      leftArm: t("BODY_REGION_LEFT_ARM", "Left Arm"),
      rightArm: t("BODY_REGION_RIGHT_ARM", "Right Arm"),
      leftLeg: t("BODY_REGION_LEFT_LEG", "Left Leg"),
      rightLeg: t("BODY_REGION_RIGHT_LEG", "Right Leg"),
    }),
    [t]
  );

  useEffect(() => {
    const next = new Set(selectedParts || []);
    setSelection(next);
    setMarkers((prev) => prev.filter((marker) => next.has(marker.id)));
  }, [selectedParts]);

  const addMarker = useCallback(
    (id, event, fallback) => {
      let targetPoint;

      const object = modelRef.current?.object;
      if (object && event?.ray?.intersectObject) {
        const hits = event.ray.intersectObject(object, true) || [];
        if (hits.length > 0) {
          const hit = hits[0];
          targetPoint = hit.point.clone();
          if (hit.face) {
            const normal = hit.face.normal
              .clone()
              .transformDirection(hit.object.matrixWorld)
              .normalize();
            targetPoint.addScaledVector(normal, EPSILON);
          }
        }
      }

      if (!targetPoint && fallback) {
        targetPoint =
          fallback instanceof THREE.Vector3
            ? fallback.clone()
            : Array.isArray(fallback)
            ? new THREE.Vector3().fromArray(fallback)
            : fallback.clone();
      }

      if (!targetPoint && event?.point) {
        targetPoint = event.point.clone();
      }

      if (!targetPoint) return;

      const position = targetPoint.toArray();
      setMarkers((prev) => {
        const next = prev.filter((marker) => marker.id !== id);
        next.push({ id, position });
        return next;
      });
    },
    [modelRef]
  );

  const removeMarker = useCallback((id) => {
    setMarkers((prev) => prev.filter((marker) => marker.id !== id));
  }, []);

  const toggleSelection = useCallback(
    (id, event, fallbackPosition) => {
      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          removeMarker(id);
        } else {
          next.add(id);
          addMarker(id, event, fallbackPosition);
        }
        onBodyPartSelect?.(Array.from(next));
        return next;
      });
    },
    [addMarker, onBodyPartSelect, removeMarker]
  );

  const rotatePosition = useCallback(
    (position) => {
      if (!position) return undefined;
      const vector =
        position instanceof THREE.Vector3
          ? position.clone()
          : Array.isArray(position)
          ? new THREE.Vector3().fromArray(position)
          : position.clone();
      vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationRad);
      return vector;
    },
    [rotationRad]
  );

  const regionData = useMemo(
    () => (bounds ? computeRegions(bounds, regionLabels) : []),
    [bounds, regionLabels]
  );

  useEffect(() => {
    if (!bounds || !selection.size) return;
    const fallbackMap = new Map(
      regionData.map((region) => [region.id, region.position])
    );

    selection.forEach((id) => {
      if (!fallbackMap.has(id)) return;
      if (markers.some((marker) => marker.id === id)) return;
      const rotated = rotatePosition(fallbackMap.get(id));
      addMarker(id, undefined, rotated);
    });
  }, [addMarker, bounds, markers, regionData, rotatePosition, selection]);

  const markerElements = markers
    .filter((marker) => selection.has(marker.id))
    .map((marker) => (
      <Html key={marker.id} position={marker.position} transform={false}>
        <div
          className="human-body-marker"
          title={regionLabels[marker.id] || marker.id}
        />
      </Html>
    ));

  const urlToLoad = modelUrl || defaultModelUrl;

  const containerStyles = {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  };

  const canvasWrapperStyles = {
    width: "100%",
    height,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    background: "transparent",
  };

  const sliderStyles = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    borderRadius: 12,
    background: "rgba(15,22,45,0.65)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
    color: "#fff",
    width: "min(100%, 320px)",
  };

  const buttonsWrapperStyles = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    width: "100%",
  };

  return (
    <div style={containerStyles}>
      <div style={canvasWrapperStyles}>
      <TranslatedModelErrorBoundary>
        <Canvas camera={{ position: [0, 1.6, 3.4], fov: 45 }} shadows>
          <Suspense
            fallback={
              <Html center>
                <LoadingFallback
                  message={t("LOADING_3D_MODEL", "Loading 3D Model…")}
                />
              </Html>
            }
          >
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 6, 4]} intensity={0.85} castShadow />
            <pointLight position={[-4, 3, 2]} intensity={0.4} />
            <group rotation={[0, rotationRad, 0]}>
              <Model ref={modelRef} url={urlToLoad} onReady={setBounds} />
              {bounds && (
                <Regions
                  regions={regionData}
                  onPick={(id, event) =>
                    toggleSelection(
                      id,
                      event,
                      rotatePosition(
                        regionData.find((region) => region.id === id)?.position
                      )
                    )
                  }
                />
              )}
              {markerElements}
            </group>
            <ZoomLoggingControls
              makeDefault
              enableDamping
              dampingFactor={0.08}
              minPolarAngle={Math.PI / 2}
              maxPolarAngle={Math.PI / 2}
            />
          </Suspense>
        </Canvas>
      </TranslatedModelErrorBoundary>
      </div>

      <div style={sliderStyles}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {t("ROTATE_MODEL", "Rotate model")}
        </span>
        <input
          type="range"
          min="-180"
          max="180"
          value={rotationDeg}
          onChange={(event) => setRotationDeg(Number(event.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 12, minWidth: 32, textAlign: "right" }}>
          {rotationDeg}°
        </span>
      </div>

      <div style={buttonsWrapperStyles}>
        {REGION_IDS.map((regionId) => {
          const active = selection.has(regionId);
          const disabled = !bounds && !active;
          const label = regionLabels[regionId] || regionId;

          return (
            <button
              type="button"
              key={regionId}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                if (active) {
                  toggleSelection(regionId);
                } else if (bounds) {
                  const match = regionData.find((r) => r.id === regionId);
                  const fallback = rotatePosition(match?.position);
                  toggleSelection(regionId, undefined, fallback);
                } else {
                  toggleSelection(regionId);
                }
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 14,
                border: "none",
                backgroundColor: active ? "#3558ff" : "rgba(255,255,255,0.88)",
                color: active ? "#fff" : "#1c1c1c",
                fontSize: 12,
                fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "all .2s ease",
                boxShadow: "0 4px 12px rgba(17,24,39,0.15)",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Regions({ regions, onPick }) {
  return (
    <group>
      {regions.map(({ id, position, dimensions }) => (
        <mesh
          key={id}
          position={position}
          onPointerDown={(event) => {
            event.stopPropagation();
            onPick(id, event);
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            if (typeof document !== "undefined") {
              document.body.style.cursor = "pointer";
            }
          }}
          onPointerOut={() => {
            if (typeof document !== "undefined") {
              document.body.style.cursor = "default";
            }
          }}
        >
          <boxGeometry args={dimensions} />
          <meshBasicMaterial transparent opacity={0.001} color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

function ZoomLoggingControls({
  minDistance = 2,
  maxDistance = 30,
  onZoomPercentChange,
  ...props
}) {
  const controlsRef = useRef(null);
  const camera = useThree((state) => state.camera);
  const baselinePercentRef = useRef(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;

    const range = Math.max(maxDistance - minDistance, Number.EPSILON);
    const clampDistance = (distance) =>
      Math.min(Math.max(distance, minDistance), maxDistance);
    const toNormalizedPercent = (distance) => {
      const clamped = clampDistance(distance);
      return ((maxDistance - clamped) / range) * 100;
    };

    baselinePercentRef.current = toNormalizedPercent(controls.getDistance());

    const emitZoomPercent = () => {
      const distance = controls.getDistance();
      const normalized = toNormalizedPercent(distance);
      const baseline = baselinePercentRef.current ?? normalized;
      const percent = Math.min(
        100,
        Math.max(0, normalized - baseline + 100)
      );

      if (onZoomPercentChange) {
        onZoomPercentChange(percent);
      } else {
        // eslint-disable-next-line no-console
        console.log(`Zoom: ${percent.toFixed(0)}%`);
      }

      camera.updateProjectionMatrix();
    };

    controls.addEventListener("change", emitZoomPercent);
    emitZoomPercent();

    return () => {
      controls.removeEventListener("change", emitZoomPercent);
    };
  }, [camera, maxDistance, minDistance, onZoomPercentChange]);

  return (
    <OrbitControls
      ref={controlsRef}
      minDistance={maxDistance}
      maxDistance={maxDistance}
      {...props}
    />
  );
}

export default HumanBody;

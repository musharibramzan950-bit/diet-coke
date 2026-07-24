import { useEffect, useRef, useState, Suspense, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import "./Hero.css";

const MODEL_URL = "/dietcoke.glb";
useGLTF.preload(MODEL_URL);

class ModelErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e) { console.error("🔴 Model error:", e.message); }
  render() { return this.state.error ? null : this.props.children; }
}

function CanModel({ scrollY, vh }) {
  const groupRef  = useRef();
  const offsetRef = useRef(new THREE.Vector3());
  const [ready, setReady] = useState(false);
  const { scene } = useGLTF(MODEL_URL);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    offsetRef.current = center.clone().negate();

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.envMapIntensity = 1.8;
        child.castShadow = true;
      }
    });

    setReady(true);
  }, [scene]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const p1 = ease(Math.min(Math.max(scrollY.current / vh, 0), 1));
    const p2 = ease(Math.min(Math.max((scrollY.current - vh) / vh, 0), 1));

    const targetRotY =
      scrollY.current * 0.003 +
      Math.PI * 1.45 +
      p1 * (Math.PI * 0.3) +
      p2 * (Math.PI * 0.3);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, targetRotY, 1 - Math.pow(0.04, delta)
    );

    const floatY = Math.sin(Date.now() * 0.001) * 0.05;
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      offsetRef.current.y + 0.1 + floatY,
      1 - Math.pow(0.04, delta)
    );

    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      offsetRef.current.x + p1 * 1.5 + p2 * -1.3,
      1 - Math.pow(0.04, delta)
    );
  });

  if (!ready) return null;

  const off = offsetRef.current;

  return (
    <group
      ref={groupRef}
      position={[off.x, off.y + 0.1, off.z]}
      scale={0.7}
      rotation={[-0.08, 0, 0]}
    >
      <primitive object={scene} />
    </group>
  );
}

function CameraRig({ scrollY, vh }) {
  useFrame((state, delta) => {
    const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const p1 = ease(Math.min(Math.max(scrollY.current / vh, 0), 1));
    const p2 = ease(Math.min(Math.max((scrollY.current - vh) / vh, 0), 1));

    state.camera.position.x = THREE.MathUtils.lerp(
      state.camera.position.x, p1 * -0.1 + p2 * 1.8, 1 - Math.pow(0.04, delta)
    );
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z, 5 - p1 * 0.3 + p2 * 0.5, 1 - Math.pow(0.04, delta)
    );
    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y, 0.2 - p1 * 0.4 + p2 * 0.3, 1 - Math.pow(0.04, delta)
    );

    const lookX = p1 * 0.4 + p2 * 1.0;
    state.camera.lookAt(lookX, -0.8, 0);
  });
  return null;
}

export default function Hero() {
  const containerRef  = useRef(null);
  const scrollYRef    = useRef(0);
  const [scrollY, setScrollY]       = useState(0);
  const [modelVisible, setModelVisible] = useState(false);
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Slide-up entrance: wait for hero text animations to finish, then reveal
  useEffect(() => {
    const t = setTimeout(() => setModelVisible(true), 2400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fn = () => { scrollYRef.current = el.scrollTop; setScrollY(el.scrollTop); };
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, []);

  const progress    = Math.min(scrollY / (vh * 2), 1);
  const s2Progress  = Math.min(Math.max((scrollY - vh * 1.7) / (vh * 0.2), 0), 1);

  return (
    <>
      <div className="noise" />
      <div className="vignette" />

      <div
        className="model-sticky-wrap"
        style={{
          transform: modelVisible ? "translateY(0)" : "translateY(120%)",
          transition: "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Canvas
          gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}
          style={{ pointerEvents: "none" }}
          camera={{ position: [0, 0.2, 5], fov: 35 }}
          dpr={[1, 2]}
          onCreated={({ gl }) => { gl.domElement.style.pointerEvents = "none"; }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 8, 5]}   intensity={2.5} color="#ffffff" />
          <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#c8102e" />
          <pointLight       position={[0, -2, 3]}  intensity={0.5} color="#d4d4d4" />

          <Environment preset="studio" background={false} />

          <ContactShadows
            position={[0, -0.5, 0]}
            opacity={0.45}
            scale={4}
            blur={2}
            far={0.5}
            color="#880010"
          />

          <ModelErrorBoundary>
            <Suspense fallback={null}>
              <CanModel scrollY={scrollYRef} vh={vh} />
            </Suspense>
          </ModelErrorBoundary>

          <CameraRig scrollY={scrollYRef} vh={vh} />
        </Canvas>
      </div>

      {/* Fruits — opacity only, no movement */}
      <div
        className="fruit-layer"
        style={{ opacity: s2Progress, pointerEvents: "none" }}
      >
        <img src="/images/cherry.png" className="fruit fruit-cherry" alt="cherry" />
        <img src="/images/lime.png"   className="fruit fruit-lime"   alt="lime"   />
      </div>

      <div className="site-footer">
        <div className="footer-logo">DIET <span>COKE</span></div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="dc-container" ref={containerRef}>
        <div className="scroll-track">

          <section className="section hero">
            <div className="hero-bg" />
            <div className="hero-lines" />
            <div className="hero-content">
              <p className="hero-eyebrow">The Original · Since 1982</p>
              <h1 className="hero-title">
                <span>DIET</span>
                <span className="outline">COKE</span>
              </h1>
              <p className="hero-subtitle">Stay extraordinary. Zero sugar.</p>
            </div>
            <div className="scroll-hint"><span>Scroll</span><div className="scroll-line" /></div>
            <div className="section-number">01</div>
          </section>

          <section className="section section-1">
            <div className="section-1-bg" />
            <div className="section-1-deco" />
            <div className="section-text">
              <div className="section-tag">Crafted Bold</div>
              <h2 className="section-heading">BOLD<br /><span className="red">FLAVOR.</span><br />ZERO<br />GUILT.</h2>
              <p className="section-body">A perfectly balanced blend of crisp, refreshing taste — engineered for those who refuse to compromise. Every sip, an act of defiance.</p>
              <div className="stat-row">
                <div className="stat"><span className="stat-num">0</span><span className="stat-label">Calories</span></div>
                <div className="stat"><span className="stat-num">0g</span><span className="stat-label">Sugar</span></div>
                <div className="stat"><span className="stat-num">40+</span><span className="stat-label">Years Icon</span></div>
              </div>
            </div>
            <div className="section-number">02</div>
          </section>

          <section className="section section-2">
            <div className="section-2-bg" />
            <div className="section-text">
              <div className="section-tag">Limited Edition</div>
              <h2 className="section-heading">MADE<br />FOR THE<br /><span className="red">DARING.</span></h2>
              <p className="section-body">From the iconic silver finish to the unmistakable red script — Diet Coke isn't just a drink. It's a statement. Yours to make.</p>
              <div className="flavor-list">
                <span className="flavor-item">Classic Original</span>
                <span className="flavor-item">Twisted Mango</span>
                <span className="flavor-item">Feisty Cherry</span>
                <span className="flavor-item">Ginger Lime</span>
              </div>
              <br />
              <a className="btn-cta" href="#" onClick={(e) => e.preventDefault()}>
                Explore All Flavors
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div className="section-number">03</div>
          </section>

        </div>
      </div>
    </>
  );
}
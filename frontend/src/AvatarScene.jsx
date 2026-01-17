import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

// Mood color configurations
const MOOD_COLORS = {
  neutral: { bg: 0xf8f7fc, aura: "#a78bfa", auraEnd: "rgba(167,139,250,0)" },
  happy: { bg: 0xfef9c3, aura: "#fbbf24", auraEnd: "rgba(251,191,36,0)" },
  sad: { bg: 0xe0f2fe, aura: "#60a5fa", auraEnd: "rgba(96,165,250,0)" },
  angry: { bg: 0xfee2e2, aura: "#f87171", auraEnd: "rgba(248,113,113,0)" },
  excited: { bg: 0xfce7f3, aura: "#f472b6", auraEnd: "rgba(244,114,182,0)" },
  calm: { bg: 0xd1fae5, aura: "#34d399", auraEnd: "rgba(52,211,153,0)" },
  confused: { bg: 0xfef3c7, aura: "#fcd34d", auraEnd: "rgba(252,211,77,0)" },
  thinking: { bg: 0xe0e7ff, aura: "#818cf8", auraEnd: "rgba(129,140,248,0)" },
};

export default function AvatarScene() {
  const mountRef = useRef();

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Get container dimensions
    const getContainerSize = () => {
      const rect = container.getBoundingClientRect();
      return {
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight,
      };
    };

    let { width, height } = getContainerSize();

    // Current mood state
    let currentMood = "neutral";
    let targetBgColor = new THREE.Color(MOOD_COLORS.neutral.bg);
    let currentBgColor = new THREE.Color(MOOD_COLORS.neutral.bg);

    /* ================= SCENE ================= */
    const scene = new THREE.Scene();
    scene.background = currentBgColor;

    // --- Dynamic Aura Gradient ---
    function createAuraTexture(size = 512, color = "#a78bfa", endColor = "rgba(167,139,250,0)") {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createRadialGradient(
        size / 2, size / 2, size * 0.1,
        size / 2, size / 2, size * 0.5
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, endColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    // Add aura mesh behind avatar
    const auraGeometry = new THREE.CircleGeometry(1.2, 64);
    let auraMaterial = new THREE.MeshBasicMaterial({
      map: createAuraTexture(512, MOOD_COLORS.neutral.aura, MOOD_COLORS.neutral.auraEnd),
      transparent: true,
      depthWrite: false,
    });
    const auraMesh = new THREE.Mesh(auraGeometry, auraMaterial);
    auraMesh.position.set(0, 1.2, -0.3);
    auraMesh.renderOrder = -1;
    scene.add(auraMesh);

    // Function to update mood colors
    function updateMoodColors(mood) {
      const colors = MOOD_COLORS[mood] || MOOD_COLORS.neutral;
      targetBgColor = new THREE.Color(colors.bg);

      // Update aura texture
      auraMaterial.map = createAuraTexture(512, colors.aura, colors.auraEnd);
      auraMaterial.needsUpdate = true;
    }

    // Expose setMood globally
    window.setMood = (mood) => {
      if (mood !== currentMood) {
        currentMood = mood;
        updateMoodColors(mood);
      }
    };

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.60, 1.25);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Handle resize
    const handleResize = () => {
      const size = getContainerSize();
      width = size.width;
      height = size.height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);
    // Also use ResizeObserver for container-specific resizes
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    /* ================= LIGHTS ================= */
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const white = new THREE.PointLight(0xffffff, 0.8, 10);
    white.position.set(0, 1.5, 0.5);
    scene.add(white);

    /* ================= AVATAR ================= */
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    let headMesh, teethMesh;
    let neck, spine, leftArm, rightArm;
    let leftElbow, rightElbow;
    let headMorphs = {};
    let loaded = false;

    // Arm rotation control state
    let armRotation = {
      left: { x: 1.37, y: 0, z: 0 },   // <-- set initial x to 1.37
      right: { x: 1.37, y: 0, z: 0 },  // <-- set initial x to 1.37
    };

    window.setArmRotation = (side, rot) => {
      armRotation[side] = { ...rot };
    };

    // --- Restore elbowRotation state and setter ---
    let elbowRotation = {
      left: { x: 0, y: 0, z: 0 },
      right: { x: 0, y: 0, z: 0 },
    };

    window.setElbowRotation = (side, rot) => {
      elbowRotation[side] = { ...rot };
    };

    let currentGender = "female";

    const loader = new GLTFLoader();

    function loadAvatar(gender) {
      avatarGroup.clear();
      loaded = false;

      loader.load(
        `/models/avatar-${gender}.glb`,
        (gltf) => {
          const avatar = gltf.scene;
          avatarGroup.add(avatar);

          avatar.traverse((obj) => {
            if (!obj.isSkinnedMesh) return;

            obj.frustumCulled = false;
            obj.material = obj.material.clone();
            obj.material.skinning = true;
            obj.material.morphTargets = true;

            if (obj.name === "Wolf3D_Head") {
              headMesh = obj;
              headMorphs = obj.morphTargetDictionary;

              neck = obj.skeleton.bones.find((b) =>
                b.name.toLowerCase().includes("neck")
              );
              spine = obj.skeleton.bones.find((b) =>
                b.name.toLowerCase().includes("spine")
              );
            }

            if (obj.name === "Wolf3D_Teeth") teethMesh = obj;

            if (obj.skeleton) {
              leftArm = obj.skeleton.bones.find((b) =>
                b.name.toLowerCase().includes("leftarm")
              );
              rightArm = obj.skeleton.bones.find((b) =>
                b.name.toLowerCase().includes("rightarm")
              );
              // Try to find elbow joints (lower arm)
              leftElbow = obj.skeleton.bones.find((b) =>
                b.name.toLowerCase().includes("leftforearm") ||
                b.name.toLowerCase().includes("leftelbow") ||
                b.name.toLowerCase().includes("lowerarm_l")
              );
              rightElbow = obj.skeleton.bones.find((b) =>
                b.name.toLowerCase().includes("rightforearm") ||
                b.name.toLowerCase().includes("rightelbow") ||
                b.name.toLowerCase().includes("lowerarm_r")
              );
            }
          });

          loaded = true;
          console.log(`✅ ${gender} avatar loaded`);
        }
      );
    }

    loadAvatar(currentGender);

    /* ================= GLOBAL CONTROLS ================= */
    window.setGender = (g) => {
      if (g !== currentGender) {
        currentGender = g;
        loadAvatar(g);
      }
    };

    window.setExpression = (name) => {
      if (!headMesh) return;

      const presets = {
        neutral: {},
        happy: {
          mouthSmileLeft: 1,
          mouthSmileRight: 1,
          cheekSquintLeft: 0.3,
          cheekSquintRight: 0.3,
          eyeSquintLeft: 0.15,
          eyeSquintRight: 0.15,
        },
        angry: {
          browDownLeft: 0.7,
          browDownRight: 0.7,
          mouthFrownLeft: 0.7,
          mouthFrownRight: 0.7,
          eyeSquintLeft: 0.2,
          eyeSquintRight: 0.2,
        },
      };

      // Reset all morph targets to 0
      if (headMesh.morphTargetInfluences && headMorphs) {
        Object.values(headMorphs).forEach(
          (i) => (headMesh.morphTargetInfluences[i] = 0)
        );
      }

      const expr = presets[name] || {};
      Object.entries(expr).forEach(([k, v]) => {
        if (headMorphs[k] !== undefined)
          headMesh.morphTargetInfluences[headMorphs[k]] = v;
      });
    };

    /* ================= AUDIO / LIP SYNC ================= */
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const data = new Uint8Array(analyser.frequencyBinCount);

    let isSpeaking = false;
    let speechTimeout = null;

    window.playSpeech = async () => {
      await audioCtx.resume();
      const res = await fetch("/audio/speech.wav");
      const buffer = await audioCtx.decodeAudioData(await res.arrayBuffer());
      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(analyser);
      analyser.connect(audioCtx.destination);
      src.start();

      // Mark speaking as true for the duration of the audio
      isSpeaking = true;
      if (speechTimeout) clearTimeout(speechTimeout);
      speechTimeout = setTimeout(() => {
        isSpeaking = false;
      }, buffer.duration * 1000);
    };

    // --- TTS Lip Sync state ---
    let ttsLipSyncActive = false;
    let ttsLipSyncT = 0;

    // Expose start/stop lip sync for TTS
    window.startLipSync = () => {
      ttsLipSyncActive = true;
      ttsLipSyncT = 0;
    };
    window.stopLipSync = () => {
      ttsLipSyncActive = false;
      // Reset mouth morphs
      if (headMesh && headMorphs) {
        if (headMorphs.viseme_aa !== undefined)
          headMesh.morphTargetInfluences[headMorphs.viseme_aa] = 0;
        if (headMorphs.viseme_O !== undefined)
          headMesh.morphTargetInfluences[headMorphs.viseme_O] = 0;
      }
    };

    /* ================= CURSOR ================= */
    // Use normalized device coordinates (-1 to 1) relative to container
    // X movement restricted to within container, Y movement allowed globally
    // When cursor exits left/right, head faces that direction
    const cursor = { x: 0, y: 0, tx: 0, ty: 0, isInContainer: false };
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();

      // Check if cursor is within container bounds (for X axis restriction)
      const isInContainerX = e.clientX >= rect.left && e.clientX <= rect.right;
      const isInContainerY = e.clientY >= rect.top && e.clientY <= rect.bottom;
      cursor.isInContainer = isInContainerX && isInContainerY;

      // Y axis: always track (global Y movement)
      cursor.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      // X axis: track within container, or face exit direction when outside
      if (isInContainerX) {
        cursor.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      } else if (e.clientX < rect.left) {
        // Cursor is to the left of container - face left
        cursor.tx = -1;
      } else {
        // Cursor is to the right of container - face right
        cursor.tx = 1;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);

    /* ================= ANIMATION ================= */
    let t = 0;
    let blinkTimer = 0;
    let blinkInterval = 2 + Math.random() * 2; // seconds
    let blinkValue = 0;
    let blinking = false;

    function animate() {
      requestAnimationFrame(animate);
      t += 0.01;

      // Smooth background color transition
      currentBgColor.lerp(targetBgColor, 0.05);
      scene.background = currentBgColor;

      // Make cursor tracking more direct and snappy
      cursor.x += (cursor.tx - cursor.x) * 0.25;
      cursor.y += (cursor.ty - cursor.y) * 0.25;

      /* --- Lip Sync --- */
      let speakingNow = false;
      if (loaded && headMesh && teethMesh) {
        // If TTS lip sync is active, animate mouth morphs in a "talking" pattern
        if (ttsLipSyncActive) {
          ttsLipSyncT += 0.016;
          // Animate viseme_aa and viseme_O in a pseudo-random way for talking effect
          if (headMorphs.viseme_aa !== undefined)
            headMesh.morphTargetInfluences[headMorphs.viseme_aa] =
              0.4 + 0.4 * Math.abs(Math.sin(ttsLipSyncT * 6 + Math.sin(ttsLipSyncT * 2)));
          if (headMorphs.viseme_O !== undefined)
            headMesh.morphTargetInfluences[headMorphs.viseme_O] =
              0.2 + 0.2 * Math.abs(Math.sin(ttsLipSyncT * 4.2 + 1));
          speakingNow = true;
        } else {
          analyser.getByteFrequencyData(data);
          const energy = data.reduce((a, b) => a + b, 0) / data.length;
          const v = THREE.MathUtils.clamp(energy / 130, 0, 1);

          if (headMorphs.viseme_aa !== undefined)
            headMesh.morphTargetInfluences[headMorphs.viseme_aa] = v * 0.7;
          if (headMorphs.viseme_O !== undefined)
            headMesh.morphTargetInfluences[headMorphs.viseme_O] = v * 0.4;

          // If there's significant energy, consider speaking
          if (v > 0.05) speakingNow = true;
        }
      }

      // Keep isSpeaking true if playSpeech was called, but also fallback to analyser
      if (speakingNow) isSpeaking = true;
      else if (!speechTimeout) isSpeaking = false;

      /* --- Head / Cursor Tracking --- */
      if (neck) {
        let targetY, targetX;
        if (isSpeaking) {
          targetY = Math.sin(t * 0.6) * 0.05;
          targetX = Math.sin(t * 0.8) * 0.04 + 0.25; // Look further below when speaking
        } else {
          // Less sensitive direct mapping, limited to natural range
          targetY = cursor.x * 0.6;
          targetX = (-cursor.y+0.5) * 0.4;
        }
        neck.rotation.y += (targetY - neck.rotation.y) * 0.35;
        neck.rotation.x += (targetX - neck.rotation.x) * 0.35;
      }

      /* --- Eye Movement (Cursor Tracking) --- */
      if (headMesh && headMorphs) {
        let eyeH = 0, eyeV = 0;
        if (!isSpeaking) {
          // Direct mapping, limited to morph range
          eyeH = THREE.MathUtils.clamp(cursor.x, -1, 1);
          eyeV = THREE.MathUtils.clamp(cursor.y, -1, 1);
        }
        if (headMorphs.eyeLookInLeft !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeLookInLeft] = Math.max(0, -eyeH);
        if (headMorphs.eyeLookOutLeft !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeLookOutLeft] = Math.max(0, eyeH);
        if (headMorphs.eyeLookInRight !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeLookInRight] = Math.max(0, eyeH);
        if (headMorphs.eyeLookOutRight !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeLookOutRight] = Math.max(0, -eyeH);
        if (headMorphs.eyeLookUpLeft !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeLookUpLeft] = Math.max(0, -eyeV);
        if (headMorphs.eyeLookDownLeft !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeLookDownLeft] = Math.max(0, eyeV);
        if (headMorphs.eyeLookUpRight !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeLookUpRight] = Math.max(0, -eyeV);
        if (headMorphs.eyeLookDownRight !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeLookDownRight] = Math.max(0, eyeV);
      }

      /* --- Blinking --- */
      if (headMesh && headMorphs) {
        const delta = 0.016; // ~60fps
        blinkTimer += delta;

        if (!blinking && blinkTimer > blinkInterval) {
          blinking = true;
          blinkTimer = 0;
        }

        if (blinking) {
          blinkValue += 0.25;
          if (blinkValue >= 1) blinkValue = 1;
        } else {
          blinkValue -= 0.08;
          if (blinkValue <= 0) blinkValue = 0;
        }

        if (blinking && blinkValue >= 1) {
          blinking = false;
          blinkInterval = 2 + Math.random() * 2;
        }

        // Set blink morphs
        if (headMorphs.eyeBlinkLeft !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeBlinkLeft] = blinkValue;
        if (headMorphs.eyeBlinkRight !== undefined)
          headMesh.morphTargetInfluences[headMorphs.eyeBlinkRight] = blinkValue;
      }

      /* --- Idle Breathing --- */
      if (spine) {
        spine.rotation.x = Math.sin(t * 0.8) * 0.03;
        spine.rotation.y = cursor.x * 0.3;
      }

      /* --- Natural Hands (arms down) --- */
      if (leftArm && rightArm) {
        leftArm.rotation.x = armRotation.left.x;
        leftArm.rotation.y = armRotation.left.y;
        leftArm.rotation.z = armRotation.left.z;
        rightArm.rotation.x = armRotation.right.x;
        rightArm.rotation.y = armRotation.right.y;
        rightArm.rotation.z = armRotation.right.z;
      }

      /* --- Elbow Rotation (testing) --- */
      if (leftElbow && rightElbow) {
        leftElbow.rotation.x = elbowRotation.left.x;
        leftElbow.rotation.y = elbowRotation.left.y;
        leftElbow.rotation.z = elbowRotation.left.z;
        rightElbow.rotation.x = elbowRotation.right.x;
        rightElbow.rotation.y = elbowRotation.right.y;
        rightElbow.rotation.z = elbowRotation.right.z;
      }

      renderer.render(scene, camera);
    }

    animate();

    /* ================= CLEANUP ================= */
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
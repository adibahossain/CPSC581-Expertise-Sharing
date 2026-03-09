# Spatial Mentor
AI USAGE: The code is majorly written using AI (Opus 4.6 and GPT 5.4 with some design done by us)
A synchronous remote teaching system for 3D CAD workflows where experts coach novices using embodied communication — hand gestures, spatial annotations, and real-time feedback — instead of relying only on screen sharing.

## Why It Matters

Screen sharing leaves spatial ambiguity when teaching 3D modeling. "Click here" and "drag this edge" are hard to communicate without embodied cues. Spatial Mentor treats the body as part of the interface: experts demonstrate intent with gestures and voice-linked overlays, learners respond with gesture reactions and lightweight facial/attention signals, and annotations are spatially anchored to the shared CAD viewport.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| 3D Scene | Three.js, @react-three/fiber, @react-three/drei |
| Gesture Recognition | MediaPipe Hand Landmarker |
| Face Tracking | MediaPipe Face Landmarker |
| State Management | Zustand |
| Animations | Framer Motion |
| Real-time Sync | BroadcastChannel (demo) / Socket.IO (live) |

## Setup

```bash
# Prerequisites: Node.js 20+
nvm use 20  # if using nvm

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Permissions Needed

- **Camera**: Required for hand gesture recognition and face tracking
- **Microphone**: Optional (for future speech-to-text features)

The app works in manual fallback mode if camera permission is denied.

## How to Use

### Demo Mode (single machine)

1. Open http://localhost:3000
2. Click **Demo Mode**
3. Both Expert and Learner panels are visible
4. Allow camera access when prompted
5. Use the **toolbar** on the right to draw, add arrows, markers, text notes, or focus regions
6. Use **gesture fallback buttons** or actual hand gestures
7. Click **learner reaction buttons** to simulate learner responses

### Live Session (two browsers/tabs)

1. Open http://localhost:3000
2. Click **Create Session** — note the session code
3. In a second browser/tab, click **Join Session** and enter the code
4. Pick roles (Expert / Learner)
5. Annotations, reactions, and gestures sync between tabs via BroadcastChannel

### Multi-tab Sync

Open `/session/demo` in two tabs. Annotations drawn in one tab appear in the other. Reactions and gesture states sync automatically.

## Gesture List

### Expert Gestures
| Gesture | Action |
|---------|--------|
| Point (index finger) | Teaching pointer / spotlight |
| Pinch (thumb + index) | Drag annotation anchor |
| Open palm | Emphasize current target |
| Hold point (1s) | Place marker |

### Learner Gestures
| Gesture | Action |
|---------|--------|
| Thumbs up | Understood / continue |
| Thumbs down | Confused / stop |

All gestures have manual button fallbacks in the UI.

## Annotation Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| Select | — | Default mode, interact with 3D scene |
| Draw | — | Freehand drawing on viewport |
| Arrow | — | Directional arrow from start to end |
| Marker | — | Drop a point marker |
| Text | — | Click to place a text note |
| Focus | — | Pulsing focus ring around a region |
| Undo | — | Remove last annotation |
| Clear | — | Remove all annotations |

## Attention Indicator

The learner panel shows a lightweight attention estimate:
- **Green (Focused on target)**: Learner face is oriented toward screen center
- **Amber (May need clarification)**: Uncertain orientation
- **Red (Looking away)**: Face oriented away from screen
- **Gray (No reliable signal)**: No face detected

This is a heuristic estimate, not scientific eye tracking.

## Architecture

```
app/
  page.tsx                    # Landing page
  setup/page.tsx              # Permissions & role selection
  session/[id]/page.tsx       # Main session room
components/
  project/SharedViewport.tsx  # 3D viewport + annotation layer
  project/SceneCanvas.tsx     # Three.js canvas (client-only)
  project/ObjectScene.tsx     # Demo 3D object
  project/AnnotationLayer.tsx # Canvas overlay for annotations
  webcam/ExpertCamPanel.tsx   # Expert webcam + gesture tracking
  webcam/LearnerCamPanel.tsx  # Learner webcam + face tracking
  learner/LearnerReactionPanel.tsx  # Reaction buttons
  expert/ExpertGestureControls.tsx  # Manual gesture fallbacks
  session/RoomHeader.tsx      # Session header bar
  session/Toolbar.tsx         # Annotation tool rail
  session/AttentionIndicator.tsx    # Attention state badge
lib/
  mediapipe/handTracker.ts    # MediaPipe hand landmarker init
  mediapipe/faceLandmarker.ts # MediaPipe face landmarker init
  gestures/recognizeHandGesture.ts  # Gesture classification
  gestures/useHandGesture.ts  # React hook for gesture detection
  face/estimateConfusion.ts   # Confusion heuristic from blendshapes
  face/useFaceTracking.ts     # React hook for face tracking
  attention/estimateAttentionToTarget.ts  # Attention heuristic
  webcam/useWebcam.ts         # Webcam stream hook
  store/useSessionStore.ts    # Zustand global state
  sync/sessionChannel.ts      # BroadcastChannel sync transport
  sync/useSyncSession.ts      # Hook to wire sync to store
types/
  index.ts                    # All TypeScript types
```

## Known Limitations

- **Gesture recognition is approximate** — accuracy varies by lighting, camera angle, and hand size. Manual fallback buttons are always available.
- **Attention estimation is heuristic** — uses face orientation as a proxy for gaze, not true eye tracking. Labels are intentionally hedged ("may need clarification" vs. definitive statements).
- **Demo focuses on simple modeling instruction** — not full CAD integration. The 3D scene is a demo object, not a live CAD document.
- **BroadcastChannel sync is same-origin only** — works for multi-tab demo on one machine. Full remote sessions would need WebSocket/Socket.IO server deployment.
- **MediaPipe models load from CDN** — first load requires internet access and may take a few seconds.

## Future Work

- Speech-to-text captions and auto-generated notes
- AI summarization of lesson steps
- Playback/replay of expert annotation sequences
- Blender/Fusion plugin bridge for live CAD integration
- Collaborative object manipulation
- Haptic phone companion for learner confirmations
- Stronger gaze estimation with calibration

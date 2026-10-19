/**
 * NexSociety - 3D Digital Twin & Facility Command Center (twin.js)
 * Real-time Three.js WebGL architectural visualization
 * Features day/night lighting cycles, grand fountain, rain FX, and security patrol vehicle
 */

// Scene Globals
let scene, camera, renderer, controls;
let buildings = {};
let floorMeshes = { A: [], B: [], C: [] };
let poolWaterMesh = null;
let fountainWaterMesh = null;
let beaconLight = null;
let helipadLights = [];
let streetLights = [];
let bollardLights = [];
let poolLights = [];
let balconyLights = [];
let dirLight, ambientLight, hemiLight;

// State
let lightingModeIndex = 0; // 0: Day, 1: Sunset, 2: Night Mode
const lightingModes = [
    { name: "Day Mode", icon: "☀️", bg: 0x060913, fog: 0x060913, sunColor: 0xfff7ed, sunIntensity: 1.25, ambIntensity: 0.45 },
    { name: "Sunset (Golden)", icon: "🌆", bg: 0x2e1065, fog: 0x2e1065, sunColor: 0xf97316, sunIntensity: 1.1, ambIntensity: 0.3 },
    { name: "Night (Neon)", icon: "🌙", bg: 0x020617, fog: 0x020617, sunColor: 0x38bdf8, sunIntensity: 0.25, ambIntensity: 0.12 }
];

let isDroneTour = false;
let droneAngle = 0;
let isRainActive = false;
let rainParticles = null;
let patrolVehicle = null;
let patrolProgress = 0;

let selectedBuilding = null;
let selectedFloorIndex = 2; // Floor 2 (Flat A-204)
let targetCameraPos = null;
let targetLookAt = null;

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObject = null;

// 3D Screen Labels
const labelElements = [];
const labelData = [
    { name: "Tower A • Flat A-204", pos: new THREE.Vector3(-22, 26, -5), id: "A" },
    { name: "Tower B (Heights)", pos: new THREE.Vector3(12, 28, -12), id: "B" },
    { name: "Tower C (Executive)", pos: new THREE.Vector3(32, 24, 15), id: "C" },
    { name: "Grand Fountain", pos: new THREE.Vector3(0, 4, 18), id: "Fountain" },
    { name: "Pool & Sunbeds", pos: new THREE.Vector3(-18, 9, 24), id: "Clubhouse" },
    { name: "Gate 1 Checkpoint", pos: new THREE.Vector3(-42, 6, 0), id: "Gate" },
    { name: "Bay B-12 (Aryan Car)", pos: new THREE.Vector3(-6, 2, 10), id: "Parking" }
];

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    init3D();
    buildSocietyWorld();
    setupLabelOverlays();
    setupEventListeners();
    animate(0);
});

// -----------------------------------------------------------------------------
// 1. SCENE, CAMERA, LIGHTING & RENDERER SETUP
// -----------------------------------------------------------------------------
function init3D() {
    const canvas = document.getElementById("webglCanvas");
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.0055);

    // Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(-65, 48, 65);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 15;
    controls.maxDistance = 200;
    controls.target.set(0, 8, 0);

    // Lighting
    setupLighting();
}

function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xfff7ed, 1.25);
    dirLight.position.set(-60, 95, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -70;
    dirLight.shadow.camera.right = 70;
    dirLight.shadow.camera.top = 70;
    dirLight.shadow.camera.bottom = -70;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.35);
    scene.add(hemiLight);
}

// -----------------------------------------------------------------------------
// 2. PROCEDURAL 3D ARCHITECTURAL WORLD GENERATION
// -----------------------------------------------------------------------------
function buildSocietyWorld() {
    // --- Ground Base Podium ---
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.85,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(120, 2, 95), groundMat);
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Perimeter Neon Glow Border Line
    const boundaryGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(120, 0.1, 95));
    const boundaryMat = new THREE.LineBasicMaterial({ color: 0x6366f1, opacity: 0.8, transparent: true });
    const boundaryLine = new THREE.LineSegments(boundaryGeo, boundaryMat);
    boundaryLine.position.y = 0.05;
    scene.add(boundaryLine);

    // Road Grid & Pathways
    createRoadNetwork();

    // Landscaped Green Lawns & Palm Trees
    createLandscaping();

    // --- High-Rise Towers ---
    buildings.A = createTower({
        name: "Tower A",
        id: "A",
        floors: 10,
        pos: new THREE.Vector3(-22, 0, -5),
        color: 0x1e293b,
        accentColor: 0x6366f1,
        width: 15,
        depth: 13
    });

    buildings.B = createTower({
        name: "Tower B",
        id: "B",
        floors: 12,
        pos: new THREE.Vector3(12, 0, -12),
        color: 0x1e293b,
        accentColor: 0x06b6d4,
        width: 16,
        depth: 14
    });

    buildings.C = createTower({
        name: "Tower C",
        id: "C",
        floors: 9,
        pos: new THREE.Vector3(32, 0, 15),
        color: 0x1e293b,
        accentColor: 0x8b5cf6,
        width: 14,
        depth: 12
    });

    // Clubhouse & Gym Pavilion
    buildings.Clubhouse = createClubhouse();

    // Swimming Pool with Animated Water Shaders
    createSwimmingPool();

    // Poolside Lounger Chairs & Parasols
    createPoolsideFurniture();

    // Central Grand Water Fountain
    buildings.Fountain = createGrandFountain();

    // Security Gate 1 & Checkpoint
    buildings.Gate = createSecurityGate();

    // Parking Lot & Aryan's 3D Car
    createParkingBays();

    // Moving Autonomous Patrol / Delivery Vehicle
    createPatrolVehicle();

    // Rooftop Aviation Beacon Lights
    createAviationBeacons();

    // Street Lights Array
    createStreetLamps();

    // Pathway LED Ground Bollards
    createPathwayBollards();

    // Rain Particle System
    createRainSystem();
}

// -----------------------------------------------------------------------------
// 3. ROADS & PATHWAYS
// -----------------------------------------------------------------------------
function createRoadNetwork() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e2230, roughness: 0.9 });

    // Main East-West Road
    const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(110, 8), roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.02, 0);
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    // North-South Access Road
    const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(8, 70), roadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(-6, 0.025, 5);
    crossRoad.receiveShadow = true;
    scene.add(crossRoad);

    // Road Divider Dashed Line
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true });
    for (let x = -48; x <= 48; x += 6) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.03, 0);
        scene.add(dash);
    }
}

// Greenery & Trees
function createLandscaping() {
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });

    // Lawn 1 (Near Clubhouse)
    const lawn1 = new THREE.Mesh(new THREE.PlaneGeometry(24, 22), lawnMat);
    lawn1.rotation.x = -Math.PI / 2;
    lawn1.position.set(-20, 0.03, 26);
    lawn1.receiveShadow = true;
    scene.add(lawn1);

    // Lawn 2 (Central Courtyard)
    const lawn2 = new THREE.Mesh(new THREE.PlaneGeometry(26, 16), lawnMat);
    lawn2.rotation.x = -Math.PI / 2;
    lawn2.position.set(16, 0.03, 20);
    lawn2.receiveShadow = true;
    scene.add(lawn2);

    // Expanded diverse tree layout across society (Perimeter, Courtyards, Tower Environs)
    const treePositions = [
        // Outer Perimeter Green Belt
        [-54, -40], [-46, -40], [-36, -40], [-26, -40], [-16, -40], [-6, -40], [4, -40], [14, -40], [24, -40], [34, -40], [44, -40], [54, -40],
        [-54, 40], [-44, 40], [-34, 40], [-24, 40], [-14, 40], [-2, 40], [10, 40], [20, 40], [30, 40], [40, 40], [50, 40],
        [-54, -28], [-54, -18], [-54, -8], [-54, 2], [-54, 14], [-54, 26], [-54, 34],
        [54, -30], [54, -18], [54, -6], [54, 6], [54, 18], [54, 28], [54, 36],

        // Clubhouse & Poolside Tropical Palm Oasis
        [-34, 16], [-34, 22], [-34, 28], [-34, 34], [-38, 20], [-38, 30],
        [-8, 20], [-8, 26], [-8, 32], [-8, 38],

        // Central Courtyard & Grand Fountain Promenade
        [4, 26], [12, 26], [20, 26], [28, 26], [36, 26],
        [-6, 28], [0, 32], [8, 32],
        [-40, -10], [-40, -18], [-40, -28],
        [-2, -22], [4, -22], [14, -22], [22, -22], [30, -22],

        // Tower A Perimeter Greenery & Garden
        [-34, -4], [-34, 4], [-12, -4], [-12, 4], [-22, -18], [-28, -16], [-16, -16],

        // Tower B Heights Greenery
        [2, -10], [2, -2], [22, -10], [22, -2], [12, -24], [6, -24], [18, -24],

        // Tower C Garden Walkway
        [22, 10], [22, 20], [42, 10], [42, 20], [32, 26], [38, 24]
    ];

    treePositions.forEach(([x, z], idx) => {
        if (idx % 3 === 0) {
            createPalmTree(x, z);
        } else if (idx % 3 === 1) {
            createFloweringTree(x, z);
        } else {
            createTree(x, z);
        }
    });

    // Decorative Ground Planters at Building Entrances
    createTowerPlanters();
}

function createTowerPlanters() {
    const planterLocations = [
        [-22, 3], // Tower A front
        [12, -4], // Tower B front
        [32, 22]  // Tower C front
    ];

    const planterMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });

    planterLocations.forEach(([px, pz]) => {
        // Left planter
        const pLeft = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.6, 1.2), planterMat);
        pLeft.position.set(px - 3.5, 0.3, pz);
        scene.add(pLeft);

        const hedgeLeft = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.7, 1.0), hedgeMat);
        hedgeLeft.position.set(px - 3.5, 0.8, pz);
        scene.add(hedgeLeft);

        // Right planter
        const pRight = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.6, 1.2), planterMat);
        pRight.position.set(px + 3.5, 0.3, pz);
        scene.add(pRight);

        const hedgeRight = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.7, 1.0), hedgeMat);
        hedgeRight.position.set(px + 3.5, 0.8, pz);
        scene.add(hedgeRight);

        // Golden warm LED accent on the planter
        const pLight = new THREE.PointLight(0xfef08a, 0.7, 5);
        pLight.position.set(px, 0.6, pz);
        scene.add(pLight);
        bollardLights.push(pLight);
    });
}

function createTree(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.4, 2.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
    );
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.6, 1),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, flatShading: true })
    );
    foliage.position.y = 3.2;
    foliage.castShadow = true;
    group.add(foliage);

    scene.add(group);
}

function createPalmTree(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 4.2, 7), trunkMat);
    trunk.position.y = 2.1;
    trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true;
    group.add(trunk);

    const palmCrownMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6, flatShading: true });
    for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 4), palmCrownMat);
        frond.rotation.z = 1.1;
        frond.rotation.y = (i * Math.PI) / 3;
        frond.position.set(0, 4.3, 0);
        group.add(frond);
    }

    scene.add(group);
}

function createFloweringTree(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x5c2c16, roughness: 0.9 })
    );
    trunk.position.y = 1.2;
    group.add(trunk);

    const foliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.4, 1),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6, flatShading: true })
    );
    foliage.position.y = 2.8;
    group.add(foliage);

    scene.add(group);
}

// -----------------------------------------------------------------------------
// 4. TOWER BUILDER (WITH NEON CORNER STRIPS & BALCONIES)
// -----------------------------------------------------------------------------
function createTower({ name, id, floors, pos, color, accentColor, width, depth }) {
    const towerGroup = new THREE.Group();
    towerGroup.position.copy(pos);
    towerGroup.userData = { id, name, type: "Tower", floors };

    const floorHeight = 2.4;
    floorMeshes[id] = [];

    for (let i = 1; i <= floors; i++) {
        const floorGroup = new THREE.Group();
        floorGroup.position.y = (i - 1) * floorHeight;
        floorGroup.userData = { id, towerId: id, floorNum: i, type: "Floor" };

        // Floor slab
        const slabMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.3 });
        const slab = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.4, depth + 0.6), slabMat);
        slab.position.y = 0.2;
        slab.receiveShadow = true;
        floorGroup.add(slab);

        // Core Floor Body
        const bodyMat = new THREE.MeshStandardMaterial({
            color: (id === "A" && i === 2) ? 0x064e3b : color,
            roughness: 0.7,
            metalness: 0.2
        });
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, floorHeight - 0.4, depth), bodyMat);
        body.position.y = floorHeight / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        floorGroup.add(body);

        // Glass Windows Panels
        const windowMat = new THREE.MeshStandardMaterial({
            color: (id === "A" && i === 2) ? 0x34d399 : 0x38bdf8,
            emissive: (id === "A" && i === 2) ? 0x10b981 : 0x0284c7,
            emissiveIntensity: (id === "A" && i === 2) ? 0.7 : 0.3,
            roughness: 0.1,
            metalness: 0.8
        });

        const windowFront = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.75, 1.1), windowMat);
        windowFront.position.set(0, floorHeight / 2, depth / 2 + 0.02);
        floorGroup.add(windowFront);

        const windowBack = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.75, 1.1), windowMat);
        windowBack.rotation.y = Math.PI;
        windowBack.position.set(0, floorHeight / 2, -depth / 2 - 0.02);
        floorGroup.add(windowBack);

        // Balcony Base Slab
        const balconyWidth = width * 0.85;
        const balconyDepth = 1.6;
        const balcony = new THREE.Mesh(
            new THREE.BoxGeometry(balconyWidth, 0.25, balconyDepth),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
        );
        balcony.position.set(0, 0.15, depth / 2 + balconyDepth / 2);
        balcony.castShadow = true;
        balcony.receiveShadow = true;
        floorGroup.add(balcony);

        // Balcony Glass Railing (Tinted Modern Balustrade)
        const railingGlassMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.45,
            roughness: 0.1,
            metalness: 0.9
        });
        const glassFront = new THREE.Mesh(new THREE.BoxGeometry(balconyWidth, 0.75, 0.04), railingGlassMat);
        glassFront.position.set(0, 0.55, depth / 2 + balconyDepth);
        floorGroup.add(glassFront);

        // Balcony Sides Railing
        const glassSideLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, balconyDepth), railingGlassMat);
        glassSideLeft.position.set(-balconyWidth / 2, 0.55, depth / 2 + balconyDepth / 2);
        floorGroup.add(glassSideLeft);

        const glassSideRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, balconyDepth), railingGlassMat);
        glassSideRight.position.set(balconyWidth / 2, 0.55, depth / 2 + balconyDepth / 2);
        floorGroup.add(glassSideRight);

        // Glowing Railing Top Edge / Handrail Strip
        const handrailMat = new THREE.MeshStandardMaterial({
            color: 0xffedd5,
            emissive: (id === "A" && i === 2) ? 0x10b981 : 0xfbbf24,
            emissiveIntensity: 0.6,
            roughness: 0.2
        });
        const handrail = new THREE.Mesh(new THREE.BoxGeometry(balconyWidth + 0.05, 0.06, 0.08), handrailMat);
        handrail.position.set(0, 0.94, depth / 2 + balconyDepth);
        floorGroup.add(handrail);

        // Balcony Warm Ceiling Downlight (Glowing Fixture + Real PointLight)
        const isSelectedFlat = (id === "A" && i === 2);
        const bulbMat = new THREE.MeshBasicMaterial({
            color: isSelectedFlat ? 0x34d399 : 0xfef08a
        });
        const ceilingBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bulbMat);
        ceilingBulb.position.set(0, floorHeight - 0.2, depth / 2 + 0.8);
        floorGroup.add(ceilingBulb);

        // Every alternate floor or selected flat gets real atmospheric PointLight
        if (i % 2 === 0 || isSelectedFlat) {
            const bLight = new THREE.PointLight(
                isSelectedFlat ? 0x10b981 : 0xfef08a,
                isSelectedFlat ? 1.6 : 0.85,
                7.5
            );
            bLight.position.set(0, floorHeight - 0.35, depth / 2 + 0.8);
            floorGroup.add(bLight);
            balconyLights.push(bLight);
        }

        floorMeshes[id].push({ group: floorGroup, bodyMat, windowMat, floorNum: i });
        towerGroup.add(floorGroup);
    }

    // --- Rooftop Architecture ---
    const totalHeight = floors * floorHeight;

    const liftRoom = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.45, 3.2, depth * 0.45),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
    );
    liftRoom.position.set(0, totalHeight + 1.6, 0);
    liftRoom.castShadow = true;
    towerGroup.add(liftRoom);

    // Solar Panel Arrays
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, emissive: 0x312e81, roughness: 0.2, metalness: 0.9 });
    for (let s = -3; s <= 3; s += 3) {
        const solarPanel = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.2), solarMat);
        solarPanel.rotation.x = -Math.PI / 3;
        solarPanel.position.set(s, totalHeight + 1, -depth * 0.28);
        towerGroup.add(solarPanel);
    }

    // Architectural vertical edge accent lighting
    const neonMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const cornerOffsets = [
        [-width / 2, -depth / 2],
        [width / 2, -depth / 2],
        [-width / 2, depth / 2],
        [width / 2, depth / 2]
    ];
    cornerOffsets.forEach(([cx, cz]) => {
        const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, totalHeight, 0.2), neonMat);
        edgeLine.position.set(cx, totalHeight / 2, cz);
        towerGroup.add(edgeLine);
    });

    scene.add(towerGroup);
    return towerGroup;
}

// -----------------------------------------------------------------------------
// 5. CLUBHOUSE, POOL & POOLSIDE SUNBEDS
// -----------------------------------------------------------------------------
function createClubhouse() {
    const group = new THREE.Group();
    group.position.set(-18, 0, 20);
    group.userData = { id: "Clubhouse", name: "Clubhouse & Gym Pavilion", type: "Amenity" };

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.65,
        roughness: 0.1,
        metalness: 0.9
    });
    const pavilion = new THREE.Mesh(new THREE.BoxGeometry(20, 6.5, 14), glassMat);
    pavilion.position.y = 3.25;
    pavilion.castShadow = true;
    group.add(pavilion);

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(21, 0.6, 15), roofMat);
    roof.position.y = 6.6;
    roof.castShadow = true;
    group.add(roof);

    const interiorLight = new THREE.PointLight(0xf59e0b, 1.4, 22);
    interiorLight.position.set(0, 3, 0);
    group.add(interiorLight);

    scene.add(group);
    return group;
}

function createSwimmingPool() {
    const poolGroup = new THREE.Group();
    poolGroup.position.set(-18, 0.05, 32);
    poolGroup.userData = { id: "Pool", name: "Infinity Swimming Pool", type: "Amenity" };

    const basinMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const basin = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 8), basinMat);
    basin.position.y = -0.25;
    basin.receiveShadow = true;
    poolGroup.add(basin);

    const waterGeo = new THREE.PlaneGeometry(15, 7, 24, 24);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.88,
        roughness: 0.08,
        metalness: 0.9
    });
    poolWaterMesh = new THREE.Mesh(waterGeo, waterMat);
    poolWaterMesh.rotation.x = -Math.PI / 2;
    poolWaterMesh.position.y = 0.08;
    poolGroup.add(poolWaterMesh);

    // Underwater Submersible Cyan Point Lights
    [-4, 4].forEach((px) => {
        const uLight = new THREE.PointLight(0x06b6d4, 2.8, 16);
        uLight.position.set(px, 0.4, 0);
        poolGroup.add(uLight);
        poolLights.push(uLight);
    });

    scene.add(poolGroup);
}

function createPoolsideFurniture() {
    const group = new THREE.Group();
    group.position.set(-18, 0.05, 38);

    // 4 Modern Sun Loungers
    for (let i = -6; i <= 6; i += 4) {
        const lounger = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.35, 3.2),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
        );
        lounger.position.set(i, 0.2, 0);
        lounger.castShadow = true;
        group.add(lounger);
    }

    // 2 Parasol Umbrellas
    [-4, 4].forEach((ux) => {
        const umbrellaPole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        umbrellaPole.position.set(ux, 1.6, 2.2);
        group.add(umbrellaPole);

        const canopy = new THREE.Mesh(
            new THREE.ConeGeometry(1.8, 0.6, 8),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
        );
        canopy.position.set(ux, 3.2, 2.2);
        canopy.castShadow = true;
        group.add(canopy);
    });

    scene.add(group);
}

// -----------------------------------------------------------------------------
// 6. GRAND CENTRAL WATER FOUNTAIN
// -----------------------------------------------------------------------------
function createGrandFountain() {
    const group = new THREE.Group();
    group.position.set(0, 0.03, 18);
    group.userData = { id: "Fountain", name: "Grand Central Plaza Water Fountain", type: "Amenity" };

    // Granite Basin Ring
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, 0.8, 24), basinMat);
    basin.position.y = 0.4;
    basin.castShadow = true;
    group.add(basin);

    // Inner Water Pool
    const fWaterMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x6366f1,
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.85
    });
    fountainWaterMesh = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.2, 24), fWaterMat);
    fountainWaterMesh.position.y = 0.75;
    group.add(fountainWaterMesh);

    // Center Spout Pillar
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 2.2, 12), basinMat);
    spout.position.y = 1.3;
    group.add(spout);

    // Spouting Water Cone
    const sprayMat = new THREE.MeshBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.75 });
    const spray = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 12), sprayMat);
    spray.position.y = 2.8;
    group.add(spray);

    // Underwater Purple/Blue Neon Glow
    const fountainLight = new THREE.PointLight(0xa855f7, 2.5, 14);
    fountainLight.position.set(0, 1.2, 0);
    group.add(fountainLight);

    scene.add(group);
    return group;
}

// -----------------------------------------------------------------------------
// 7. SECURITY GATE 1 & PARKING BAYS
// -----------------------------------------------------------------------------
function createSecurityGate() {
    const group = new THREE.Group();
    group.position.set(-42, 0, 0);
    group.userData = { id: "Gate", name: "Security Gate 1 & Guard Post", type: "Security" };

    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), cabinMat);
    cabin.position.y = 2;
    cabin.castShadow = true;
    group.add(cabin);

    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.5), winMat);
    win.position.set(0, 2.2, 2.52);
    group.add(win);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 8), poleMat);
    pole.rotation.z = Math.PI / 2;
    pole.position.set(0, 1.1, 6.5);
    pole.castShadow = true;
    group.add(pole);

    // Neon Canopy Beam
    const canopyNeon = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.2, 5.4), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
    canopyNeon.position.set(0, 4.1, 0);
    group.add(canopyNeon);

    const signalLight = new THREE.PointLight(0x10b981, 1.8, 10);
    signalLight.position.set(3.2, 3.5, 3);
    group.add(signalLight);

    scene.add(group);
    return group;
}

function createParkingBays() {
    const parkingGroup = new THREE.Group();
    parkingGroup.position.set(-6, 0.03, 10);
    parkingGroup.userData = { id: "Parking", name: "Parking Bay B-12 (Aryan Sharma)", type: "Parking" };

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, opacity: 0.75, transparent: true });
    for (let i = 0; i < 4; i++) {
        const slotLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 5.5), lineMat);
        slotLine.rotation.x = -Math.PI / 2;
        slotLine.position.set(i * 3.2 - 5, 0, 0);
        parkingGroup.add(slotLine);
    }

    // Aryan's Car in Bay B-12 (with glowing headlights & taillights!)
    const carGroup = createStylizedCar(0x38bdf8, true);
    carGroup.position.set(-1.8, 0, 0);
    parkingGroup.add(carGroup);

    // Second Car in Bay B-11
    const car2 = createStylizedCar(0xe2e8f0, false);
    car2.position.set(1.4, 0, 0);
    parkingGroup.add(car2);

    scene.add(parkingGroup);
}

function createStylizedCar(bodyColor, withLights = false) {
    const car = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3, metalness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 4.4), bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    car.add(body);

    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 2.3), cabinMat);
    cabin.position.set(0, 1.15, -0.2);
    cabin.castShadow = true;
    car.add(cabin);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
    [
        [-1.1, 0.35, 1.3],
        [1.1, 0.35, 1.3],
        [-1.1, 0.35, -1.3],
        [1.1, 0.35, -1.3]
    ].forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        car.add(wheel);
    });

    if (withLights) {
        // Glowing White Headlights
        const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.8, 0.8].forEach((hx) => {
            const hl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), headMat);
            hl.position.set(hx, 0.6, 2.22);
            car.add(hl);

            const hSpot = new THREE.SpotLight(0xffffff, 1.5, 12, Math.PI / 6, 0.5);
            hSpot.position.set(hx, 0.6, 2.2);
            hSpot.target.position.set(hx, 0, 8);
            car.add(hSpot);
            car.add(hSpot.target);
        });

        // Glowing Red Taillights
        const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        [-0.8, 0.8].forEach((tx) => {
            const tl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), tailMat);
            tl.position.set(tx, 0.65, -2.22);
            car.add(tl);
        });
    }

    return car;
}

// -----------------------------------------------------------------------------
// 8. MOVING AUTONOMOUS PATROL SCOOTER / CAR
// -----------------------------------------------------------------------------
function createPatrolVehicle() {
    patrolVehicle = createStylizedCar(0x10b981, true);
    patrolVehicle.scale.set(0.75, 0.75, 0.75);
    patrolVehicle.position.set(-36, 0, 0);
    scene.add(patrolVehicle);
}

function updatePatrolVehicle(delta) {
    if (!patrolVehicle) return;
    patrolProgress += delta * 0.25;

    // Move back and forth along main road (-36 to 36)
    const x = Math.sin(patrolProgress) * 36;
    patrolVehicle.position.x = x;
    patrolVehicle.position.z = Math.cos(patrolProgress) > 0 ? 1.8 : -1.8;
    patrolVehicle.rotation.y = Math.cos(patrolProgress) > 0 ? Math.PI / 2 : -Math.PI / 2;
}

// -----------------------------------------------------------------------------
// 9. LIGHTING DETAILS: BEACONS, STREET LAMPS & BOLLARDS
// -----------------------------------------------------------------------------
function createAviationBeacons() {
    const beaconGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.set(-22, 27.5, -5);
    scene.add(beaconMesh);

    beaconLight = new THREE.PointLight(0xef4444, 2.8, 22);
    beaconLight.position.set(-22, 27.5, -5);
    scene.add(beaconLight);

    // Tower A Helipad Ring Lights (Alternating Green & Amber)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const hLight = new THREE.PointLight((Math.sin(a) > 0) ? 0x10b981 : 0xf59e0b, 1.2, 8);
        hLight.position.set(-22 + Math.cos(a) * 4, 26.2, -5 + Math.sin(a) * 4);
        scene.add(hLight);
        helipadLights.push(hLight);
    }
}

function createStreetLamps() {
    const lampPositions = [
        [-30, 4.5], [-10, 4.5], [10, 4.5], [30, 4.5],
        [-30, -4.5], [-10, -4.5], [10, -4.5], [30, -4.5]
    ];

    lampPositions.forEach(([x, z]) => {
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 4.5, 6),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
        );
        post.position.set(x, 2.25, z);
        scene.add(post);

        const light = new THREE.SpotLight(0xfef08a, 1.2, 18, Math.PI / 4, 0.4);
        light.position.set(x, 4.4, z);
        light.target.position.set(x, 0, z);
        scene.add(light);
        scene.add(light.target);
        streetLights.push(light);
    });
}

function createPathwayBollards() {
    const bollardPositions = [
        [-24, 12], [-18, 12], [-12, 12], [-6, 12],
        [0, 12], [6, 12], [12, 12], [18, 12],
        [-24, 24], [-12, 24], [0, 24], [12, 24]
    ];

    bollardPositions.forEach(([bx, bz]) => {
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
        );
        post.position.set(bx, 0.45, bz);
        scene.add(post);

        const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.14, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        bulb.position.set(bx, 0.9, bz);
        scene.add(bulb);

        const pLight = new THREE.PointLight(0xfef08a, 0.8, 6);
        pLight.position.set(bx, 0.9, bz);
        scene.add(pLight);
        bollardLights.push(pLight);
    });
}

// -----------------------------------------------------------------------------
// 10. RAIN PARTICLE SYSTEM (WEATHER FX)
// -----------------------------------------------------------------------------
function createRainSystem() {
    const count = 1800;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 110;
        positions[i + 1] = Math.random() * 60;
        positions[i + 2] = (Math.random() - 0.5) * 90;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.35,
        transparent: true,
        opacity: 0.75
    });

    rainParticles = new THREE.Points(geo, mat);
    rainParticles.visible = false;
    scene.add(rainParticles);
}

function updateRain() {
    if (!rainParticles || !isRainActive) return;
    const pos = rainParticles.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
        pos[i] -= 1.2;
        if (pos[i] < 0) pos[i] = 60;
    }
    rainParticles.geometry.attributes.position.needsUpdate = true;
}

function toggleRainFx() {
    isRainActive = !isRainActive;
    if (rainParticles) rainParticles.visible = isRainActive;

    const btn = document.getElementById("btnRainToggle");
    const rainLabel = document.getElementById("rainLabel");

    if (isRainActive) {
        btn.classList.add("active");
        rainLabel.textContent = "Rain (Active)";
    } else {
        btn.classList.remove("active");
        rainLabel.textContent = "Rain FX";
    }
}

// -----------------------------------------------------------------------------
// 11. 3-STAGE LIGHTING CYCLE (DAY / SUNSET / NEON NIGHT)
// -----------------------------------------------------------------------------
function cycleLightingMode() {
    lightingModeIndex = (lightingModeIndex + 1) % lightingModes.length;
    const mode = lightingModes[lightingModeIndex];

    const lightIcon = document.getElementById("lightIcon");
    const lightLabel = document.getElementById("lightLabel");
    if (lightIcon) lightIcon.textContent = mode.icon;
    if (lightLabel) lightLabel.textContent = mode.name;

    scene.background.setHex(mode.bg);
    scene.fog.color.setHex(mode.fog);
    dirLight.color.setHex(mode.sunColor);
    dirLight.intensity = mode.sunIntensity;
    ambientLight.intensity = mode.ambIntensity;

    const isNight = lightingModeIndex === 2;
    const isSunset = lightingModeIndex === 1;

    // Adjust street, bollard, pool, and building balcony lights
    streetLights.forEach((l) => (l.intensity = isNight ? 1.8 : (isSunset ? 0.9 : 0.4)));
    bollardLights.forEach((b) => (b.intensity = isNight ? 1.2 : (isSunset ? 0.6 : 0.1)));
    poolLights.forEach((p) => (p.intensity = isNight ? 3.5 : 1.2));
    balconyLights.forEach((bl) => (bl.intensity = isNight ? 1.8 : (isSunset ? 1.1 : 0.35)));
}

// -----------------------------------------------------------------------------
// 12. FLOATING 3D SCREEN LABELS
// -----------------------------------------------------------------------------
function setupLabelOverlays() {
    const container = document.getElementById("labelsContainer");
    if (!container) return;

    labelData.forEach((item) => {
        const div = document.createElement("div");
        div.className = "building-label-3d";
        div.innerHTML = `<span>📍</span> <span>${item.name}</span>`;
        div.onclick = () => focusTargetById(item.id);
        container.appendChild(div);
        labelElements.push({ elem: div, pos: item.pos, id: item.id });
    });
}

function updateScreenLabels() {
    const tempV = new THREE.Vector3();
    const halfWidth = window.innerWidth / 2;
    const halfHeight = window.innerHeight / 2;

    labelElements.forEach((item) => {
        tempV.copy(item.pos);
        tempV.project(camera);

        if (tempV.z > 1) {
            item.elem.style.display = "none";
            return;
        }

        item.elem.style.display = "flex";
        const x = (tempV.x * halfWidth) + halfWidth;
        const y = -(tempV.y * halfHeight) + halfHeight;
        item.elem.style.left = `${x}px`;
        item.elem.style.top = `${y}px`;
    });
}

// -----------------------------------------------------------------------------
// 13. USER INTERACTION & RAYCASTING
// -----------------------------------------------------------------------------
function setupEventListeners() {
    window.addEventListener("resize", onWindowResize);

    const canvas = document.getElementById("webglCanvas");
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onSceneClick);

    controls.addEventListener("start", () => {
        if (isDroneTour) toggleDroneTour(false);
    });
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let root = intersects[0].object;
        while (root.parent && root.parent !== scene && !root.userData.id) {
            root = root.parent;
        }
        if (root && root.userData.id) {
            document.body.style.cursor = "pointer";
            hoveredObject = root;
            return;
        }
    }
    document.body.style.cursor = "default";
    hoveredObject = null;
}

function onSceneClick(e) {
    if (!hoveredObject || !hoveredObject.userData.id) return;
    focusTargetById(hoveredObject.userData.id);
}

function focusTargetById(id) {
    if (id === "A") focusTower("A");
    else if (id === "B") focusTower("B");
    else if (id === "C") focusTower("C");
    else if (id === "Clubhouse" || id === "Pool") focusClubhouse();
    else if (id === "Fountain") focusFountain();
    else if (id === "Gate") focusGate();
    else if (id === "Parking") focusParking();
}

// -----------------------------------------------------------------------------
// 14. CAMERA ANIMATIONS & FOCUS TARGETS
// -----------------------------------------------------------------------------
function smoothMoveCamera(toPos, toLookAt) {
    targetCameraPos = toPos.clone();
    targetLookAt = toLookAt.clone();
    if (isDroneTour) toggleDroneTour(false);
}

function focusTower(towerId) {
    selectedBuilding = towerId;
    const posMap = {
        A: { cam: new THREE.Vector3(-45, 24, 25), target: new THREE.Vector3(-22, 14, -5) },
        B: { cam: new THREE.Vector3(-8, 30, 22), target: new THREE.Vector3(12, 16, -12) },
        C: { cam: new THREE.Vector3(10, 26, 42), target: new THREE.Vector3(32, 12, 15) }
    };
    const conf = posMap[towerId];
    smoothMoveCamera(conf.cam, conf.target);
    openInspectorForTower(towerId);
}

function focusFountain() {
    smoothMoveCamera(new THREE.Vector3(-18, 14, 34), new THREE.Vector3(0, 3, 18));
    openInspectorForFountain();
}

function focusClubhouse() {
    smoothMoveCamera(new THREE.Vector3(-36, 16, 42), new THREE.Vector3(-18, 4, 24));
    openInspectorForClubhouse();
}

function focusGate() {
    smoothMoveCamera(new THREE.Vector3(-60, 14, 18), new THREE.Vector3(-42, 2, 0));
    openInspectorForGate();
}

function focusParking() {
    smoothMoveCamera(new THREE.Vector3(-22, 12, 24), new THREE.Vector3(-6, 1, 10));
    openInspectorForParking();
}

function resetCameraView() {
    smoothMoveCamera(new THREE.Vector3(-65, 48, 65), new THREE.Vector3(0, 8, 0));
    closeInspectorPanel();
}

// -----------------------------------------------------------------------------
// 15. ARCHITECTURAL INSPECTOR SIDEBAR LOGIC
// -----------------------------------------------------------------------------
function openInspectorForTower(towerId) {
    const panel = document.getElementById("twinSidebarPanel");
    panel.classList.add("open");

    const titles = {
        A: "Tower A — Green Meadows",
        B: "Tower B — Heights Wing",
        C: "Tower C — Executive Wing"
    };

    document.getElementById("inspectorTitle").textContent = titles[towerId] || `Tower ${towerId}`;
    document.getElementById("inspectorSubtitle").textContent = "Residential High-Rise • 10 Floors Active";
    document.getElementById("kpiUnits").textContent = "38 / 40 Flats";
    document.getElementById("kpiMaintenance").textContent = "95% Settled";
    document.getElementById("kpiPower").textContent = "14.2 kW";
    document.getElementById("kpiLifts").textContent = "2 Operational";

    document.getElementById("floorModule").style.display = "block";
    selectFloor(2);
}

function selectFloor(floorNum) {
    selectedFloorIndex = floorNum;

    document.querySelectorAll(".floor-pill-btn").forEach((btn) => btn.classList.remove("active"));
    event?.target?.classList.add("active");

    if (floorMeshes.A) {
        floorMeshes.A.forEach((f) => {
            if (f.floorNum === floorNum) {
                f.bodyMat.color.setHex(0x064e3b);
                f.windowMat.color.setHex(0x34d399);
                f.windowMat.emissive.setHex(0x10b981);
                f.windowMat.emissiveIntensity = 0.85;
            } else {
                f.bodyMat.color.setHex(0x1e293b);
                f.windowMat.color.setHex(0x38bdf8);
                f.windowMat.emissive.setHex(0x0284c7);
                f.windowMat.emissiveIntensity = 0.3;
            }
        });
    }

    const unitTitle = document.getElementById("unitTitle");
    const unitOwner = document.getElementById("unitOwnerName");
    const unitStatus = document.getElementById("unitStatusBadge");

    if (floorNum === 2) {
        unitTitle.textContent = "Flat A-204 (2nd Floor)";
        unitOwner.textContent = "Primary Member: Aryan Sharma";
        unitStatus.textContent = "PAID & ACTIVE";
        unitStatus.style.background = "rgba(16, 185, 129, 0.2)";
        unitStatus.style.color = "#34d399";
    } else if (floorNum === 3) {
        unitTitle.textContent = "Flat A-301 (3rd Floor)";
        unitOwner.textContent = "Member: Deepak Chopra";
        unitStatus.textContent = "PENDING ARREARS";
        unitStatus.style.background = "rgba(245, 158, 11, 0.2)";
        unitStatus.style.color = "#fbbf24";
    } else {
        unitTitle.textContent = `Flat A-${floorNum}01 (Floor ${floorNum})`;
        unitOwner.textContent = "Society Resident";
        unitStatus.textContent = "VERIFIED";
        unitStatus.style.background = "rgba(56, 189, 248, 0.2)";
        unitStatus.style.color = "#38bdf8";
    }
}

function openInspectorForFountain() {
    const panel = document.getElementById("twinSidebarPanel");
    panel.classList.add("open");

    document.getElementById("inspectorTitle").textContent = "Grand Central Plaza Fountain";
    document.getElementById("inspectorSubtitle").textContent = "Water Feature & Gathering Square";
    document.getElementById("kpiUnits").textContent = "12,000 L";
    document.getElementById("kpiMaintenance").textContent = "Filtered 24/7";
    document.getElementById("kpiPower").textContent = "2.2 kW Pump";
    document.getElementById("kpiLifts").textContent = "RGB Active";

    document.getElementById("floorModule").style.display = "none";
    document.getElementById("unitTitle").textContent = "Centennial Plaza";
    document.getElementById("unitOwnerName").textContent = "Fountain Show: Active 07:00 AM - 11:00 PM";
    document.getElementById("unitStatusBadge").textContent = "OPERATIONAL";
}

function openInspectorForClubhouse() {
    const panel = document.getElementById("twinSidebarPanel");
    panel.classList.add("open");

    document.getElementById("inspectorTitle").textContent = "Clubhouse & Aquatic Center";
    document.getElementById("inspectorSubtitle").textContent = "Lifestyle Amenities • Operational";
    document.getElementById("kpiUnits").textContent = "22 Active";
    document.getElementById("kpiMaintenance").textContent = "Sanitized";
    document.getElementById("kpiPower").textContent = "8.4 kW";
    document.getElementById("kpiLifts").textContent = "Access Valid";

    document.getElementById("floorModule").style.display = "none";
    document.getElementById("unitTitle").textContent = "Swimming Pool & Sunbeds";
    document.getElementById("unitOwnerName").textContent = "Water Temp: 26°C • pH 7.2 Balanced";
    document.getElementById("unitStatusBadge").textContent = "OPEN NOW";
}

function openInspectorForGate() {
    const panel = document.getElementById("twinSidebarPanel");
    panel.classList.add("open");

    document.getElementById("inspectorTitle").textContent = "Security Gate 1 Pro";
    document.getElementById("inspectorSubtitle").textContent = "Main Entry Boom Barrier Checkpoint";
    document.getElementById("kpiUnits").textContent = "12 Inbound";
    document.getElementById("kpiMaintenance").textContent = "Armed 24/7";
    document.getElementById("kpiPower").textContent = "1.8 kW";
    document.getElementById("kpiLifts").textContent = "Boom Active";

    document.getElementById("floorModule").style.display = "none";
    document.getElementById("unitTitle").textContent = "Lead Guard on Duty";
    document.getElementById("unitOwnerName").textContent = "Officer Vikram Singh (Gate 1)";
    document.getElementById("unitStatusBadge").textContent = "BARRIER ACTIVE";
}

function openInspectorForParking() {
    const panel = document.getElementById("twinSidebarPanel");
    panel.classList.add("open");

    document.getElementById("inspectorTitle").textContent = "Tower A - Bay B-12 Parking";
    document.getElementById("inspectorSubtitle").textContent = "Official Allocated Resident Vehicle Slot";
    document.getElementById("kpiUnits").textContent = "Bay B-12";
    document.getElementById("kpiMaintenance").textContent = "Occupied";
    document.getElementById("kpiPower").textContent = "RFID Ok";
    document.getElementById("kpiLifts").textContent = "Zero Dispute";

    document.getElementById("floorModule").style.display = "none";
    document.getElementById("unitTitle").textContent = "Car • MH-02-CD-4421";
    document.getElementById("unitOwnerName").textContent = "Aryan Sharma (Flat A-204)";
    document.getElementById("unitStatusBadge").textContent = "FASTPASS ACTIVE";
}

function closeInspectorPanel() {
    document.getElementById("twinSidebarPanel").classList.remove("open");
}

function toggleDroneTour(forceState) {
    isDroneTour = (forceState !== undefined) ? forceState : !isDroneTour;
    const btn = document.getElementById("btnDroneTour");

    if (isDroneTour) {
        btn.classList.add("drone-active");
        btn.querySelector("span:last-child").textContent = "Stop Flyover";
    } else {
        btn.classList.remove("drone-active");
        btn.querySelector("span:last-child").textContent = "Drone Flyover";
    }
}

// -----------------------------------------------------------------------------
// 16. MAIN 60 FPS RENDER LOOP
// -----------------------------------------------------------------------------
let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    const delta = (time - lastTime) * 0.001;
    lastTime = time;

    // 1. Water surface wave displacement (Pool)
    if (poolWaterMesh) {
        const timeSec = time * 0.002;
        const posAttr = poolWaterMesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const u = posAttr.getX(i);
            const v = posAttr.getY(i);
            const z = Math.sin(u * 1.5 + timeSec) * 0.06 + Math.cos(v * 2.0 + timeSec) * 0.04;
            posAttr.setZ(i, z);
        }
        posAttr.needsUpdate = true;
    }

    // 2. Grand Fountain Water Pulse
    if (fountainWaterMesh) {
        fountainWaterMesh.rotation.y += 0.006;
    }

    // 3. Red Aviation Beacon Blinking
    if (beaconLight) {
        beaconLight.intensity = Math.sin(time * 0.006) > 0.3 ? 3.0 : 0.2;
    }

    // 4. Helipad Alternating Lights
    helipadLights.forEach((hl, idx) => {
        hl.intensity = Math.sin(time * 0.004 + idx) > 0 ? 1.5 : 0.2;
    });

    // 5. Autonomous Patrol Vehicle Motion
    updatePatrolVehicle(delta || 0.016);

    // 6. Rain Particle Updates
    updateRain();

    // 7. Cinematic Drone Tour Camera Motion
    if (isDroneTour) {
        droneAngle += 0.004;
        const radius = 72;
        camera.position.x = Math.sin(droneAngle) * radius;
        camera.position.z = Math.cos(droneAngle) * radius;
        camera.position.y = 42 + Math.sin(droneAngle * 2) * 5;
        controls.target.set(0, 10, 0);
    }

    // 8. Smooth Camera LERP Transition
    if (targetCameraPos && targetLookAt) {
        camera.position.lerp(targetCameraPos, 0.05);
        controls.target.lerp(targetLookAt, 0.05);

        if (camera.position.distanceTo(targetCameraPos) < 0.2) {
            targetCameraPos = null;
            targetLookAt = null;
        }
    }

    controls.update();
    updateScreenLabels();
    renderer.render(scene, camera);
}

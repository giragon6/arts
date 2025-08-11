/**
 * 3D Game Renderer using Three.js
 */
class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.dartboard = null;
        this.colorSectors = []; // Store sector meshes for hit detection
        this.darts = [];
        this.lights = [];
        this.animationId = null;
        this.isInitialized = false;
        this.loader = null;
        this.dartModel = null;
        
        // Camera controls
        this.cameraPosition = { x: 0, y: 2, z: 8 };
        this.cameraTarget = { x: 0, y: 0, z: 0 };
        this.mousePosition = { x: 0, y: 0 };
        this.isMouseDown = false;
        
        // Drag-based throwing
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragEnd = { x: 0, y: 0 };
        this.dragVector = null;
        this.aimingLine = null;
        this.canThrow = false;
        
        // Don't initialize immediately - wait for proper sizing
    }

    // Public method to initialize when canvas is ready
    initializeWhenReady() {
        if (this.isInitialized) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const checkCanvasReady = () => {
                if (this.canvas && this.canvas.clientWidth > 0 && this.canvas.clientHeight > 0) {
                    try {
                        this.init();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    console.log('Canvas not ready, retrying... Size:', this.canvas ? `${this.canvas.clientWidth}x${this.canvas.clientHeight}` : 'Canvas is null');
                    setTimeout(checkCanvasReady, 100);
                }
            };
            checkCanvasReady();
        });
    }

    init() {
        try {
            console.log('Initializing GameRenderer...');
            console.log('Canvas:', this.canvas);
            console.log('Canvas dimensions:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
            console.log('THREE.js available:', typeof THREE !== 'undefined');
            
            this.setupRenderer();
            this.setupScene();
            this.setupCamera();
            this.setupLights();
            this.setupDartboard();
            this.loadDartModel(); // Load the dart model asynchronously
            this.setupDragControls(); // Change to drag controls
            this.startRenderLoop();
            
            this.isInitialized = true;
            console.log('GameRenderer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize GameRenderer:', error);
        }
    }

    async loadDartModel() {
        try {
                this.loader = new THREE.GLTFLoader(); // Ensure GLTFLoader is used from global THREE namespace
            console.log('Loading dart.glb model...');
            
            const gltf = await new Promise((resolve, reject) => {
                this.loader.load(
                    './assets/Dart.glb',
                    resolve,
                    (progress) => {
                            if (progress && progress.total) {
                                console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
                            }
                    },
                    reject
                );
            });

            this.dartModel = gltf.scene;
            this.dartModel.scale.set(0.1, 0.1, 0.1); // Scale down the model as needed
            
            // Enable shadows on the dart model
            this.dartModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            console.log('Dart model loaded successfully');
            this.canThrow = true; // Enable throwing once model is loaded
        } catch (error) {
            console.error('Failed to load dart model:', error);
            console.log('Falling back to geometric dart');
            this.canThrow = true; // Still allow throwing with geometric dart
        }
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
        });
        
        console.log('Renderer created, setting size to:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Set transparent background to show CSS gradient behind
        this.renderer.setClearColor(0x000000, 0); // Black with 0 alpha (transparent)
        console.log('Renderer setup complete');
    }

    setupScene() {
        this.scene = new THREE.Scene();
        
        // Add some fog for atmosphere
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
        
    }

    setupCamera() {
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        
        this.updateCameraPosition();
    }

    setupLights() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        
        // Spotlight on dartboard
        const spotlight = new THREE.SpotLight(0xffffff, 0.8, 30, Math.PI / 6);
        spotlight.position.set(0, 8, 10);
        spotlight.target.position.set(0, 0, 0);
        spotlight.castShadow = true;
        this.scene.add(spotlight);
        this.scene.add(spotlight.target);
        this.lights.push(spotlight);
        
        // Point lights for rim lighting
        const pointLight1 = new THREE.PointLight(0x4ecdc4, 0.5, 20);
        pointLight1.position.set(-8, 3, 5);
        this.scene.add(pointLight1);
        this.lights.push(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff6b6b, 0.5, 20);
        pointLight2.position.set(8, 3, 5);
        this.scene.add(pointLight2);
        this.lights.push(pointLight2);
    }

    setupDartboard() {
        this.dartboard = new THREE.Group();
        
        // Create color wheel dartboard
        this.createColorWheel();
        
        // Create dartboard frame
        this.createDartboardFrame();
        
        // Position dartboard
        this.dartboard.position.set(0, 0, 0);
        this.dartboard.rotation.x = 0;
        
        this.scene.add(this.dartboard);
    }

    createColorWheel() {
        const radius = 3;
        const segmentsPerSector = 32;
        const numberOfSectors = 20;
        const sectorAngle = (2 * Math.PI) / numberOfSectors;
        
        // Store sector meshes for hit detection
        this.colorSectors = [];
        
        for (let i = 0; i < numberOfSectors; i++) {
            const thetaStart = i * sectorAngle;
            const geometry = new THREE.CircleGeometry(radius, segmentsPerSector, thetaStart, sectorAngle);
            
            // Generate sector color based on position
            const hue = (i / numberOfSectors) * 360;
            const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.5);
            const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
            
            const sector = new THREE.Mesh(geometry, material);
            
            // Store sector data for hit detection
            sector.userData = {
                sectorIndex: i,
                startAngle: thetaStart,
                endAngle: thetaStart + sectorAngle,
                color: {
                    r: Math.round(color.r * 255),
                    g: Math.round(color.g * 255),
                    b: Math.round(color.b * 255)
                },
                hue: hue,
                saturation: 0.8,
                lightness: 0.5,
                isSector: true
            };
            
            this.colorSectors.push(sector);
            this.dartboard.add(sector);
        }
        
        const wheelRadius = 3;

        const centerGeometry = new THREE.CircleGeometry(wheelRadius * 0.05, 32);
        const centerMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            emissive: 0x222222
        });
        const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        centerMesh.receiveShadow = true;
        centerMesh.userData = { 
            isCenter: true,
            color: { r: 255, g: 255, b: 255 }
        };
        this.dartboard.add(centerMesh);
    }

    createDartboardFrame() {
        // Outer ring frame
        const outerRingGeometry = new THREE.RingGeometry(3, 3.3, 32);
        const frameMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513,
            shininess: 30
        });
        const outerRing = new THREE.Mesh(outerRingGeometry, frameMaterial);
        outerRing.receiveShadow = true;
        this.dartboard.add(outerRing);
        
        // Score markers around the rim
        this.createScoreMarkers();
    }

    createScoreMarkers() {
        const markerRadius = 3.5;
        const markerCount = 12;
        
        for (let i = 0; i < markerCount; i++) {
            const angle = (i / markerCount) * Math.PI * 2;
            const x = Math.cos(angle) * markerRadius;
            const y = Math.sin(angle) * markerRadius;
            
            // Create small cylindrical markers
            const geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8);
            const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const marker = new THREE.Mesh(geometry, material);
            
            marker.position.set(x, y, 0.05);
            marker.rotation.x = Math.PI / 2;
            marker.castShadow = true;
            
            this.dartboard.add(marker);
        }
    }

    createDart(startPosition, targetPosition, color = 0xff0000) {
        let dartGroup;
        
        if (this.dartModel) {
            // Use GLB model if available
            dartGroup = this.dartModel.clone();
            
            // Apply color tint to the dart model
            dartGroup.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Create a new material with the player's color tint
                    const material = child.material.clone();
                    if (material.color) {
                        material.color.setHex(color);
                    }
                    child.material = material;
                }
            });
            
            console.log('Using GLB dart model');
        } else {
            // Fall back to geometric dart
            dartGroup = new THREE.Group();
            
            // Dart tip (cone)
            const tipGeometry = new THREE.ConeGeometry(0.02, 0.3, 8);
            const tipMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
            const tip = new THREE.Mesh(tipGeometry, tipMaterial);
            tip.position.z = 0.15;
            tip.castShadow = true;
            dartGroup.add(tip);
            
            // Dart shaft (cylinder)
            const shaftGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8);
            const shaftMaterial = new THREE.MeshPhongMaterial({ color: color });
            const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.rotation.x = Math.PI / 2;
            shaft.castShadow = true;
            dartGroup.add(shaft);
            
            // Dart fletching (fins)
            for (let i = 0; i < 3; i++) {
                const finGeometry = new THREE.PlaneGeometry(0.1, 0.15);
                const finMaterial = new THREE.MeshLambertMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
                const fin = new THREE.Mesh(finGeometry, finMaterial);
                fin.position.z = -0.3;
                fin.rotation.y = (i / 3) * Math.PI * 2;
                dartGroup.add(fin);
            }
            
            console.log('Using geometric dart fallback');
        }
        
        // Set initial position and rotation
        dartGroup.position.copy(startPosition);
        
        // Calculate rotation to point towards target
        const direction = new THREE.Vector3().subVectors(targetPosition, startPosition).normalize();
        dartGroup.lookAt(targetPosition);
        
        this.scene.add(dartGroup);
        
        return dartGroup;
    }

    animateDartThrow(dart, trajectory, duration = 2000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const startPosition = dart.position.clone();
            const { velocity, gravity } = trajectory;
            
            const animate = () => {
                const elapsed = (Date.now() - startTime) / 1000; // Convert to seconds
                const progress = (Date.now() - startTime) / duration;
                
                if (progress >= 1) {
                    // Animation complete
                    resolve(dart.position.clone());
                    return;
                }
                
                // Calculate position using physics
                const newPosition = {
                    x: startPosition.x + velocity.x * elapsed,
                    y: startPosition.y + velocity.y * elapsed + 0.5 * gravity * elapsed * elapsed,
                    z: startPosition.z + velocity.z * elapsed
                };
                
                dart.position.set(newPosition.x, newPosition.y, newPosition.z);
                
                // Add some rotation for realism
                dart.rotation.x += 0.1;
                dart.rotation.z += 0.05;
                
                requestAnimationFrame(animate);
            };
            
            animate();
        });
    }

    getColorAtPosition(position) {
        // First check if position is within dartboard radius
        const dartboardRadius = 3; // Same as the radius used in createColorWheel
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.y * position.y);
        
        if (distanceFromCenter > dartboardRadius) {
            console.log('Outside dartboard radius - returning null');
            return null;
        }
        
        // Use raycasting to determine which mesh was hit
        const raycaster = new THREE.Raycaster();
        const rayDirection = new THREE.Vector3(0, 0, -1); // Looking down the Z axis
        const rayOrigin = new THREE.Vector3(position.x, position.y, position.z + 1); // Start from above the position
        raycaster.set(rayOrigin, rayDirection);
        
        // Get all intersectable objects in the dartboard
        const intersectable = [];
        this.dartboard.traverse((child) => {
            if (child.isMesh && (child.userData.isSector || child.userData.isCenter)) {
                intersectable.push(child);
            }
        });
        
        const intersects = raycaster.intersectObjects(intersectable);
        
        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const userData = hitMesh.userData;
            
            if (userData.color) {
                return userData.color;
            }
            
            // Fallback for sectors without stored color
            if (userData.isSector) {
                const material = hitMesh.material;
                const color = material.color;
                return {
                    r: Math.round(color.r * 255),
                    g: Math.round(color.g * 255),
                    b: Math.round(color.b * 255)
                };
            }
        }
        
        // No valid hit detected - returning null
        return null;
    }

    getSectorAtPosition(position) {
        // Use raycasting to determine which sector was hit
        const raycaster = new THREE.Raycaster();
        const rayDirection = new THREE.Vector3(0, 0, -1); // Looking down the Z axis
        raycaster.set(position, rayDirection);
        
        // Get all intersectable objects in the dartboard
        const intersectable = [];
        this.dartboard.traverse((child) => {
            if (child.isMesh && (child.userData.isSector || child.userData.isCenter)) {
                intersectable.push(child);
            }
        });
        
        const intersects = raycaster.intersectObjects(intersectable);
        
        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const userData = hitMesh.userData;
            
            return {
                mesh: hitMesh,
                sectorIndex: userData.sectorIndex,
                isCenter: userData.isCenter,
                isSector: userData.isSector,
                color: userData.color,
                hue: userData.hue,
                saturation: userData.saturation,
                lightness: userData.lightness,
                startAngle: userData.startAngle,
                endAngle: userData.endAngle
            };
        }
        
        return null; // No hit
    }

    updateCameraPosition() {
        if (!this.camera) return;
        
        this.camera.position.set(
            this.cameraPosition.x,
            this.cameraPosition.y,
            this.cameraPosition.z
        );
        this.camera.lookAt(
            this.cameraTarget.x,
            this.cameraTarget.y,
            this.cameraTarget.z
        );
    }

    setupDragControls() {
        // Mouse/touch controls for drag-based dart throwing
        this.canvas.addEventListener('mousedown', (e) => this.handleDragStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleDragMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        
        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleDragStart({ clientX: touch.clientX, clientY: touch.clientY });
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleDragMove({ clientX: touch.clientX, clientY: touch.clientY });
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleDragEnd({});
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }

    handleDragStart(e) {
        if (!this.canThrow) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.dragStart.x = (e.clientX - rect.left) / rect.width * 2 - 1;
        this.dragStart.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.isDragging = true;
        this.createAimingLine();
        
        console.log('Drag started at:', this.dragStart);
    }

    handleDragMove(e) {
        if (!this.isDragging) return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.dragEnd.x = (e.clientX - rect.left) / rect.width * 2 - 1;
        this.dragEnd.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.updateAimingLine();
    }

    handleDragEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.removeAimingLine();
        
        // Calculate throw vector and power
        const dragVector = {
            x: this.dragEnd.x - this.dragStart.x,
            y: this.dragEnd.y - this.dragStart.y
        };
        
        const dragLength = Math.sqrt(dragVector.x * dragVector.x + dragVector.y * dragVector.y);
        
        if (dragLength > 0.1) { // Minimum drag threshold
            this.performDragThrow(dragVector, dragLength);
        }
        
        console.log('Drag ended, vector:', dragVector, 'length:', dragLength);
    }

    createAimingLine() {
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.9,
            linewidth: 5, // Make line thicker
            depthTest: false, // Render on top of other objects
            depthWrite: false // Don't write to depth buffer
        });
        
        this.aimingLine = new THREE.Line(geometry, material);
        this.aimingLine.renderOrder = 999; // Render last (on top)
        this.scene.add(this.aimingLine);
    }

    updateAimingLine() {
        if (!this.aimingLine) return;
        
        // Calculate drag vector and power
        const dragVector = {
            x: this.dragEnd.x - this.dragStart.x,
            y: this.dragEnd.y - this.dragStart.y
        };
        const dragLength = Math.sqrt(dragVector.x * dragVector.x + dragVector.y * dragVector.y);
        const power = Math.min(dragLength * 3, 1.0);
        
        // Only show aiming line if drag is sufficient
        if (dragLength < 0.1) {
            this.aimingLine.geometry.setFromPoints([]);
            return;
        }
        
        // Calculate throw direction and create trajectory preview
        const throwAngle = Math.atan2(dragVector.y, -dragVector.x);
        const velocity = 15 * power;
        
        // Create trajectory points for visualization
        const points = [];
        const startWorld = this.screenToWorld(this.dragStart.x, this.dragStart.y);
        
        // Add trajectory points
        for (let t = 0; t <= 1; t += 0.1) {
            const x = startWorld.x + velocity * Math.cos(throwAngle) * t;
            const y = startWorld.y + velocity * Math.sin(throwAngle) * t - 0.5 * 9.81 * t * t;
            const z = Math.max(startWorld.z - velocity * 0.3 * t, 0.1); // Ensure line stays above dartboard (z=0)
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        this.aimingLine.geometry.setFromPoints(points);
        this.aimingLine.geometry.attributes.position.needsUpdate = true;
        
        this.aimingLine.material.color.setHex('#000000');
    }

    removeAimingLine() {
        if (this.aimingLine) {
            this.scene.remove(this.aimingLine);
            this.aimingLine.geometry.dispose();
            this.aimingLine.material.dispose();
            this.aimingLine = null;
        }
    }

    screenToWorld(x, y) {
        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(this.camera);
        
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        const worldPos = this.camera.position.clone().add(dir.multiplyScalar(distance));
        
        return worldPos;
    }

    performDragThrow(dragVector, dragLength) {
        // Calculate throw angle and power from drag
        const throwAngle = Math.atan2(dragVector.y, -dragVector.x); // Invert X for proper direction
        const power = Math.min(dragLength * 2, 1.0); // Scale drag length to power (0-1)
        
        // Minimum power threshold - dart won't reach dartboard if too weak
        const minPower = 0.3;
        if (power < minPower) {
            console.log('Drag too short, dart won\'t reach dartboard. Power:', power, 'Min required:', minPower);
            return;
        }
        
        // Calculate initial velocity based on angle and power
        const baseVelocity = 15; // Base throwing speed
        const velocity = baseVelocity * power;
        
        const throwDirection = {
            x: Math.cos(throwAngle),
            y: Math.sin(throwAngle),
            z: 0
        };
        
        // Create physics-based throw parameters
        const throwParams = {
            angle: throwAngle,
            power: power,
            direction: throwDirection,
            velocity: velocity
        };
        
        // Trigger the dart throw through the game manager
        if (window.gameManager && window.gameManager.canThrow()) {
            console.log('Executing throwDartWithPhysics - Angle:', throwAngle * 180 / Math.PI, 'degrees, Power:', power);
            window.gameManager.throwDartWithPhysics(throwParams);
        } else {
            console.log('Cannot throw dart - not player turn or game not active');
        }
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    startRenderLoop() {
        const render = () => {
            this.animationId = requestAnimationFrame(render);
            
            // Animate dartboard rotation
            // if (this.dartboard) {
            //     this.dartboard.rotation.z += 0.001;
            // }
            
            this.renderer.render(this.scene, this.camera);
        };
        
        render();
    }

    throwDart(targetPosition, power = 0.8, playerId) {
        if (!this.isInitialized) {
            console.warn('GameRenderer not initialized');
            return Promise.resolve(null);
        }
        
        const startPosition = new THREE.Vector3(
            random(-2, 2),
            random(1, 3),
            8
        );
        
        const target = new THREE.Vector3(
            targetPosition.x + random(-0.2, 0.2) * (1 - power),
            targetPosition.y + random(-0.2, 0.2) * (1 - power),
            0
        );
        
        // Calculate trajectory
        const distance = startPosition.distanceTo(target);
        const time = distance / (20 * power); // Adjust speed based on power
        const trajectory = {
            velocity: {
                x: (target.x - startPosition.x) / time,
                y: (target.y - startPosition.y) / time + 0.5 * 9.81 * time,
                z: (target.z - startPosition.z) / time
            },
            gravity: -9.81
        };
        
        // Create dart with player-specific color
        const dartColor = playerId ? this.getPlayerColor(playerId) : 0xff0000;
        const dart = this.createDart(startPosition, target, dartColor);
        this.darts.push(dart);
        
        // Animate dart throw
        return this.animateDartThrow(dart, trajectory, time * 1000)
            .then((finalPosition) => {
                const sectorInfo = this.getSectorAtPosition(finalPosition);
                const color = this.getColorAtPosition(finalPosition);
                
                return {
                    hitPosition: finalPosition,
                    hitColor: color,
                    sectorInfo: sectorInfo,
                    trajectory: trajectory
                };
            });
    }

    throwDartWithPhysics(throwParams, playerId) {
        if (!this.isInitialized) {
            console.warn('GameRenderer not initialized');
            return Promise.resolve(null);
        }
        
        const startPosition = new THREE.Vector3(
            random(-1, 1),     // Small random variation in starting position
            random(1, 2),      // Throwing height
            8                  // Distance from dartboard
        );
        
        // Calculate physics-based trajectory
        const { angle, power, velocity } = throwParams;
        const gravity = -9.81;
        const dartboardZ = 0; // Z position of dartboard
        const distanceToBoard = Math.abs(startPosition.z - dartboardZ);
        
        // Calculate time to reach dartboard using physics
        const velocityZ = -velocity * Math.cos(Math.PI / 6); // Slight downward angle
        const timeToBoard = distanceToBoard / Math.abs(velocityZ);
        
        // Initial velocity components
        const initialVelocity = {
            x: velocity * Math.cos(angle) * power,
            y: velocity * Math.sin(angle) * power,
            z: velocityZ
        };
        
        // Add some accuracy variation based on power (higher power = less accurate)
        const accuracyFactor = 1 - (power * 0.3);
        const trajectory = {
            velocity: {
                x: initialVelocity.x + random(-0.5, 0.5) * (1 - accuracyFactor),
                y: initialVelocity.y + random(-0.5, 0.5) * (1 - accuracyFactor),
                z: initialVelocity.z
            },
            gravity: gravity
        };
        
        // Create dart with player-specific color
        const dartColor = playerId ? this.getPlayerColor(playerId) : 0xff0000;
        
        // Calculate approximate target for dart orientation
        const approximateTarget = new THREE.Vector3(
            startPosition.x + trajectory.velocity.x * timeToBoard,
            startPosition.y + trajectory.velocity.y * timeToBoard + 0.5 * gravity * timeToBoard * timeToBoard,
            dartboardZ
        );
        
        const dart = this.createDart(startPosition, approximateTarget, dartColor);
        this.darts.push(dart);
        
        // Use physics-based animation duration
        const animationDuration = timeToBoard * 1000; // Convert to milliseconds
        
        // Animate dart throw
        return this.animateDartThrow(dart, trajectory, animationDuration)
            .then((finalPosition) => {
                const sectorInfo = this.getSectorAtPosition(finalPosition);
                const color = this.getColorAtPosition(finalPosition);
                
                return {
                    hitPosition: finalPosition,
                    hitColor: color,
                    sectorInfo: sectorInfo,
                    trajectory: trajectory,
                    throwParams: throwParams
                };
            });
    }

    getPlayerColor(playerId) {
        // Generate consistent color based on player ID
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xfeca57];
        const hash = playerId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    }

    clearDarts() {
        this.darts.forEach(dart => {
            this.scene.remove(dart);
        });
        this.darts = [];
    }

    setTargetColor(color) {
        // Update dartboard to highlight target color somehow
        // This could add a glowing ring or other visual indicator
        console.log('Target color set:', color);
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clean up geometries and materials
        this.scene?.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }
}

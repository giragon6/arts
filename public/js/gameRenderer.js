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
        this.darts = [];
        this.lights = [];
        this.animationId = null;
        this.isInitialized = false;
        
        // Camera controls
        this.cameraPosition = { x: 0, y: 2, z: 8 };
        this.cameraTarget = { x: 0, y: 0, z: 0 };
        this.mousePosition = { x: 0, y: 0 };
        this.isMouseDown = false;
        
        this.init();
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
            this.setupControls();
            this.startRenderLoop();
            
            this.isInitialized = true;
            console.log('GameRenderer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize GameRenderer:', error);
        }
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        
        console.log('Renderer created, setting size to:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Set clear color to dark space-like background
        this.renderer.setClearColor(0x0a0a0a, 1);
        console.log('Renderer setup complete');
    }

    setupScene() {
        this.scene = new THREE.Scene();
        
        // Add some fog for atmosphere
        this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 50);
        
        // Add starfield background
        this.createStarfield();
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
        const wheelRadius = 3;
        const segments = 60;
        const rings = 20;
        
        for (let ring = 0; ring < rings; ring++) {
            const innerRadius = (ring / rings) * wheelRadius;
            const outerRadius = ((ring + 1) / rings) * wheelRadius;
            
            for (let segment = 0; segment < segments; segment++) {
                const startAngle = (segment / segments) * Math.PI * 2;
                const endAngle = ((segment + 1) / segments) * Math.PI * 2;
                
                // Create ring segment geometry
                const geometry = new THREE.RingGeometry(
                    innerRadius, 
                    outerRadius, 
                    0, 
                    Math.PI * 2 / segments
                );
                
                // Calculate color based on position
                const hue = (segment / segments) * 360;
                const saturation = Math.min(((ring + 1) / rings), 1) * 100;
                const lightness = 50;
                
                const color = hslToRgb(hue, saturation, lightness);
                const material = new THREE.MeshLambertMaterial({
                    color: new THREE.Color(`rgb(${color.r}, ${color.g}, ${color.b})`),
                    transparent: false
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.rotation.z = startAngle;
                mesh.receiveShadow = true;
                
                // Store color data for hit detection
                mesh.userData = {
                    color: color,
                    ring: ring,
                    segment: segment,
                    hue: hue,
                    saturation: saturation
                };
                
                this.dartboard.add(mesh);
            }
        }
        
        // Add center circle
        const centerGeometry = new THREE.CircleGeometry(wheelRadius * 0.05, 32);
        const centerMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            emissive: 0x222222
        });
        const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
        centerMesh.receiveShadow = true;
        centerMesh.userData = { isCenter: true };
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

    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 1000;
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;     // x
            positions[i + 1] = (Math.random() - 0.5) * 200; // y  
            positions[i + 2] = (Math.random() - 0.5) * 200; // z
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            transparent: true,
            opacity: 0.8
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    createDart(startPosition, targetPosition, color = 0xff0000) {
        const dartGroup = new THREE.Group();
        
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
        // Convert 3D position to dartboard coordinates
        const x = position.x;
        const y = position.y;
        
        // Calculate distance from center
        const distance = Math.sqrt(x * x + y * y);
        const wheelRadius = 3;
        
        if (distance > wheelRadius) {
            // Outside dartboard
            return null;
        }
        
        if (distance < wheelRadius * 0.05) {
            // Center white
            return { r: 255, g: 255, b: 255 };
        }
        
        // Calculate angle and normalize to 0-360
        const angle = Math.atan2(y, x);
        const hue = ((angle * 180 / Math.PI) + 360) % 360;
        
        // Calculate saturation based on distance from center
        const saturation = Math.min(distance / wheelRadius, 1) * 100;
        const lightness = 50;
        
        return hslToRgb(hue, saturation, lightness);
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

    setupControls() {
        // Mouse controls for camera
        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown) return;
            
            const deltaX = e.clientX - this.mousePosition.x;
            const deltaY = e.clientY - this.mousePosition.y;
            
            // Rotate camera around dartboard
            const sensitivity = 0.01;
            this.cameraPosition.x += deltaX * sensitivity;
            this.cameraPosition.y -= deltaY * sensitivity;
            
            // Keep camera at fixed distance
            const distance = 8;
            const length = Math.sqrt(
                this.cameraPosition.x * this.cameraPosition.x + 
                this.cameraPosition.y * this.cameraPosition.y + 
                this.cameraPosition.z * this.cameraPosition.z
            );
            
            const scale = distance / length;
            this.cameraPosition.x *= scale;
            this.cameraPosition.y *= scale;
            this.cameraPosition.z *= scale;
            
            this.updateCameraPosition();
            
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
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
            if (this.dartboard) {
                this.dartboard.rotation.z += 0.001;
            }
            
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
                const color = this.getColorAtPosition(finalPosition);
                return {
                    hitPosition: finalPosition,
                    hitColor: color,
                    trajectory: trajectory
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

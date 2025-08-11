import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// actual code
const radius = 3;
const segmentsPerSector = 32;
const numberOfSectors = 20;
const sectorAngle = (2 * Math.PI) / numberOfSectors;
for (let i = 0; i < numberOfSectors; i++) {
    const thetaStart = i * sectorAngle;
    const geometry = new THREE.CircleGeometry(radius, segmentsPerSector, thetaStart, sectorAngle);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()), side: THREE.DoubleSide });
    const sector = new THREE.Mesh(geometry, material);
    scene.add(sector);
}
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
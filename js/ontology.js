// Fullscreen Three.js Scene - Network Visualization
let fullscreenScene, fullscreenCamera, fullscreenRenderer, fullscreenControls;
let spheres = [];
let connections = [];
let fullscreenContainer;
let animationId;

function initFullscreen() {
    // Create fullscreen container
    fullscreenContainer = document.createElement('div');
    fullscreenContainer.className = 'fullscreen-canvas';
    fullscreenContainer.style.display = 'none';
    document.body.appendChild(fullscreenContainer);

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'fullscreen-threejs-canvas';
    fullscreenContainer.appendChild(canvas);

    // Create back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.innerHTML = '<span class="back-arrow">←</span><span class="back-text">BACK TO MAIN</span>';
    backButton.onclick = function() {
        window.location.href = 'index.html';
    };
    fullscreenContainer.appendChild(backButton);

    // Scene
    fullscreenScene = new THREE.Scene();
    fullscreenScene.background = new THREE.Color(0xd0d0d0); // Light grey background
    
    // Camera
    fullscreenCamera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1,
        1000
    );
    fullscreenCamera.position.set(5, 5, 5);
    
    // Renderer - Optimized settings
    fullscreenRenderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: false, // Disable for better performance
        powerPreference: "high-performance"
    });
    fullscreenRenderer.setSize(window.innerWidth, window.innerHeight);
    fullscreenRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    fullscreenRenderer.shadowMap.enabled = true;
    fullscreenRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Orbit Controls
    fullscreenControls = new THREE.OrbitControls(fullscreenCamera, fullscreenRenderer.domElement);
    fullscreenControls.enableDamping = true;
    fullscreenControls.dampingFactor = 0.1;
    fullscreenControls.enableZoom = true;
    fullscreenControls.enablePan = true;
    
    // Create network of spheres
    createNetworkSpheres();
    
    // Add basic lighting
    addBasicLighting();
    
    // Start animation loop
    animateFullscreen();
    
    // Handle window resize
    window.addEventListener('resize', onFullscreenWindowResize);
}

function createNetworkSpheres() {
    // Ontology terms for the spheres
    const ontologyTerms = [
        'Check weather',
        'Target species',
        'Target location',
        'Get fishing license',
        'Verify local regulations',
        'Pack',
        'Prepare bait',
        'Inspect line/leader',
        'Sharpen hooks',
        'Download offline maps',
        'Load waypoints',
        'Check PFDs and safety kit',
        'Confirm boat/kayak condition and fuel/air',
        'Pack cooler, ice, and fish bag',
        'Carry measuring items',
        'Set departure time',
        'Tell someone your plan and ETA'
    ];
    
    const numSpheres = 80;
    const sphereRadius = 0.3;
    const connectionDistance = 5;
    
    // Create spheres
    for (let i = 0; i < numSpheres; i++) {
        // Random position in 3D space
        const x = (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 15;
        const z = (Math.random() - 0.5) * 20;
        
        // Create sphere geometry and dark grey material
        const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x404040 // Dark grey
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(x, y, z);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        
        // Store sphere data
        const sphereData = {
            mesh: sphere,
            position: { x, y, z },
            label: ontologyTerms[i % ontologyTerms.length]
        };
        
        spheres.push(sphereData);
        fullscreenScene.add(sphere);
        
        // Create text label
        createTextLabel(sphereData);
    }
    
    // Create connections between nearby spheres
    createConnections(connectionDistance);
}

function createTextLabel(sphereData) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Set font and text properties
    context.font = '14px "Helvetica Neue", Helvetica, Arial, sans-serif';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Draw text
    context.fillText(sphereData.label, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create sprite material
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.1
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1.8, 0.4, 1);
    sprite.position.copy(sphereData.mesh.position);
    sprite.position.y += 0.8; // Position above sphere
    
    fullscreenScene.add(sprite);
}

function createConnections(maxDistance) {
    // Track connections for each sphere
    const sphereConnections = new Array(spheres.length).fill(0).map(() => []);
    const minConnections = 3;
    
    // First pass: Create connections based on distance
    for (let i = 0; i < spheres.length; i++) {
        for (let j = i + 1; j < spheres.length; j++) {
            const sphere1 = spheres[i];
            const sphere2 = spheres[j];
            
            // Calculate distance between spheres
            const distance = Math.sqrt(
                Math.pow(sphere1.position.x - sphere2.position.x, 2) +
                Math.pow(sphere1.position.y - sphere2.position.y, 2) +
                Math.pow(sphere1.position.z - sphere2.position.z, 2)
            );
            
            // Create connection if spheres are close enough
            if (distance < maxDistance) {
                createConnection(i, j);
                sphereConnections[i].push(j);
                sphereConnections[j].push(i);
            }
        }
    }
    
    // Second pass: Ensure each sphere has at least minConnections
    for (let i = 0; i < spheres.length; i++) {
        while (sphereConnections[i].length < minConnections) {
            // Find the closest unconnected sphere
            let closestSphere = -1;
            let closestDistance = Infinity;
            
            for (let j = 0; j < spheres.length; j++) {
                if (i !== j && !sphereConnections[i].includes(j)) {
                    const distance = Math.sqrt(
                        Math.pow(spheres[i].position.x - spheres[j].position.x, 2) +
                        Math.pow(spheres[i].position.y - spheres[j].position.y, 2) +
                        Math.pow(spheres[i].position.z - spheres[j].position.z, 2)
                    );
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestSphere = j;
                    }
                }
            }
            
            // Create connection to closest sphere
            if (closestSphere !== -1) {
                createConnection(i, closestSphere);
                sphereConnections[i].push(closestSphere);
                sphereConnections[closestSphere].push(i);
            } else {
                break; // No more spheres to connect to
            }
        }
    }
    
    function createConnection(i, j) {
        const sphere1 = spheres[i];
        const sphere2 = spheres[j];
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            sphere1.position.x, sphere1.position.y, sphere1.position.z,
            sphere2.position.x, sphere2.position.y, sphere2.position.z
        ]);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({ 
            color: 0x000000 // Black lines
        });
        
        const line = new THREE.Line(geometry, material);
        connections.push(line);
        fullscreenScene.add(line);
    }
}

function addBasicLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    fullscreenScene.add(ambientLight);
    
    // Simple directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    fullscreenScene.add(directionalLight);
}

function animateFullscreen() {
    animationId = requestAnimationFrame(animateFullscreen);
    
    // Update controls
    fullscreenControls.update();
    
    // Render
    fullscreenRenderer.render(fullscreenScene, fullscreenCamera);
}

function onFullscreenWindowResize() {
    fullscreenCamera.aspect = window.innerWidth / window.innerHeight;
    fullscreenCamera.updateProjectionMatrix();
    fullscreenRenderer.setSize(window.innerWidth, window.innerHeight);
}

function enterFullscreen() {
    if (!fullscreenContainer) {
        initFullscreen();
    }
    
    fullscreenContainer.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Focus the canvas for keyboard controls
    const canvas = document.getElementById('fullscreen-threejs-canvas');
    canvas.focus();
}

function exitFullscreen() {
    if (fullscreenContainer) {
        fullscreenContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Stop animation loop to save resources
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
}

function disposeFullscreenResources() {
    // Clean up Three.js resources
    if (fullscreenScene) {
        fullscreenScene.clear();
    }
    
    if (fullscreenRenderer) {
        fullscreenRenderer.dispose();
    }
    
    if (fullscreenControls) {
        fullscreenControls.dispose();
    }
    
    // Remove event listeners
    window.removeEventListener('resize', onFullscreenWindowResize);
}

// Initialize fullscreen functionality when the page loads
window.addEventListener('load', function() {
    // Add event listener to the fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', enterFullscreen);
    }
    
    // Add keyboard support for exiting fullscreen
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && fullscreenContainer && fullscreenContainer.style.display === 'block') {
            exitFullscreen();
        }
    });
});

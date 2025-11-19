// Fullscreen Three.js Scene - Network Visualization
let fullscreenScene, fullscreenCamera, fullscreenRenderer, fullscreenControls;
let spheres = [];
let connections = [];
let fullscreenContainer;
let animationId;
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let dragAccum = 0; // accumulates drag distance to drive subtle color shifts

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

    // Removed back button for embedded use

    // Scene
    fullscreenScene = new THREE.Scene();
    fullscreenScene.background = new THREE.Color(0xffffff); // White background
    
    // Camera
    fullscreenCamera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1,
        1000
    );
    fullscreenCamera.position.set(5, 5, 5);
    fullscreenCamera.lookAt(0, 0, 0);
    
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
    fullscreenRenderer.setClearColor(0xffffff, 1);
    // Enhance lighting and color response if supported
    if (THREE && THREE.ACESFilmicToneMapping) {
        fullscreenRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        fullscreenRenderer.toneMappingExposure = 0.9;
    }
    if (THREE && (THREE.sRGBEncoding || THREE.LinearSRGBColorSpace)) {
        // Support both pre-r152 and newer color space APIs
        if (THREE.sRGBEncoding) fullscreenRenderer.outputEncoding = THREE.sRGBEncoding;
        if (THREE.LinearSRGBColorSpace) fullscreenRenderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    }
    
    // Orbit Controls (support both THREE.OrbitControls and window.OrbitControls)
    const OrbitControlsCtor = (typeof THREE !== 'undefined' && THREE.OrbitControls)
      || (typeof window !== 'undefined' && window.OrbitControls);
    if (typeof OrbitControlsCtor === 'function') {
        fullscreenControls = new OrbitControlsCtor(fullscreenCamera, fullscreenRenderer.domElement);
        // Safe-guard property access if controls constructed
        if (fullscreenControls) {
            fullscreenControls.enableDamping = true;
            fullscreenControls.dampingFactor = 0.1;
            fullscreenControls.enableZoom = true;
            fullscreenControls.enablePan = true;
        }
    } else {
        console.error('OrbitControls is not available.');
    }
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

    // Pointer drag listeners to drive dynamic color shift
    const el = fullscreenRenderer.domElement;
    el.addEventListener('pointerdown', (e) => {
        isDragging = true;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
    });
    el.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        dragAccum += Math.sqrt(dx * dx + dy * dy);
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
    });
    const stopDrag = () => { isDragging = false; };
    el.addEventListener('pointerup', stopDrag);
    el.addEventListener('pointerleave', stopDrag);
}

function createNetworkSpheres() {
    // Ontology terms for the spheres
    const ontologyTerms = [
        "Object", "Entity", "Concept", "Idea", "Form", "Structure",
        "Pattern", "System", "Process", "Function", "Purpose", "Meaning",
        "Relation", "Connection", "Network", "Graph", "Node", "Edge",
        "Space", "Time", "Dimension", "Scale", "Level", "Hierarchy",
        "Category", "Class", "Type", "Kind", "Instance", "Example",
        "Property", "Attribute", "Feature", "Characteristic", "Quality",
        "Value", "Measure", "Quantity", "Amount", "Degree", "Extent",
        "Boundary", "Limit", "Constraint", "Rule", "Principle", "Law",
        "Method", "Technique", "Approach", "Strategy", "Solution", "Answer",
        "Question", "Problem", "Challenge", "Issue", "Concern", "Matter",
        "Context", "Environment", "Setting", "Situation", "Condition", "State",
        "Change", "Transformation", "Evolution", "Development", "Growth", "Progress",
        "Interaction", "Communication", "Exchange", "Transfer", "Flow", "Movement",
        "Energy", "Force", "Power", "Strength", "Intensity", "Magnitude",
        "Frequency", "Rate", "Speed", "Velocity", "Acceleration", "Momentum"
    ];

	// Two concentric rings: inner (4) and outer (6), evenly spaced on XZ plane
	const innerCount = 4;
	const outerCount = 6;
	const innerRadius = 3.5;
	const outerRadius = 6.5;
	const innerY = 0.0;   // lower ring height
	const outerY = 2.0;   // higher ring height
	const sphereRadius = 0.6;
	const connectionDistance = 4;

	const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16);
	// Blue sphere with reduced saturation
	const innerMaterialColor = new THREE.Color();
	innerMaterialColor.setHSL(0.67, 0.3, 0.45); // Blue hue, low saturation, medium lightness
	const innerMaterial = new THREE.MeshStandardMaterial({ color: innerMaterialColor });
	const outerMaterial = new THREE.MeshStandardMaterial({ color: 0xededed }); // Group 2 light grey
	// Green sphere with reduced saturation
	const outerHighlightMaterialColor = new THREE.Color();
	outerHighlightMaterialColor.setHSL(0.19, 0.3, 0.7); // Green hue, low saturation, light
	const outerHighlightMaterial = new THREE.MeshStandardMaterial({ color: outerHighlightMaterialColor });

    function addSphere(x, y, z, labelIndex, material, labelOverride) {
        const sphere = new THREE.Mesh(sphereGeometry, (material || outerMaterial).clone());
		sphere.position.set(x, y, z);
		sphere.castShadow = true;
		sphere.receiveShadow = true;
        // Store base color in HSL for dynamic adjustments
        const base = sphere.material.color.clone();
        const hsl = { h: 0, s: 0, l: 0 };
        base.getHSL(hsl);
        sphere.userData.baseHSL = { h: hsl.h, s: hsl.s, l: hsl.l };
		const sphereData = {
			mesh: sphere,
			position: { x, y, z },
			label: labelOverride || ontologyTerms[labelIndex % ontologyTerms.length]
		};
		spheres.push(sphereData);
		fullscreenScene.add(sphere);
		createTextLabel(sphereData);
	}

	// Place on a 180° arc (half circle) to avoid hexagon outline
	const start = -Math.PI / 2;   // left edge of dome
	const end   =  Math.PI / 2;   // right edge of dome
	// Global rotation offset for the layout (degrees)
	const angleOffsetDeg = 180; // change this value to rotate the arc
	const angleOffset = angleOffsetDeg * Math.PI / 180;

	// Inner ring (4 evenly spaced on the arc)
	const innerLabels = [
		'Skunked Emotion',
		'AI Decision',
		'Social Sharing',
		'Trip Review'
	];
	for (let i = 0; i < innerCount; i++) {
		const denom = Math.max(1, innerCount - 1);
		const t = i / denom;
		const angle = start + t * (end - start) + angleOffset;
		const x = Math.cos(angle) * innerRadius;
		const z = Math.sin(angle) * innerRadius;
		addSphere(x, innerY, z, i, innerMaterial, innerLabels[i] || undefined);
	}

	// Outer ring (6 evenly spaced on the same arc, offset slightly)
	const outerLabels = [
		'Tutorial/ Platform',
		'Weather/Water API',
		'IOT/Fish Finder',
		'Rank',
		'Communities/ Challenge Group',
		'Gear Store'
	];
	for (let i = 0; i < outerCount; i++) {
		const denom = Math.max(1, outerCount - 1);
		const t = i / denom;
		const angle = start + t * (end - start) + angleOffset;
		const x = Math.cos(angle) * outerRadius;
		const z = Math.sin(angle) * outerRadius;
		// Elevate specific outer nodes (from left to right: indices 0,1,4)
		const y = (i === 0 || i === 1 || i === 4) ? outerY + 1.0 : outerY;
		const mat = (i === 0 || i === 1 || i === 4) ? outerHighlightMaterial : outerMaterial;
		addSphere(x, y, z, innerCount + i, mat, outerLabels[i] || undefined);
	}

	// Use current proximity logic to draw nearby connections
	createConnections(connectionDistance);
}

function createTextLabel(sphereData) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Set font and text properties
    context.font = '16px "Helvetica Neue", Helvetica, Arial, sans-serif';
    context.fillStyle = '#000000'; // Deep black text
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
            color: 0x2a2a2a // Darker grey lines
        });
        
        const line = new THREE.Line(geometry, material);
        connections.push(line);
        fullscreenScene.add(line);
    }
}

function addBasicLighting() {
    // Balanced three-point style lighting for clarity and depth
    const ambient = new THREE.AmbientLight(0x404040, 0.35);
    fullscreenScene.add(ambient);

    // Key light (cool tint)
    const key = new THREE.DirectionalLight(0xa8e3ff, 0.9);
    key.position.set(8, 12, 8);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 16;
    key.shadow.camera.bottom = -16;
    fullscreenScene.add(key);

    // Fill light (warmer, low intensity to lift shadows)
    const fill = new THREE.DirectionalLight(0xc2ffff, 0.35);
    fill.position.set(-10, 6, -6);
    fullscreenScene.add(fill);

    // Rim light to separate objects from background
    const rim = new THREE.PointLight(0xffffff, 0.35, 100);
    rim.position.set(0, 10, -10);
    fullscreenScene.add(rim);

    // Soft sky/ground tint
    // const hemi = new THREE.HemisphereLight(0x1c2a3a, 0x000000, 0.2);
    // fullscreenScene.add(hemi);
}

function animateFullscreen() {
    animationId = requestAnimationFrame(animateFullscreen);
    
    // Update controls if available
    if (fullscreenControls && typeof fullscreenControls.update === 'function') {
        fullscreenControls.update();
    }
    
    // Render
    // Dynamic color shift while dragging: keep hue constant, vary saturation & lightness +0..+0.5
    if (spheres.length > 0) {
        const t = (dragAccum || 0) * 0.02; // drag-driven parameter
        const amplitudeS = 0.8; // +80% saturation max increase
        const amplitudeL = 0.5; // +50% lightness max increase
        for (let i = 0; i < spheres.length; i++) {
            const { mesh } = spheres[i];
            if (!mesh || !mesh.material || !mesh.userData || !mesh.userData.baseHSL) continue;
            const base = mesh.userData.baseHSL;
            const phase = i * 0.15;
            // Compute positive-only increase relative to starting value so initial delta is 0
            const raw = (Math.sin(t + phase) + 1) * 0.5;      // [0,1]
            const baseline = (Math.sin(phase) + 1) * 0.5;     // [0,1] at t=0
            let deltaPos = (raw - baseline); // can be negative
            if (deltaPos < 0) deltaPos = 0;  // only positive shift
            const s = Math.min(1, Math.max(0, base.s + deltaPos * amplitudeS));
            const l = Math.min(1, Math.max(0, base.l + deltaPos * amplitudeL));
            mesh.material.color.setHSL(base.h, s, l);
        }
    }
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

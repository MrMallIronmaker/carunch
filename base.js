// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];

let scene, camera, renderer;

// Create an empty scene

const fov = 45;
const videoScreenDistance = 900.0;
const screenWidth = 1280;
const screenHeight = 720;
const aspect = screenWidth/screenHeight;
const cylinderPos = new THREE.Vector3(-0.12, -0.08, -0.3);

function screenSpaceToWorldSpace(px, py, distance) {
    const factor = distance * Math.tan(Math.PI * fov / 2 / 180);
    return new THREE.Vector3(
        (1 - 2 * px) * aspect * factor,
        (1 - 2 * py) * factor,
        -distance,
    )
}

const cube = new THREE.Mesh(
    new THREE.BoxGeometry( 0.02, 0.02, 0.02),
    new THREE.MeshStandardMaterial( { color: "#433F81", roughness: 0.4} )
);

function buildLights(scene) {
    var light = new THREE.SpotLight("#fff", 0.8);
    light.position.y = 100;

    light.angle = 1.05;

    light.decacy = 2;
    light.penumbra = 1;

    light.shadow.camera.near = 10;
    light.shadow.camera.far = 1000;
    light.shadow.camera.fov = 30;

    scene.add(light);
    return light;
}

function buildVideoTexture(scene) {
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    const videoMaterial =  new THREE.MeshBasicMaterial( {map: videoTexture, side: THREE.BackSide, toneMapped: false} );
    const screen = new THREE.PlaneGeometry(
        2 * aspect * videoScreenDistance * Math.tan(Math.PI * fov / 2 / 180),
        2 * videoScreenDistance * Math.tan(Math.PI * fov / 2 / 180),
        1);
    const videoScreen = new THREE.Mesh(screen, videoMaterial);
    videoScreen.position.z = -videoScreenDistance;
    videoScreen.rotation.y = Math.PI;
    scene.add(videoScreen);

}

function buildChipBag(scene) {
    const geometry = new THREE.CylinderGeometry( 0.025, 0.025, 0.05, 16);
    const material = new THREE.MeshStandardMaterial( {color: 0xffff00, roughness: 0.2} );
    const cylinder = new THREE.Mesh( geometry, material );
    cylinder.position.copy(cylinderPos);
    cylinder.rotation.x = Math.PI / 3;
    cylinder.rotation.y = Math.PI / 8;
    cylinder.rotation.z = -Math.PI / 2;
    scene.add( cylinder );
}


function initRenderer() {

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( fov, aspect, 0.1, 1000 );
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setClearColor("#000000");
    renderer.setSize( videoElement.videoWidth, videoElement.videoHeight );
    document.getElementById("rendererTarget").append(renderer.domElement);

    buildChipBag(scene);
    buildVideoTexture(scene);
    buildLights(scene);

    cube.position.z = -0.3;
    scene.add(cube);

    const render = function () {
        requestAnimationFrame( render );
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    };

    render();
}

videoElement.addEventListener('loadedmetadata', (event) => {
    initRenderer();
})

// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

let isSoundPlayable = true;
let wasPreviousMouthOpen = false;

function onResults(results) {
    // Hide the spinner.
    document.body.classList.add('loaded');

    // get lip points
    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {

            // Is the mouth open?
            let isMouthOpen = (Math.pow(landmarks[13].x - landmarks[14].x, 2) +
                Math.pow(landmarks[13].y - landmarks[14].y, 2)) * 5 >
                Math.pow(landmarks[291].x - landmarks[62].x, 2) +
                Math.pow(landmarks[291].y - landmarks[62].y, 2);

            if (isMouthOpen) {
                // canvasCtx.fillStyle = "#30ff30";
                let target = screenSpaceToWorldSpace(
                    (landmarks[13].x + landmarks[14].x)/2,
                    (landmarks[13].y + landmarks[14].y)/2,
                    0.3
                );
                const alpha = 0.3;
                //console.log(target, cube.position);
                cube.position.addVectors(cube.position.multiplyScalar(1 - alpha), target.multiplyScalar(alpha));

            } else {
                //canvasCtx.fillStyle = "#ff3030";
                if (isSoundPlayable && wasPreviousMouthOpen) {
                    isSoundPlayable = false;
                    new Audio("crunch_sound.ogg").play();
                    cube.position.copy(cylinderPos);
                    setTimeout(
                        function() {isSoundPlayable = true;},
                        300
                    )
                }
            }
            wasPreviousMouthOpen = isMouthOpen;
        }
    }
}

const faceMesh = new FaceMesh({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
    }});
faceMesh.onResults(onResults);

// Instantiate a camera. We'll feed each frame we receive into the solution.
const mediapipeCamera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({image: videoElement});
    },
    width: 1280,
    height: 720
});
mediapipeCamera.start();

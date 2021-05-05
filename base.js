// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];

let scene, camera, renderer, plate, edible, edibles, crunches;

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

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function buildSpriteFromImgURL(url) {
    return new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load(url)
    }));
}

// this one returns an array of makhanas
function buildMakhanas() {
    const makhana1 = buildSpriteFromImgURL("makhana/makhana1.png");
    makhana1.scale.copy(new THREE.Vector3(.05, .05, 1));
    makhana1.position.copy(new THREE.Vector3(-0.06, -0.039, -0.14));

    const makhana2 = buildSpriteFromImgURL("makhana/makhana2.png");
    makhana2.scale.copy(new THREE.Vector3(.05, .05, 1));
    makhana2.position.copy(new THREE.Vector3(-0.05, -0.038, -0.141));

    const makhana3 = buildSpriteFromImgURL("makhana/makhana3.png");
    makhana3.scale.copy(new THREE.Vector3(.05, .05, 1));
    makhana3.position.copy(new THREE.Vector3(-0.04, -0.040, -0.139));

    const makhana4 = buildSpriteFromImgURL("makhana/makhana4.png");
    makhana4.scale.copy(new THREE.Vector3(.05, .05, 1));
    makhana4.position.copy(new THREE.Vector3(-0.07, -0.041, -0.142));
    return [makhana1, makhana2, makhana3, makhana4];
}

function buildPlate(scene) {
    // make actual plate
    plate = buildSpriteFromImgURL("plate.png");
    plate.scale.copy(new THREE.Vector3(1.9/15, .792/15, 1));
    plate.position.copy(new THREE.Vector3(-0.12, -0.08, -0.3));
    scene.add(plate);

    edibles = buildMakhanas();
    edibles.forEach((ed) => {scene.add(ed);});

    // TODO: upon eating, clone new one to edible.

    edible = edibles[getRandomInt(edibles.length)].clone();
    scene.add(edible);
}

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


function initRenderer() {

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( fov, aspect, 0.1, 1000 );
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setClearColor("#000000");
    renderer.setSize( videoElement.videoWidth, videoElement.videoHeight );
    document.getElementById("rendererTarget").append(renderer.domElement);

    // buildChipBag(scene);
    buildVideoTexture(scene);
    buildLights(scene);
    buildPlate(scene);

    const render = function () {
        requestAnimationFrame( render );
        renderer.render(scene, camera);
    };

    render();
}

crunches = [
    new Audio("makhana/makhana1.ogg"),
    new Audio("makhana/makhana2.ogg"),
    new Audio("makhana/makhana3.ogg")
]

videoElement.addEventListener('loadedmetadata', (event) => {
    initRenderer();
})

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
                    0.2
                );
                const alpha = 0.3;
                //console.log(target, cube.position);
                edible.position.addVectors(edible.position.multiplyScalar(1 - alpha), target.multiplyScalar(alpha));

            } else {
                //canvasCtx.fillStyle = "#ff3030";
                if (isSoundPlayable && wasPreviousMouthOpen) {
                    isSoundPlayable = false;
                    crunches[getRandomInt(crunches.length)].play();
                    edible.copy(edibles[getRandomInt(edibles.length)].clone());
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

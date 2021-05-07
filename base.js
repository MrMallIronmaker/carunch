// Firebase initializtion
const firebaseConfig = {
    apiKey: "AIzaSyAsO3mp8p4V23gDIBcAS913k3bh-qreU7Q",
    authDomain: "carunch-fs.firebaseapp.com",
    projectId: "carunch-fs",
    storageBucket: "carunch-fs.appspot.com",
    messagingSenderId: "110033830309",
    appId: "1:110033830309:web:da0d8373616a000bbf284c"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create a root reference
const storageRef = firebase.storage().ref();

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const qualtrics_id = "merriwether";
const session_ref = uuidv4();
let entry = -1;

function make_ref() {
    entry += 1;
    return 'uploaded/' + qualtrics_id + '--' + session_ref + '--' + entry + '.webm'
}

let guidref = storageRef.child(make_ref());

// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];

let scene, camera, renderer, plate, edible, edibles, crunches;
let mediaRecorder, recordedBlobs, sourceBuffer;
let stream;

// Create an empty scene

const fov = 45;
const videoScreenDistance = 900.0;
const screenWidth = 1280;
const screenHeight = 720;
const aspect = screenWidth/screenHeight;
let isFoodAvailable = false;

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

const next_button = document.getElementById("next_button");
const instructions_text = document.getElementById("instructions_text");
const instructions_box = document.getElementById("instructions_box");

function forwardButton() {
    next_button.step = next_button.step + 1;
    switch(next_button.step) {
        case 1:
            instructions_text.textContent = "First, ensure your sound is on.";
            break;
        case 2:
            instructions_text.textContent = "Next, open and close your mouth." +
                "If you have trouble, make sure your face is well-lit and within view of the camera. " +
                "If you still have trouble, alert the course staff.";
            next_button.disabled = true;
            break;
        case 3:
            instructions_text.textContent = "Finally, be aware that the video will be recorded " +
                "as you interact with the virtual content.";
            break;
        default:
            instructions_box.hidden = true;
            buildPlate(scene);
            startRecording();

    }
}

next_button.step = 0;
next_button.onclick = forwardButton;

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
    isFoodAvailable = true;
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

    buildVideoTexture(scene);

    const render = function () {
        requestAnimationFrame( render );
        renderer.render(scene, camera);
    };

    render();
}

crunches = [
    new Audio("makhana/makhana_longer_-01.ogg"),
    new Audio("makhana/makhana_longer_-02.ogg"),
    new Audio("makhana/makhana_longer_-03.ogg"),
    new Audio("makhana/makhana_longer_-04.ogg"),
    new Audio("makhana/makhana_longer_-05.ogg"),
    new Audio("makhana/makhana_longer_-06.ogg")
]

videoElement.addEventListener('loadedmetadata', (event) => {
    initRenderer();
    stream = renderer.domElement.captureStream(); // frames per second
    console.log('Started stream capture from canvas element: ', stream);
})

let isSoundPlayable = true;
let wasPreviousMouthOpen = false;

function onResults(results) {

    // get lip points
    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {

            // Is the mouth open?
            let isMouthOpen = (Math.pow(landmarks[13].x - landmarks[14].x, 2) +
                Math.pow(landmarks[13].y - landmarks[14].y, 2)) * 5 >
                Math.pow(landmarks[291].x - landmarks[62].x, 2) +
                Math.pow(landmarks[291].y - landmarks[62].y, 2);

            if (isMouthOpen) {
                if (isFoodAvailable) {
                    // canvasCtx.fillStyle = "#30ff30";
                    let target = screenSpaceToWorldSpace(
                        (landmarks[13].x + landmarks[14].x)/2,
                        (landmarks[13].y + landmarks[14].y)/2,
                        0.2
                    );
                    const alpha = 0.3;
                    //console.log(target, cube.position);
                    edible.position.addVectors(edible.position.multiplyScalar(1 - alpha), target.multiplyScalar(alpha));
                }

            } else {
                //canvasCtx.fillStyle = "#ff3030";
                if (isSoundPlayable && wasPreviousMouthOpen) {
                    next_button.disabled = false;
                    isSoundPlayable = false;
                    if (isFoodAvailable) {
                        crunches[getRandomInt(crunches.length)].play();
                        edible.copy(edibles[getRandomInt(edibles.length)].clone());
                    }
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

const mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);

function handleSourceOpen(event) {
    console.log('MediaSource opened');
    sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
    console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

function handleStop(event) {
    console.log('Recorder stopped: ', event);
    const superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
    // video.src = window.URL.createObjectURL(superBuffer);
}

// The nested try blocks will be simplified when Chrome 47 moves to Stable
function startRecording() {
    let options = {mimeType: 'video/webm'};
    recordedBlobs = [];
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e0) {
        console.log('Unable to create MediaRecorder with options Object: ', e0);
        try {
            options = {mimeType: 'video/webm,codecs=vp9'};
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e1) {
            console.log('Unable to create MediaRecorder with options Object: ', e1);
            try {
                options = 'video/vp8'; // Chrome 47
                mediaRecorder = new MediaRecorder(stream, options);
            } catch (e2) {
                alert('MediaRecorder is not supported by this browser.\n\n' +
                    'Try Firefox 29 or later, or Chrome 47 or later, ' +
                    'with Enable experimental Web Platform features enabled from chrome://flags.');
                console.error('Exception while creating MediaRecorder:', e2);
                return;
            }
        }
    }
    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(100); // collect 100ms of data
    console.log('MediaRecorder started', mediaRecorder);
    setTimeout(
        function() {stopRecording();},
        10000 // 10s
    )
}

function stopRecording() {
    mediaRecorder.stop();
    console.log('Recorded Blobs: ', recordedBlobs);
    upload();
    // video.controls = true;
    startRecording();
}

function upload() {
    const file = new Blob(recordedBlobs, {type: 'video/webm'});
    const uploadTask = guidref.put(file)

    // Register three observers:
    // 1. 'state_changed' observer, called any time the state changes
    // 2. Error observer, called on failure
    // 3. Completion observer, called on successful completion
    uploadTask.on('state_changed',
        (snapshot) => {
            // Observe state change events such as progress, pause, and resume
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            switch (snapshot.state) {
                case firebase.storage.TaskState.PAUSED: // or 'paused'
                    console.log('Upload is paused');
                    break;
                case firebase.storage.TaskState.RUNNING: // or 'running'
                    console.log('Upload is running');
                    break;
            }
        },
        (error) => {
            console.log(error);
        },
        () => {
            console.log("completed!")
        }
    );
    guidref = storageRef.child(make_ref());
}
// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];

let scene, camera, renderer, moveCube;

// Create an empty scene

const fov = 45;
const videoScreenDistance = 900.0;


const cube = new THREE.Mesh(
    new THREE.BoxGeometry( 0.02, 0.02, 0.02),
    new THREE.MeshBasicMaterial( { color: "#433F81" } )
);


function initRenderer() {
    const aspect = videoElement.videoWidth/videoElement.videoHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( fov, aspect, 0.1, 1000 );
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setClearColor("#000000");
    renderer.setSize( videoElement.videoWidth, videoElement.videoHeight );
    document.getElementById("rendererTarget").append(renderer.domElement);
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    const videoMaterial =  new THREE.MeshBasicMaterial( {map: videoTexture, side: THREE.BackSide, toneMapped: false} );
    //Create screen
    const screen = new THREE.PlaneGeometry(
        2 * aspect * videoScreenDistance * Math.tan(Math.PI * fov / 2 / 180),
        2 * videoScreenDistance * Math.tan(Math.PI * fov / 2 / 180),
        1);
    const videoScreen = new THREE.Mesh(screen, videoMaterial);
    videoScreen.position.z = -videoScreenDistance;
    videoScreen.rotation.y = Math.PI;
    scene.add(videoScreen);

    moveCube = function(px, py) {
        const distance = 0.3;
        const factor = distance * Math.tan(Math.PI * fov / 2 / 180);
        videoElement.videoHeight
        cube.position.x = (1 - 2 * px) * aspect * factor;
        cube.position.y = (1 - 2 * py) * factor;
        cube.position.z = -distance;
    }

    cube.position.z = -4;
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



// ------------------------------------------------
// FUN STARTS HERE
// ------------------------------------------------

// Create a Cube Mesh with basic material
// var geometry = new THREE.BoxGeometry( 1, 1, 1 );

// const texture = new THREE.VideoTexture( videoElement );

// const geometry = new THREE.PlaneBufferGeometry();
// const material = new THREE.MeshBasicMaterial( { map: texture } );

// var material = new THREE.MeshBasicMaterial( { color: "#433F81" } );

// let cube = new THREE.Mesh( geometry, material );

// Add cube to Scene
// scene.add( cube );



// Render Loop



// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new FPS();

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


    // Update the frame rate.
    // fpsControl.tick();

    // Draw the overlays.
    // renderer.drawImage(results.image, 0, 0, renderer.width, renderer.height);

    // get lip points
    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {

            // Is the mouth open?
            let isMouthOpen = (Math.pow(landmarks[13].x - landmarks[14].x, 2) +
                Math.pow(landmarks[13].y - landmarks[14].y, 2)) * 5 >
                Math.pow(landmarks[291].x - landmarks[62].x, 2) +
                Math.pow(landmarks[291].y - landmarks[62].y, 2);

            moveCube(
                (landmarks[13].x + landmarks[14].x)/2,
                (landmarks[13].y + landmarks[14].y)/2
            );

            if (isMouthOpen) {
                // canvasCtx.fillStyle = "#30ff30";
                if (!wasPreviousMouthOpen) {
                    // mouth just opened,
                    // make the object fly to the mouth.
                }

            } else {
                //canvasCtx.fillStyle = "#ff3030";
                if (isSoundPlayable && wasPreviousMouthOpen) {
                    isSoundPlayable = false;
                    new Audio("crunch_sound.ogg").play();
                    setTimeout(
                        function() {isSoundPlayable = true;},
                        300
                    )
                }
            }
            //canvasCtx.rect(10, 20, 150, 100);
            //canvasCtx.fill();

            wasPreviousMouthOpen = isMouthOpen;

            // do some hysteresis
        }
    }

    //canvasCtx.restore();
    // renderer.render(scene, camera);

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

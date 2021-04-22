// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');

// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new FPS();

// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

let isSoundPlayable = true;
let wasPreviousMouthOpen = true;

function onResults(results) {
    // Hide the spinner.
    document.body.classList.add('loaded');

    // Update the frame rate.
    fpsControl.tick();

    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);

    // get lip points
    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            // simple red light on whether it's open or not.

            // Green open mouth
            canvasCtx.beginPath();       // Start a new path
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeStyle = "#30ff30";
            canvasCtx.moveTo(landmarks[13].x * canvasCtx.canvas.width, landmarks[13].y * canvasCtx.canvas.height);
            canvasCtx.lineTo(landmarks[14].x * canvasCtx.canvas.width, landmarks[14].y * canvasCtx.canvas.height);
            canvasCtx.stroke();

            // Red mouth side to side
            canvasCtx.beginPath();
            canvasCtx.lineWidth = 3;
            canvasCtx.strokeStyle = "#ff3030";
            canvasCtx.moveTo(landmarks[291].x * canvasCtx.canvas.width, landmarks[291].y * canvasCtx.canvas.height);
            canvasCtx.lineTo(landmarks[62].x * canvasCtx.canvas.width, landmarks[62].y * canvasCtx.canvas.height);
            canvasCtx.stroke();

            let isMouthOpen = (Math.pow(landmarks[13].x - landmarks[14].x, 2) +
                Math.pow(landmarks[13].y - landmarks[14].y, 2)) * 5 >
                Math.pow(landmarks[291].x - landmarks[62].x, 2) +
                Math.pow(landmarks[291].y - landmarks[62].y, 2);

            if (isMouthOpen) {
                canvasCtx.fillStyle = "#30ff30";
            } else {
                canvasCtx.fillStyle = "#ff3030";
                if (isSoundPlayable && wasPreviousMouthOpen) {
                    isSoundPlayable = false;
                    new Audio("crunch_sound.ogg").play();
                    setTimeout(
                        function() {isSoundPlayable = true;},
                        300
                    )
                }
            }
            canvasCtx.rect(10, 20, 150, 100);
            canvasCtx.fill();

            wasPreviousMouthOpen = isMouthOpen;

            // do some hysteresis
        }
    }

    canvasCtx.restore();
}

const faceMesh = new FaceMesh({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
    }});
faceMesh.onResults(onResults);

// Instantiate a camera. We'll feed each frame we receive into the solution.
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({image: videoElement});
    },
    width: 1280,
    height: 720
});
camera.start();

// Present a control panel through which the user can manipulate the solution
// options.
new ControlPanel(controlsElement, {
    selfieMode: true,
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
})
    .add([
        new StaticText({title: 'MediaPipe Face Mesh'}),
        fpsControl,
        new Toggle({title: 'Selfie Mode', field: 'selfieMode'}),
        new Slider({
            title: 'Max Number of Faces',
            field: 'maxNumFaces',
            range: [1, 4],
            step: 1
        }),
        new Slider({
            title: 'Min Detection Confidence',
            field: 'minDetectionConfidence',
            range: [0, 1],
            step: 0.01
        }),
        new Slider({
            title: 'Min Tracking Confidence',
            field: 'minTrackingConfidence',
            range: [0, 1],
            step: 0.01
        }),
    ])
    .on(options => {
        videoElement.classList.toggle('selfie', options.selfieMode);
        faceMesh.setOptions(options);
    });
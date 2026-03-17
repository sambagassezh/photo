// ---------------- SUPABASE ----------------

const SUPABASE_URL = "https://fixpfxxlnuhwzvbgcykm.supabase.co"
const SUPABASE_KEY = "sb_publishable_9SUF0gKkr4337Ai9i4kCrg_pSaW2sSI"

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------- ELEMENTS ----------------

const cameraButton = document.getElementById("cameraButton")
const cameraInput = document.getElementById("cameraInput")
const preview = document.getElementById("preview")
const sendButton = document.getElementById("sendButton")

let currentCanvas = null


const ASSETS = [
    { img: "glasses.png", json: "glasses.json" },
    { img: "swisshat.png", json: "swisshat.json" },
    { img: "caipirinha.png", json: "caipirinha.json" }
]
// ---------------- CAMERA ----------------

cameraButton.addEventListener("click", () => {
    cameraInput.click()
})

cameraInput.addEventListener("change", async (event) => {

    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = function(e){

        const img = new Image()

        img.onload = async function(){

            const canvas = processImage(img)

            try {
                await addFaceOverlay(canvas)
            } catch (e) {
                console.log("Face overlay failed, continuing")
            }

            currentCanvas = canvas
            preview.src = canvas.toDataURL("image/jpeg",0.8)
        }

        img.src = e.target.result
    }

    reader.readAsDataURL(file)

})

// ---------------- IMAGE PROCESS ----------------

function processImage(img){

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    const MAX_SIZE = 800

    let w = img.width
    let h = img.height

    if(w > h && w > MAX_SIZE){
        h *= MAX_SIZE / w
        w = MAX_SIZE
    } else if(h > MAX_SIZE){
        w *= MAX_SIZE / h
        h = MAX_SIZE
    }

    canvas.width = w
    canvas.height = h

    ctx.drawImage(img,0,0,w,h)

    return canvas
}

// ---------------- FACE OVERLAY ----------------




async function addFaceOverlay(canvas){

    // load all configs
    const loadedAssets = []

    for (let asset of ASSETS) {
        try {
            const res = await fetch(asset.json)
            const config = await res.json()

            const img = new Image()
            img.src = asset.img

            await new Promise(resolve => {
                img.onload = resolve
            })

            loadedAssets.push({ config, img })
        } catch (e) {
            console.log("Failed loading asset:", asset)
        }
    }

    return new Promise((resolve) => {

        const faceMesh = new FaceMesh({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        })

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })

        faceMesh.onResults((results) => {

            if (!results.multiFaceLandmarks?.length) {
                resolve()
                return
            }

            const ctx = canvas.getContext("2d")
            const landmarks = results.multiFaceLandmarks[0]

            const w = canvas.width
            const h = canvas.height

            const leftEye = landmarks[33]
            const rightEye = landmarks[263]
            const nose = landmarks[1]
            const mouthLeft = landmarks[61]
            const mouthRight = landmarks[291]
            const forehead = landmarks[10]
            const getXY = (p) => [p.x * w, p.y * h]

            for (let asset of loadedAssets) {

                const { config, img } = asset
                const type = config.type

                let p1, p2

                if (type === "eyes") {
                    p1 = getXY(leftEye)
                    p2 = getXY(rightEye)
                }

                else if (type === "mouth") {
                    p1 = getXY(mouthLeft)
                    p2 = getXY(mouthRight)
                }

                else if (type === "hat") {
                    // use eyes as base width
                    p1 = getXY(leftEye)
                    p2 = getXY(rightEye)
                }

                else continue

                const [x1, y1] = p1
                const [x2, y2] = p2

                const dist = Math.hypot(x2 - x1, y2 - y1)
                const angle = Math.atan2(y2 - y1, x2 - x1)

                const imgW = img.width
                const imgH = img.height

                const a = config.anchors

                let a1, a2

                if (type === "eyes") {
                    a1 = a.leftEye
                    a2 = a.rightEye
                }

                else if (type === "mouth") {
                    a1 = a.leftMouth
                    a2 = a.rightMouth
                }

                else if (type === "hat") {
                    a1 = a.hatLeft
                    a2 = a.hatRight
                }

                const imgDist = (a2[0] - a1[0]) * imgW
                const scale = dist / imgDist

                ctx.save()

                // anchor on first point
                ctx.translate(x1, y1)
                ctx.rotate(angle)

                let offsetX = -a1[0] * imgW * scale
                let offsetY = -a1[1] * imgH * scale

                if (type === "hat") {

                    const [fx, fy] = getXY(landmarks[10]) // forehead

                    // shift upward relative to eyes → forehead
                    const eyeCenterY = (y1 + y2) / 2
                    const lift = eyeCenterY - fy

                    offsetY -= lift * 1.5
                }

                ctx.drawImage(
                    img,
                    offsetX,
                    offsetY,
                    imgW * scale,
                    imgH * scale
                )

                ctx.restore()
            }

            resolve()
        })

        faceMesh.send({ image: canvas })
        setTimeout(() => resolve(), 500)
    })
}
// ---------------- UPLOAD ----------------

sendButton.addEventListener("click", async () => {

    if (!currentCanvas) {
        alert("Take a picture first")
        return
    }

    const blob = await new Promise(resolve =>
        currentCanvas.toBlob(resolve, "image/jpeg", 0.8)
    )

    const fileName = `photo_${Date.now()}.jpg`

    const { error } = await supabaseClient
        .storage
        .from("photos")
        .upload(fileName, blob)

    if (error) {
        console.error(error)
        alert("Upload failed")
    } else {
        alert("Uploaded!")
    }

})
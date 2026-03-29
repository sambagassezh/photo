// ---------------- SUPABASE ----------------

const SUPABASE_URL = "https://fixpfxxlnuhwzvbgcykm.supabase.co"
const SUPABASE_KEY = "sb_publishable_9SUF0gKkr4337Ai9i4kCrg_pSaW2sSI"

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------- FLAGS ----------------

const ENABLE_SAFETY_CHECK = false
const ENABLE_BACKGROUND_REMOVAL = false // 🔒 disabled but kept

// ---------------- STATE ----------------

let currentCanvas = null
let originalImageGlobal = null
let faceApiReady = false
let lastUploadedFileName = null

// ---------------- MODES ----------------

const MODES = {
    mode1: {
        type: "filters",
        enabled: { eyes: true, mouth: true, hat: true },
        scale: { eyes: 1.0, mouth: 0.7, hat: 2.2 }
    },
    mode2: {
        type: "filters",
        enabled: { eyes: true, mouth: false, hat: false },
        scale: { eyes: 1.1, mouth: 0.6, hat: 2.0 }
    },
    mode3: {
        type: "filters",
        enabled: { eyes: false, mouth: true, hat: true },
        scale: { eyes: 1.0, mouth: 0.7, hat: 2.5 }
    },
    mode4: {
        type: "faixa"
    }
}

let CURRENT_MODE = "mode1"

// ---------------- LOAD FACE-API ----------------

window.addEventListener("load", async () => {
    console.log("Loading face-api model...")
    await faceapi.nets.tinyFaceDetector.loadFromUri('./models')
    await faceapi.nets.faceLandmark68Net.loadFromUri('./models')
    faceApiReady = true
    console.log("face-api ready ✅")
})

// ---------------- ELEMENTS ----------------

const cameraButton = document.getElementById("cameraButton")
const cameraInput = document.getElementById("cameraInput")
const preview = document.getElementById("preview")
const sendButton = document.getElementById("sendButton")

// ---------------- ASSETS ----------------

const ASSETS = [
    { img: "glasses.png", json: "glasses.json" },
    { img: "swisshat.png", json: "swisshat.json" },
    { img: "caipirinha.png", json: "caipirinha.json" }
]

// ---------------- MODE SWITCH ----------------

function setMode(mode) {
    CURRENT_MODE = mode
    console.log("Mode:", mode)

    if (!originalImageGlobal) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    canvas.width = originalImageGlobal.width
    canvas.height = originalImageGlobal.height

    ctx.drawImage(originalImageGlobal, 0, 0)

    addFaceOverlay(canvas, originalImageGlobal).then(() => {
        currentCanvas = canvas
        preview.src = canvas.toDataURL("image/png")
    })
}

// ---------------- CAMERA ----------------

cameraButton.addEventListener("click", () => {
    cameraInput.click()
})

cameraInput.addEventListener("change", async (event) => {

    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = function (e) {

        const img = new Image()

        img.onload = async function () {

            originalImageGlobal = img

            // 🔒 Background removal disabled
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")

            canvas.width = img.width
            canvas.height = img.height

            ctx.drawImage(img, 0, 0)

            await addFaceOverlay(canvas, img)

            currentCanvas = canvas
            preview.src = canvas.toDataURL("image/png")
        }

        img.src = e.target.result
    }

    reader.readAsDataURL(file)
})

// ---------------- FACE OVERLAY ----------------

async function addFaceOverlay(canvas, originalImage) {

    if (!faceApiReady) return

    const ctx = canvas.getContext("2d")
    const w = canvas.width
    const h = canvas.height

    const scaleX = w / originalImage.width
    const scaleY = h / originalImage.height

    const mode = MODES[CURRENT_MODE]

    const detections = await faceapi
        .detectAllFaces(originalImage, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()

    if (!detections.length) return

    // ---------------- FAIXA MODE ----------------
    if (mode.type === "faixa") {

        const faixa = new Image()
        faixa.src = "faixa_cropped.png"
        await new Promise(r => faixa.onload = r)

        // Use a 10% frame at top or bottom
        const FRAME_RATIO = 0.05
        const frameHeight = h * FRAME_RATIO
        const margin = Math.max(8, frameHeight * 0.08)

        // If any detected face intersects the bottom frame, move faixa to top
        let placeTop = false
        for (const det of detections) {
            const box = det.detection.box
            const by = box.y * scaleY
            const bBottom = by + (box.height * scaleY)

            const bottomFrameYStart = h - frameHeight
            if (bBottom > bottomFrameYStart) {
                placeTop = true
                break
            }
        }

        // target height fits inside the 10% frame with some margin
        const targetHeight = Math.max(40, frameHeight - margin * 2)
        const scale = targetHeight / faixa.height

        const fw = faixa.width * scale *7
        const fh = targetHeight * 7

        const x = (w - fw) / 2
        const y = placeTop ? margin : (h - fh - margin)

        ctx.drawImage(faixa, x, y, fw, fh)
        return
    }

    // ---------------- LOAD ASSETS ----------------

    const loadedAssets = []

    for (const asset of ASSETS) {
        const res = await fetch(asset.json)
        const config = await res.json()

        const img = new Image()
        img.src = asset.img
        await new Promise(r => img.onload = r)

        loadedAssets.push({ config, img })
    }

    // ---------------- APPLY EFFECTS ----------------

    for (const det of detections) {

        const lm = det.landmarks
        const box = det.detection.box

        const bx = box.x * scaleX
        const by = box.y * scaleY

        const leftEye = lm.getLeftEye()
        const rightEye = lm.getRightEye()
        const mouth = lm.getMouth()

        const lx = leftEye.reduce((s,p)=>s+p.x,0)/leftEye.length * scaleX
        const ly = leftEye.reduce((s,p)=>s+p.y,0)/leftEye.length * scaleY

        const rx = rightEye.reduce((s,p)=>s+p.x,0)/rightEye.length * scaleX
        const ry = rightEye.reduce((s,p)=>s+p.y,0)/rightEye.length * scaleY

        const baseDist = Math.hypot(rx - lx, ry - ly)

        for (const asset of loadedAssets) {

            const { config, img } = asset
            const type = config.type

            if (!mode.enabled[type]) continue

            const imgW = img.width
            const imgH = img.height

            let x1, y1, x2, y2

            if (type === "eyes") {
                x1 = lx; y1 = ly
                x2 = rx; y2 = ry
            }
            else if (type === "mouth") {
                const mL = mouth[3]
                const mR = mouth[9]

                x1 = mL.x * scaleX
                y1 = mL.y * scaleY
                x2 = mR.x * scaleX
                y2 = mR.y * scaleY
            }
            else {
                x1 = lx; y1 = ly
                x2 = rx; y2 = ry
            }

            const factor = mode.scale[type] || 1.0
            const dist = baseDist * factor

            let angle = (type === "mouth") ? 0 : Math.atan2(y2 - y1, x2 - x1)

            let a1, a2

            if (type === "eyes") {
                a1 = config.anchors.leftEye
                a2 = config.anchors.rightEye
            }
            else if (type === "mouth") {
                a1 = config.anchors.leftMouth
                a2 = config.anchors.rightMouth
            }
            else {
                a1 = config.anchors.hatLeft
                a2 = config.anchors.hatRight
            }

            const imgDist = (a2[0] - a1[0]) * imgW
            const scale = dist / imgDist

            ctx.save()
            ctx.translate(x1, y1)
            ctx.rotate(angle)

            let offsetX = -a1[0] * imgW * scale
            let offsetY = -a1[1] * imgH * scale

            // hat correction
            if (type === "hat") {
                const eyeCenterY = (y1 + y2) / 2
                const forehead = eyeCenterY - by
                offsetY -= forehead * 1.8
            }

            ctx.drawImage(img, offsetX, offsetY, imgW * scale, imgH * scale)
            ctx.restore()
        }
    }
}

// ---------------- CONSENT ----------------

function showConsentModal() {
    document.getElementById("consentModal").classList.remove("hidden")
}

function hideConsentModal() {
    document.getElementById("consentModal").classList.add("hidden")
}

async function handleConsent(consent) {

    console.log("Consent:", consent)

    if (!lastUploadedFileName) return

    const { error } = await supabaseClient
        .from("photo_metadata")
        .update({ consent: consent })
        .eq("filename", lastUploadedFileName)

    if (error) {
        console.error(error)
        alert("Failed to save consent")
        return
    }

    hideConsentModal()

    alert("Thanks! 🙌")
}
// ---------------- DOWNLOAD ----------------

function downloadImage() {
    if (!currentCanvas) return

    const link = document.createElement("a")
    link.download = "sambagasse_photo.png"
    link.href = currentCanvas.toDataURL("image/png")
    link.click()
}

// ---------------- UPLOAD ----------------

sendButton.addEventListener("click", async () => {

    if (!currentCanvas) {
        alert("Take a picture first")
        return
    }

    try {

        const blob = await new Promise(resolve =>
            currentCanvas.toBlob(resolve, "image/png")
        )

        const fileName = `photo_${Date.now()}.png`
        lastUploadedFileName = fileName

        // 👉 Upload image
        const { error: uploadError } = await supabaseClient
            .storage
            .from("photos")
            .upload(fileName, blob)

        if (uploadError) {
            console.error(uploadError)
            alert("Upload failed")
            return
        }

        // 👉 Create metadata FIRST (consent = null)
        const { error: dbError } = await supabaseClient
            .from("photo_metadata")
            .insert([{
                filename: fileName,
                consent: null,
                mode: CURRENT_MODE,
                created_at: new Date().toISOString()
            }])

        if (dbError) {
            console.error(dbError)
            alert("Metadata insert failed")
            return
        }

        // 👉 NOW ask consent
        showConsentModal()

    } catch (err) {
        console.error(err)
        alert("Something went wrong 😬")
    }
})
if (!window.fx) {
    console.error("glfx failed to load")
}

document.addEventListener("DOMContentLoaded", () => {

    console.log("Script loaded")

    // ---------------- SUPABASE ----------------

    const SUPABASE_URL = "https://fixpfxxlnuhwzvbgcykm.supabase.co"
    const SUPABASE_KEY = "sb_publishable_9SUF0gKkr4337Ai9i4kCrg_pSaW2sSI"

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

    // ---------------- ELEMENTS ----------------

    const cameraButton = document.getElementById("cameraButton")
    const cameraInput = document.getElementById("cameraInput")
    const preview = document.getElementById("preview")
    const sendButton = document.getElementById("sendButton")
    const filterButtons = document.querySelectorAll(".filter")

    let originalCanvas = null
    let currentCanvas = null

    // ---------------- COLORS ----------------

    const SAMBA_COLORS = [
        [252, 15, 35],
        [34, 34, 215],
        [252, 222, 70]
    ]

    // ---------------- CAMERA ----------------

    cameraButton.addEventListener("click", () => {
        cameraInput.click()
    })

    cameraInput.addEventListener("change", (event) => {

        const file = event.target.files[0]
        if (!file) return

        const reader = new FileReader()

        reader.onload = function (e) {

            const img = new Image()

            img.onload = function () {

                originalCanvas = processImage(img)
                currentCanvas = originalCanvas

                preview.src = originalCanvas.toDataURL("image/jpeg", 0.7)

            }

            img.src = e.target.result
        }

        reader.readAsDataURL(file)

    })

    // ---------------- FILTER SYSTEM ----------------

    filterButtons.forEach(btn => {

        const effect = btn.dataset.effect

        btn.addEventListener("click", () => applyEffect(effect))
        btn.addEventListener("touchstart", () => applyEffect(effect))

    })

    function applyEffect(effect) {

        if (!originalCanvas) {
            alert("Take a picture first")
            return
        }

        if (effect === "invert" || effect === "poster" || effect === "sobel" || effect === "none") {

            const canvas = document.createElement("canvas")
            canvas.width = originalCanvas.width
            canvas.height = originalCanvas.height

            const ctx = canvas.getContext("2d")
            ctx.drawImage(originalCanvas, 0, 0)

            if (effect === "invert") invertColors(canvas)
            if (effect === "poster") posterize(canvas)
            if (effect === "sobel") {
                sobelEdgeDetect(canvas)
                colorEdges(canvas)
            }

            currentCanvas = canvas
            preview.src = canvas.toDataURL("image/jpeg", 0.7)

            return
        }

        applyGLFX(effect)

    }

    // ---------------- GLFX FILTERS ----------------

    function applyGLFX(effect) {

        const image = new Image()
        image.src = originalCanvas.toDataURL()

        image.onload = function () {

            const canvasFX = fx.canvas()

            canvasFX.width = originalCanvas.width
            canvasFX.height = originalCanvas.height

            const texture = canvasFX.texture(image)

            canvasFX.draw(texture)

            if (effect === "sepia") {
                canvasFX.sepia(0.72)
            }

            if (effect === "zoom") {
                canvasFX.zoomBlur(
                    canvasFX.width / 2,
                    canvasFX.height / 2,
                    0.14
                )
            }

            if (effect === "ink") {
                canvasFX.ink(0.24)
            }

            if (effect === "dots") {
                canvasFX.dotScreen(
                    canvasFX.width / 2,
                    canvasFX.height / 2,
                    1.1,
                    3
                )
            }

            canvasFX.update()

            texture.destroy()

            currentCanvas = canvasFX

            preview.src = canvasFX.toDataURL()

        }

    }
    // ---------------- UPLOAD ----------------

    sendButton.addEventListener("click", async () => {

        if (!currentCanvas) {
            alert("Take a picture first!")
            return
        }

        // 1. Get Base64 for safety check
        const base64Data = currentCanvas.toDataURL("image/jpeg", 0.7).split(",")[1]

        // 2. Check Safety via Edge Function
        const isSafe = await checkSafeSearch(base64Data)

        if (isSafe) {

            const blob = await new Promise(resolve => {
                currentCanvas.toBlob(resolve, "image/jpeg", 0.7)
            })

            const filename = "photo_" + Date.now() + ".jpg"

            const { data, error } = await supabaseClient
                .storage
                .from("photos")
                .upload(filename, blob, { contentType: "image/jpeg" })

            if (error) {
                console.error(error)
                alert("Upload failed")
                return
            }
        } else {
            console.log("Image blocked by SafeSearch policy (Silent Rejection)")
        }

        // Always show success message
        alert("Photo sent to the wall!")

    })

    async function checkSafeSearch(base64Image) {
        console.log("Checking image safety via Supabase Edge Function...")

        try {
            const { data, error } = await supabaseClient.functions.invoke('check-safety', {
                body: { image: base64Image }
            })

            if (error) {
                console.error("Safety check failed (Function error), allowing by default.", error)
                return true
            }

            console.log("SafeSearch Result:", data)
            return data.safe

        } catch (err) {
            console.error("Safety check error, allowing by default:", err)
            return true
        }
    }

    // ---------------- IMAGE PROCESSING ----------------

    function processImage(img) {

        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        const MAX_SIZE = 800

        let w = img.width
        let h = img.height

        if (w > h && w > MAX_SIZE) {
            h = h * MAX_SIZE / w
            w = MAX_SIZE
        }
        else if (h > MAX_SIZE) {
            w = w * MAX_SIZE / h
            h = MAX_SIZE
        }

        canvas.width = w
        canvas.height = h

        ctx.drawImage(img, 0, 0, w, h)

        return canvas
    }

    function invertColors(canvas) {

        const ctx = canvas.getContext("2d")
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imgData.data

        for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i]
            d[i + 1] = 255 - d[i + 1]
            d[i + 2] = 255 - d[i + 2]
        }

        ctx.putImageData(imgData, 0, 0)
    }

    function posterize(canvas) {

        const ctx = canvas.getContext("2d")
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imgData.data

        for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.floor(d[i] / 64) * 64
            d[i + 1] = Math.floor(d[i + 1] / 64) * 64
            d[i + 2] = Math.floor(d[i + 2] / 64) * 64
        }

        ctx.putImageData(imgData, 0, 0)
    }

    function sobelEdgeDetect(canvas) {

        const ctx = canvas.getContext("2d")
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const data = imgData.data
        const w = canvas.width
        const h = canvas.height

        const gray = new Float32Array(w * h)

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            gray[i / 4] = (r + g + b) / 3
        }

        const output = new Float32Array(w * h)

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {

                const i = y * w + x

                const gx =
                    -gray[(y - 1) * w + (x - 1)] - 2 * gray[y * w + (x - 1)] - gray[(y + 1) * w + (x - 1)]
                    + gray[(y - 1) * w + (x + 1)] + 2 * gray[y * w + (x + 1)] + gray[(y + 1) * w + (x + 1)]

                const gy =
                    -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
                    + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)]

                output[i] = Math.sqrt(gx * gx + gy * gy)

            }
        }

        for (let i = 0; i < data.length; i += 4) {

            const val = output[i / 4]

            data[i] = val
            data[i + 1] = val
            data[i + 2] = val

        }

        ctx.putImageData(imgData, 0, 0)
    }

    function colorEdges(canvas) {

        const ctx = canvas.getContext("2d")
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const data = imgData.data

        for (let i = 0; i < data.length; i += 4) {

            const brightness = data[i]

            if (brightness > 80) {

                const c = SAMBA_COLORS[Math.floor(Math.random() * SAMBA_COLORS.length)]

                data[i] = c[0]
                data[i + 1] = c[1]
                data[i + 2] = c[2]

            } else {

                data[i] = 0
                data[i + 1] = 0
                data[i + 2] = 0

            }

        }

        ctx.putImageData(imgData, 0, 0)
    }

})
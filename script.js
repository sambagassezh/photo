document.addEventListener("DOMContentLoaded", () => {
    console.log("Script loaded");

    if (window.fx) {
        console.log("glfx loaded ✅");
    } else {
        console.error("glfx failed to load ❌");
    }

    // ---------------- SUPABASE ----------------

    const SUPABASE_URL = "https://fixpfxxlnuhwzvbgcykm.supabase.co";
    const SUPABASE_KEY = "sb_publishable_9SUF0gKkr4337Ai9i4kCrg_pSaW2sSI";
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // ---------------- FLAGS ----------------

    const ENABLE_SAFETY_CHECK = true;

    // ---------------- STATE ----------------

    let originalImageGlobal = null;
    let currentCanvas = null;
    let faceApiReady = false;
    let lastUploadedFileName = null;
    let CURRENT_MODE = "none";
    let CURRENT_FILTER = "none";

    const MODES = {
        none: { type: "none" },
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
    };

    const SAMBA_COLORS = [
        [252, 15, 35],
        [34, 34, 215],
        [252, 222, 70]
    ];

    // ---------------- ASSETS ----------------

    const ASSETS = [
        { img: "glasses.png", json: "glasses.json" },
        { img: "swisshat.png", json: "swisshat.json" },
        { img: "caipirinha.png", json: "caipirinha.json" }
    ];

    // ---------------- LOAD FACE-API ----------------

    async function loadFaceApi() {
        console.log("Loading face-api models...");
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
            faceApiReady = true;
            console.log("face-api ready ✅");
        } catch (err) {
            console.error("Failed to load face-api models:", err);
        }
    }
    loadFaceApi();

    // ---------------- ELEMENTS ----------------

    const cameraButton = document.getElementById("cameraButton");
    const cameraInput = document.getElementById("cameraInput");
    const preview = document.getElementById("preview");
    const sendButton = document.getElementById("sendButton");
    const filterButtons = document.querySelectorAll(".filter");

    // ---------------- CAMERA ----------------

    cameraButton.addEventListener("click", () => {
        cameraInput.click();
    });

    cameraInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = async function () {
                originalImageGlobal = img;
                await updatePreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ---------------- PREVIEW UPDATE ----------------

    async function updatePreview() {
        if (!originalImageGlobal) return;

        // 1. Process/Resize image
        let canvas = processImage(originalImageGlobal);

        // 2. Apply AR Overlay if needed
        if (CURRENT_MODE !== "none") {
            await addFaceOverlay(canvas, originalImageGlobal);
        }

        // 3. Apply Image Filter if needed
        if (CURRENT_FILTER !== "none") {
            canvas = await applyFilter(canvas, CURRENT_FILTER);
        }

        currentCanvas = canvas;
        preview.src = canvas.toDataURL("image/jpeg", 0.8);
    }

    // ---------------- MODE & FILTER SWITCH ----------------

    window.setMode = (mode) => {
        CURRENT_MODE = mode;
        console.log("Mode set to:", mode);
        updatePreview();
    };

    filterButtons.forEach(btn => {
        const effect = btn.dataset.effect;
        btn.addEventListener("click", () => {
            CURRENT_FILTER = effect;
            console.log("Filter set to:", effect);
            updatePreview();
        });
    });

    // ---------------- IMAGE PROCESSING ----------------

    function processImage(img) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const MAX_SIZE = 800;

        let w = img.width;
        let h = img.height;

        if (w > h && w > MAX_SIZE) {
            h = h * MAX_SIZE / w;
            w = MAX_SIZE;
        } else if (h > MAX_SIZE) {
            w = w * MAX_SIZE / h;
            h = MAX_SIZE;
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        return canvas;
    }

    async function applyFilter(inputCanvas, effect) {
        if (effect === "none") return inputCanvas;

        const canvas = document.createElement("canvas");
        canvas.width = inputCanvas.width;
        canvas.height = inputCanvas.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(inputCanvas, 0, 0);

        if (effect === "invert") invertColors(canvas);
        else if (effect === "poster") posterize(canvas);
        else if (effect === "sobel") {
            sobelEdgeDetect(canvas);
            colorEdges(canvas);
        } else {
            // GLFX Filters
            return await applyGLFX(inputCanvas, effect);
        }
        return canvas;
    }

    async function applyGLFX(inputCanvas, effect) {
        if (!window.fx) return inputCanvas;

        return new Promise((resolve) => {
            const image = new Image();
            image.src = inputCanvas.toDataURL();
            image.onload = function () {
                const canvasFX = fx.canvas();
                canvasFX.width = inputCanvas.width;
                canvasFX.height = inputCanvas.height;
                const texture = canvasFX.texture(image);
                canvasFX.draw(texture);

                if (effect === "sepia") canvasFX.sepia(0.72);
                else if (effect === "zoom") canvasFX.zoomBlur(canvasFX.width / 2, canvasFX.height / 2, 0.14);
                else if (effect === "ink") canvasFX.ink(0.24);
                else if (effect === "dots") canvasFX.dotScreen(canvasFX.width / 2, canvasFX.height / 2, 1.1, 3);

                canvasFX.update();
                texture.destroy();
                resolve(canvasFX);
            };
        });
    }

    // ---------------- FACE OVERLAY ----------------

    async function addFaceOverlay(canvas, originalImage) {
        if (!faceApiReady) return;

        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        const scaleX = w / originalImage.width;
        const scaleY = h / originalImage.height;

        const mode = MODES[CURRENT_MODE];
        const detections = await faceapi
            .detectAllFaces(originalImage, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();

        if (!detections.length) return;

        if (mode.type === "faixa") {
            const faixa = new Image();
            faixa.src = "faixa_cropped.png";
            await new Promise(r => faixa.onload = r);

            const FRAME_RATIO = 0.05;
            const frameHeight = h * FRAME_RATIO;
            const margin = Math.max(8, frameHeight * 0.08);

            let placeTop = false;
            for (const det of detections) {
                const box = det.detection.box;
                if ((box.y * scaleY + box.height * scaleY) > (h - frameHeight)) {
                    placeTop = true;
                    break;
                }
            }

            const targetHeight = Math.max(40, frameHeight - margin * 2);
            const scale = targetHeight / faixa.height;
            const fw = faixa.width * scale * 7;
            const fh = targetHeight * 7;
            const x = (w - fw) / 2;
            const y = placeTop ? margin : (h - fh - margin);

            ctx.drawImage(faixa, x, y, fw, fh);
            return;
        }

        // Load and apply assets
        const loadedAssets = [];
        for (const asset of ASSETS) {
            const res = await fetch(asset.json);
            const config = await res.json();
            const img = new Image();
            img.src = asset.img;
            await new Promise(r => img.onload = r);
            loadedAssets.push({ config, img });
        }

        for (const det of detections) {
            const lm = det.landmarks;
            const box = det.detection.box;
            const bx = box.x * scaleX;
            const by = box.y * scaleY;

            const leftEye = lm.getLeftEye();
            const rightEye = lm.getRightEye();
            const mouth = lm.getMouth();

            const lx = leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length * scaleX;
            const ly = leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length * scaleY;
            const rx = rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length * scaleX;
            const ry = rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length * scaleY;

            const baseDist = Math.hypot(rx - lx, ry - ly);

            for (const asset of loadedAssets) {
                const { config, img } = asset;
                const type = config.type;
                if (!mode.enabled[type]) continue;

                let x1, y1, x2, y2;
                if (type === "eyes") { x1 = lx; y1 = ly; x2 = rx; y2 = ry; }
                else if (type === "mouth") {
                    const mL = mouth[3]; const mR = mouth[9];
                    x1 = mL.x * scaleX; y1 = mL.y * scaleY; x2 = mR.x * scaleX; y2 = mR.y * scaleY;
                } else { x1 = lx; y1 = ly; x2 = rx; y2 = ry; }

                const factor = mode.scale[type] || 1.0;
                const dist = baseDist * factor;
                const angle = (type === "mouth") ? 0 : Math.atan2(y2 - y1, x2 - x1);

                let a1, a2;
                if (type === "eyes") { a1 = config.anchors.leftEye; a2 = config.anchors.rightEye; }
                else if (type === "mouth") { a1 = config.anchors.leftMouth; a2 = config.anchors.rightMouth; }
                else { a1 = config.anchors.hatLeft; a2 = config.anchors.hatRight; }

                const imgDist = (a2[0] - a1[0]) * img.width;
                const scale = dist / imgDist;

                ctx.save();
                ctx.translate(x1, y1);
                ctx.rotate(angle);
                let offsetX = -a1[0] * img.width * scale;
                let offsetY = -a1[1] * img.height * scale;
                if (type === "hat") {
                    const eyeCenterY = (y1 + y2) / 2;
                    const forehead = eyeCenterY - by;
                    offsetY -= forehead * 1.8;
                }
                ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
                ctx.restore();
            }
        }
    }

    // ---------------- UPLOAD ----------------

    sendButton.addEventListener("click", async () => {
        if (!currentCanvas) {
            alert("Take a picture first!");
            return;
        }

        // 1. Safety Check
        if (ENABLE_SAFETY_CHECK) {
            const base64Data = currentCanvas.toDataURL("image/jpeg", 0.7).split(",")[1];
            const isSafe = await checkSafeSearch(base64Data);
            if (!isSafe) {
                console.log("Image blocked by SafeSearch policy.");
                alert("Photo sent to the wall! (Private mode)"); // Silent rejection placeholder
                return;
            }
        }

        try {
            // 2. Upload to Supabase
            const blob = await new Promise(resolve => currentCanvas.toBlob(resolve, "image/jpeg", 0.8));
            const fileName = `photo_${Date.now()}.jpg`;
            lastUploadedFileName = fileName;

            const { error: uploadError } = await supabaseClient.storage.from("photos").upload(fileName, blob, { contentType: "image/jpeg" });
            if (uploadError) throw uploadError;

            // 3. Create Metadata
            const { error: dbError } = await supabaseClient.from("photo_metadata").insert([{
                filename: fileName,
                consent: null,
                mode: CURRENT_MODE,
                filter: CURRENT_FILTER,
                created_at: new Date().toISOString()
            }]);
            if (dbError) throw dbError;

            // 4. Consent
            showConsentModal();
        } catch (err) {
            console.error(err);
            alert("Something went wrong 😬");
        }
    });

    async function checkSafeSearch(base64Image) {
        console.log("Checking image safety...");
        try {
            const { data, error } = await supabaseClient.functions.invoke('check-safety', {
                body: { image: base64Image }
            });
            if (error) return true;
            return data.safe;
        } catch (err) {
            return true;
        }
    }

    // ---------------- CONSENT & DOWNLOAD ----------------

    window.showConsentModal = () => document.getElementById("consentModal").classList.remove("hidden");
    window.hideConsentModal = () => document.getElementById("consentModal").classList.add("hidden");

    window.handleConsent = async (consent) => {
        if (!lastUploadedFileName) return;
        const { error } = await supabaseClient.from("photo_metadata").update({ consent: consent }).eq("filename", lastUploadedFileName);
        if (error) console.error(error);
        hideConsentModal();
        alert("Thanks! 🙌 Photo sent to the wall!");
    };

    window.downloadImage = () => {
        if (!currentCanvas) return;
        const link = document.createElement("a");
        link.download = "sambagasse_photo.jpg";
        link.href = currentCanvas.toDataURL("image/jpeg", 0.9);
        link.click();
    };

    // ---------------- IMAGE HELPERS ----------------

    function invertColors(canvas) {
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2];
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function posterize(canvas) {
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            d[i] = Math.floor(d[i] / 64) * 64;
            d[i + 1] = Math.floor(d[i + 1] / 64) * 64;
            d[i + 2] = Math.floor(d[i + 2] / 64) * 64;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function sobelEdgeDetect(canvas) {
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;
        const gray = new Float32Array(w * h);
        for (let i = 0; i < data.length; i += 4) gray[i / 4] = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const output = new Float32Array(w * h);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = y * w + x;
                const gx = -gray[(y - 1) * w + (x - 1)] - 2 * gray[y * w + (x - 1)] - gray[(y + 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)] + 2 * gray[y * w + (x + 1)] + gray[(y + 1) * w + (x + 1)];
                const gy = -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)] + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
                output[i] = Math.sqrt(gx * gx + gy * gy);
            }
        }
        for (let i = 0; i < data.length; i += 4) {
            const val = output[i / 4];
            data[i] = data[i + 1] = data[i + 2] = val;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function colorEdges(canvas) {
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 80) {
                const c = SAMBA_COLORS[Math.floor(Math.random() * SAMBA_COLORS.length)];
                data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
            } else {
                data[i] = data[i + 1] = data[i + 2] = 0;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }
});
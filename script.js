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


    async function applyGLFX(inputCanvas, effect) {
        if (!window.fx) return inputCanvas;

        return new Promise((resolve) => {

            const canvasFX = fx.canvas();
            canvasFX.width = inputCanvas.width;
            canvasFX.height = inputCanvas.height;

            const texture = canvasFX.texture(inputCanvas); // 👈 FIX HERE
            canvasFX.draw(texture);

            if (effect === "zoom") {
                canvasFX.sepia(0.8);
            }
            else if (effect === "dots") {
                canvasFX.dotScreen(
                    canvasFX.width / 2,
                    canvasFX.height / 2,
                    1.5,
                    6
                );
            }

            canvasFX.update();
            texture.destroy();

            // convert back to normal canvas
            const output = document.createElement("canvas");
            output.width = canvasFX.width;
            output.height = canvasFX.height;

            const ctx = output.getContext("2d");
            ctx.drawImage(canvasFX, 0, 0);

            resolve(output);
        });
    }
    // ---------------- FLAGS ----------------

    const ENABLE_SAFETY_CHECK = true;


    const BACKGROUND_ICONS = {
        white: null,
        yellow: "amarelo.png",
        red: "vermelho.png",
        blue: "azul.png"
    };

    
    const ICON_CONFIG = {
        white: null,

        yellow: {
            src: "amarelo.png",
            size: 200,
            x: "right",   // right, center, left OR number
            y: "top",  // bottom, center, top OR number
            offsetX: +80,
            offsetY: -60,
            rotation: 0
        },

        red: {
            src: "vermelho.png",
            size: 100,
            x: "right",
            y: "bottom",
            offsetX: +20,
            offsetY: +0,
            rotation: -0.5 // radians (~ -17°)
        },

        blue: {
            src: "azul.png",
            size: 300,
            x: "center",
            y: "top",
            offsetX: 0,
            offsetY: +30,
            rotation: 0.0
        }
    };


    const ICON_IMAGES = {};
    async function applyFilter(inputCanvas, effect) {
        if (effect === "none") return inputCanvas;

        const canvas = document.createElement("canvas");
        canvas.width = inputCanvas.width;
        canvas.height = inputCanvas.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(inputCanvas, 0, 0);

        if (effect === "invert") {
            invertColors(canvas);
            return canvas;
        }

        // GLFX filters
        return await applyGLFX(canvas, effect);
    }
    async function preloadIcons() {
        for (const key in ICON_CONFIG) {
            const config = ICON_CONFIG[key];
            if (!config) continue;

            const img = new Image();
            img.src = config.src;
            await new Promise(r => img.onload = r);

            ICON_IMAGES[key] = img;
        }
    }

    // ---------------- STATE ----------------

    let originalImageGlobal = null;
    let currentCanvas = null;

    let CURRENT_FILTER = "none";
    let CURRENT_BACKGROUND = "white";
    window.setBackground = (bg) => {
        CURRENT_BACKGROUND = bg;
        updatePreview();
    };
    // let faceApiReady = false;
    let lastUploadedFileName = null;
    let CURRENT_MODE = "none";
    // let CURRENT_FILTER = "none";

    // ---------------- BACKGROUNDS ----------------

    const BACKGROUNDS = {
        white: "#ffffff",
        yellow: "#f7e733",
        red: "#ff3b30",
        blue: "#3478f6"
    };

    // ---------------- ACTIVE FILTERS ----------------

    const ACTIVE_FILTERS = ["none", "invert", "zoom", "dots"];


    // ---------------- DEFAULTS ----------------

    const DEFAULTS = {
        filter: "none",
        background: "white"
    };

    // ---------------- TEXT ----------------

    const TEXT_LINES = [
        "SAMBAGASSE",
        "Zürich • 12.04"
    ];

    // ---------------- TEXT COLORS ----------------

    const TEXT_COLORS = {
        light: "black",
        dark: "black"
    };
    // const MODES = {
    //     none: { type: "none" },
    //     mode1: {
    //         type: "filters",
    //         enabled: { eyes: true, mouth: true, hat: true },
    //         scale: { eyes: 1.0, mouth: 0.7, hat: 2.2 }
    //     },
    //     mode2: {
    //         type: "filters",
    //         enabled: { eyes: true, mouth: false, hat: false },
    //         scale: { eyes: 1.1, mouth: 0.6, hat: 2.0 }
    //     },
    //     mode3: {
    //         type: "filters",
    //         enabled: { eyes: false, mouth: true, hat: true },
    //         scale: { eyes: 1.0, mouth: 0.7, hat: 2.5 }
    //     },
    //     mode4: {
    //         type: "faixa"
    //     }
    const MODES = {
        none: { type: "none" },
        mode1: { type: "faixa" },
        mode2: { type: "faixa" },
        mode3: { type: "faixa" },
        mode4: { type: "faixa" }
        };
    

    const SAMBA_COLORS = [
        [252, 15, 35],
        [34, 34, 215],
        [252, 222, 70]
    ];


    async function preloadIcons() {
        for (const key in BACKGROUND_ICONS) {
            const path = BACKGROUND_ICONS[key];
            if (!path) continue;

            const img = new Image();
            img.src = path;
            await new Promise(r => img.onload = r);

            ICON_IMAGES[key] = img;
        }
    }

    preloadIcons();
    // ---------------- ASSETS ----------------

    const ASSETS = [
        { img: "glasses.png", json: "glasses.json" },
        { img: "swisshat.png", json: "swisshat.json" },
        { img: "caipirinha.png", json: "caipirinha.json" }
    ];

    // ---------------- LOAD FACE-API ----------------

    // async function loadFaceApi() {
    //     console.log("Loading face-api models...");
    //     try {
    //         await faceapi.nets.tinyFaceDetector.loadFromUri('./models');
    //         await faceapi.nets.faceLandmark68Net.loadFromUri('./models');
    //         faceApiReady = true;
    //         console.log("face-api ready ✅");
    //     } catch (err) {
    //         console.error("Failed to load face-api models:", err);
    //     }
    // }
    // loadFaceApi();

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
        // let canvas = await processImage(originalImageGlobal);

        // // 2. Apply AR Overlay if needed
        // if (CURRENT_MODE !== "none") {
        //     // await addFaceOverlay(canvas, originalImageGlobal);
        //     await addFaceOverlay(canvas);
        // }

        // // 3. Apply Image Filter if needed
        // if (CURRENT_FILTER !== "none") {
        //     canvas = await applyFilter(canvas, CURRENT_FILTER);
        // }

        // 1. create photo-only canvas
        let photoCanvas = document.createElement("canvas");
        let pctx = photoCanvas.getContext("2d");

        photoCanvas.width = originalImageGlobal.width;
        photoCanvas.height = originalImageGlobal.height;

        pctx.drawImage(originalImageGlobal, 0, 0);

        // 2. apply filter ONLY to photo
        if (CURRENT_FILTER !== "none") {
            photoCanvas = await applyFilter(photoCanvas, CURRENT_FILTER);
        }

        // 3. build final image with frame
        let canvas = await processImage(photoCanvas);

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

            if (effect === "none") {
                // FULL RESET
                CURRENT_FILTER = "none";
                CURRENT_MODE = "none";
                console.log("Reset everything 🧼");
            } else {
                CURRENT_FILTER = effect;
                console.log("Filter set to:", effect);
            }

            updatePreview();
        });
    });

    // ---------------- IMAGE PROCESSING ----------------

    async function processImage(img) {

        const MAX_SIZE = 800;

        // ---------------- NORMALIZE INPUT ----------------
        // (fix GLFX / canvas / image inconsistencies)
        let sourceCanvas = document.createElement("canvas");
        let sctx = sourceCanvas.getContext("2d");

        sourceCanvas.width = img.width;
        sourceCanvas.height = img.height;
        sctx.drawImage(img, 0, 0);

        let w = sourceCanvas.width;
        let h = sourceCanvas.height;

        // ---------------- HANDLE LANDSCAPE ----------------
        const isLandscape = w > h;

        if (isLandscape) {
            // crop center to make it more portrait-like
            const targetRatio = 4 / 5; // nice vertical ratio

            let newW = w;
            let newH = w / targetRatio;

            if (newH > h) {
                newH = h;
                newW = h * targetRatio;
            }

            const cropX = (w - newW) / 2;
            const cropY = (h - newH) / 2;

            let cropped = document.createElement("canvas");
            let cctx = cropped.getContext("2d");

            cropped.width = newW;
            cropped.height = newH;

            cctx.drawImage(
                sourceCanvas,
                cropX, cropY, newW, newH,
                0, 0, newW, newH
            );

            sourceCanvas = cropped;
            w = newW;
            h = newH;
        }

        // ---------------- RESIZE ----------------
        if (w > MAX_SIZE || h > MAX_SIZE) {
            const scaleFactor = Math.min(MAX_SIZE / w, MAX_SIZE / h);
            w *= scaleFactor;
            h *= scaleFactor;
        }

        // ---------------- GLOBAL SCALE ----------------
        const BASE_WIDTH = 300;
        const SCALE = w / BASE_WIDTH;

        // ---------------- MARGINS ----------------
        const marginX = w * 0.08;
        const marginTop = h * 0.08;
        const marginBottom = h * 0.22;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = w + marginX * 2;
        canvas.height = h + marginTop + marginBottom;

        const x = marginX;
        const y = marginTop;

        // ---------------- LOAD TEXTURE SAFELY ----------------
        let pattern = null;

        try {
            const texture = new Image();
            texture.src = "Texture1.png";

            await new Promise((resolve, reject) => {
                texture.onload = resolve;
                texture.onerror = resolve; // fail safe
            });

            const textureScale = 0.4 * SCALE;

            const tempCanvas = document.createElement("canvas");
            const tctx = tempCanvas.getContext("2d");

            tempCanvas.width = texture.width * textureScale;
            tempCanvas.height = texture.height * textureScale;

            tctx.drawImage(texture, 0, 0, tempCanvas.width, tempCanvas.height);

            pattern = ctx.createPattern(tempCanvas, "repeat");

        } catch (e) {
            console.warn("Texture failed");
        }

        // ---------------- BACKGROUND ----------------
        ctx.fillStyle = BACKGROUNDS[CURRENT_BACKGROUND];
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (pattern) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
        }

        // ---------------- WHITE PHOTO AREA ----------------
        ctx.fillStyle = "white";
        ctx.fillRect(x, y, w, h);

        // ---------------- ROUNDED CLIP ----------------
        const radius = 20 * SCALE;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, x, y, w, h);

        ctx.restore();

        // ---------------- TEXT ----------------
        const centerX = canvas.width / 2;
        const baseY = canvas.height - marginBottom / 2;

        ctx.fillStyle = (CURRENT_BACKGROUND === "white" || CURRENT_BACKGROUND === "yellow") ? "black" : "white";

        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4 * SCALE;

        ctx.textAlign = "center";

        ctx.font = `bold ${28 * SCALE}px Arial`;
        ctx.fillText("Sambagasse", centerX, baseY - 10 * SCALE);

        ctx.font = `${20 * SCALE}px Arial`;
        ctx.fillText("Zürich • 12.04.2026", centerX, baseY + 20 * SCALE);

        // ---------------- ICON ----------------
        const config = ICON_CONFIG[CURRENT_BACKGROUND];
        const icon = ICON_IMAGES[CURRENT_BACKGROUND];

        if (config && icon) {

            const size = config.size * SCALE;

            let xPos = (config.x === "right") ? canvas.width - size :
                    (config.x === "center") ? canvas.width / 2 - size / 2 :
                    (config.x === "left") ? 0 : config.x;

            let yPos = (config.y === "bottom") ? canvas.height - size :
                    (config.y === "center") ? canvas.height / 2 - size / 2 :
                    (config.y === "top") ? 0 : config.y;

            xPos += (config.offsetX || 0) * SCALE;
            yPos += (config.offsetY || 0) * SCALE;

            ctx.save();
            ctx.translate(xPos + size / 2, yPos + size / 2);
            ctx.rotate(config.rotation || 0);
            ctx.drawImage(icon, -size / 2, -size / 2, size, size);
            ctx.restore();
        }

        return canvas;
    }
    // ---------------- FACE OVERLAY ----------------

    // async function addFaceOverlay(canvas, originalImage) {
    //     if (!faceApiReady) return;

    //     const ctx = canvas.getContext("2d");
    //     const w = canvas.width;
    //     const h = canvas.height;
    //     const scaleX = w / originalImage.width;
    //     const scaleY = h / originalImage.height;

    //     const mode = MODES[CURRENT_MODE];
    //     const detections = await faceapi
    //         .detectAllFaces(originalImage, new faceapi.TinyFaceDetectorOptions())
    //         .withFaceLandmarks();

    //     if (!detections.length) return;

    //     if (mode.type === "faixa") {
    //         const faixa = new Image();
    //         faixa.src = "faixa_cropped.png";
    //         await new Promise(r => faixa.onload = r);

    //         const FRAME_RATIO = 0.05;
    //         const frameHeight = h * FRAME_RATIO;
    //         const margin = Math.max(8, frameHeight * 0.08);

    //         let placeTop = false;
    //         for (const det of detections) {
    //             const box = det.detection.box;
    //             if ((box.y * scaleY + box.height * scaleY) > (h - frameHeight)) {
    //                 placeTop = true;
    //                 break;
    //             }
    //         }

    //         const targetHeight = Math.max(40, frameHeight - margin * 2);
    //         const scale = targetHeight / faixa.height;
    //         const fw = faixa.width * scale * 7;
    //         const fh = targetHeight * 7;
    //         const x = (w - fw) / 2;
    //         const y = placeTop ? margin : (h - fh - margin);

    //         ctx.drawImage(faixa, x, y, fw, fh);
    //         return;
    //     }

    //     // Load and apply assets
    //     const loadedAssets = [];
    //     for (const asset of ASSETS) {
    //         const res = await fetch(asset.json);
    //         const config = await res.json();
    //         const img = new Image();
    //         img.src = asset.img;
    //         await new Promise(r => img.onload = r);
    //         loadedAssets.push({ config, img });
    //     }

    //     for (const det of detections) {
    //         const lm = det.landmarks;
    //         const box = det.detection.box;
    //         const bx = box.x * scaleX;
    //         const by = box.y * scaleY;

    //         const leftEye = lm.getLeftEye();
    //         const rightEye = lm.getRightEye();
    //         const mouth = lm.getMouth();

    //         const lx = leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length * scaleX;
    //         const ly = leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length * scaleY;
    //         const rx = rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length * scaleX;
    //         const ry = rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length * scaleY;

    //         const baseDist = Math.hypot(rx - lx, ry - ly);

    //         for (const asset of loadedAssets) {
    //             const { config, img } = asset;
    //             const type = config.type;
    //             if (!mode.enabled[type]) continue;

    //             let x1, y1, x2, y2;
    //             if (type === "eyes") { x1 = lx; y1 = ly; x2 = rx; y2 = ry; }
    //             else if (type === "mouth") {
    //                 const mL = mouth[3]; const mR = mouth[9];
    //                 x1 = mL.x * scaleX; y1 = mL.y * scaleY; x2 = mR.x * scaleX; y2 = mR.y * scaleY;
    //             } else { x1 = lx; y1 = ly; x2 = rx; y2 = ry; }

    //             const factor = mode.scale[type] || 1.0;
    //             const dist = baseDist * factor;
    //             const angle = (type === "mouth") ? 0 : Math.atan2(y2 - y1, x2 - x1);

    //             let a1, a2;
    //             if (type === "eyes") { a1 = config.anchors.leftEye; a2 = config.anchors.rightEye; }
    //             else if (type === "mouth") { a1 = config.anchors.leftMouth; a2 = config.anchors.rightMouth; }
    //             else { a1 = config.anchors.hatLeft; a2 = config.anchors.hatRight; }

    //             const imgDist = (a2[0] - a1[0]) * img.width;
    //             const scale = dist / imgDist;

    //             ctx.save();
    //             ctx.translate(x1, y1);
    //             ctx.rotate(angle);
    //             let offsetX = -a1[0] * img.width * scale;
    //             let offsetY = -a1[1] * img.height * scale;
    //             if (type === "hat") {
    //                 const eyeCenterY = (y1 + y2) / 2;
    //                 const forehead = eyeCenterY - by;
    //                 offsetY -= forehead * 1.8;
    //             }
    //             ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
    //             ctx.restore();
    //         }
    //     }
    // }


    async function addFaceOverlay(canvas) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;

        const faixa = new Image();
        faixa.src = "faixa_cropped.png";
        await new Promise(r => faixa.onload = r);

        const FRAME_RATIO = 0.08;
        const margin = 10;

        const targetHeight = h * FRAME_RATIO;
        const scale = targetHeight / faixa.height;

        const fw = faixa.width * scale;
        const fh = faixa.height * scale;

        const x = (w - fw) / 2;
        const y = h - fh - margin;

        ctx.drawImage(faixa, x, y, fw, fh);
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
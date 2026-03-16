document.addEventListener("DOMContentLoaded", () => {

if (!window.supabase) {
    console.error("Supabase library failed to load")
}

const SUPABASE_URL = "https://fixpfxxlnuhwzvbgcykm.supabase.co"
const SUPABASE_KEY = "sb_publishable_9SUF0gKkr4337Ai9i4kCrg_pSaW2sSI"

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

console.log("Supabase loaded", supabaseClient)

const cameraButton = document.getElementById("cameraButton")
const cameraInput = document.getElementById("cameraInput")
const preview = document.getElementById("preview")
const effectButtons = document.querySelectorAll(".effectBtn")
const sendButton = document.getElementById("sendButton")

let originalCanvas = null
let currentCanvas = null

const SAMBA_COLORS = [
    [252,15,35],
    [34,34,215],
    [252,222,70]
]

cameraButton.addEventListener("click", () => {
    cameraInput.click()
})

cameraInput.addEventListener("change", (event) => {

    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = function(e){

        const img = new Image()

        img.onload = function(){

            originalCanvas = processImage(img)
            currentCanvas = originalCanvas

            preview.src = originalCanvas.toDataURL("image/jpeg",0.7)

        }

        img.src = e.target.result
    }

    reader.readAsDataURL(file)

})

effectButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        if(!originalCanvas){
            alert("Take a picture first!")
            return
        }

        const effect = btn.dataset.effect

        const canvas = document.createElement("canvas")
        canvas.width = originalCanvas.width
        canvas.height = originalCanvas.height

        const ctx = canvas.getContext("2d")
        ctx.drawImage(originalCanvas,0,0)

        if(effect === "sobel"){
            sobelEdgeDetect(canvas)
            colorEdges(canvas)
        }

        if(effect === "invert"){
            invertColors(canvas)
        }

        if(effect === "poster"){
            posterize(canvas)
        }

        if(effect === "none"){
            ctx.drawImage(originalCanvas,0,0)
        }

        currentCanvas = canvas
        preview.src = canvas.toDataURL("image/jpeg",0.7)

    })

})

sendButton.addEventListener("click", async () => {

    if(!currentCanvas){
        alert("Take a picture first!")
        return
    }

    const dataURL = currentCanvas.toDataURL("image/jpeg",0.7)

    await uploadToSupabase(dataURL)

    alert("Photo sent to the wall!")

})

function processImage(img){

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    const MAX_SIZE = 800

    let w = img.width
    let h = img.height

    if(w > h && w > MAX_SIZE){
        h = h * MAX_SIZE / w
        w = MAX_SIZE
    } 
    else if(h > MAX_SIZE){
        w = w * MAX_SIZE / h
        h = MAX_SIZE
    }

    canvas.width = w
    canvas.height = h

    ctx.drawImage(img,0,0,w,h)

    return canvas
}

function invertColors(canvas){

    const ctx = canvas.getContext("2d")
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height)
    const d = imgData.data

    for(let i=0;i<d.length;i+=4){
        d[i]   = 255-d[i]
        d[i+1] = 255-d[i+1]
        d[i+2] = 255-d[i+2]
    }

    ctx.putImageData(imgData,0,0)

}

function posterize(canvas){

    const ctx = canvas.getContext("2d")
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height)
    const d = imgData.data

    for(let i=0;i<d.length;i+=4){
        d[i]   = Math.floor(d[i]/64)*64
        d[i+1] = Math.floor(d[i+1]/64)*64
        d[i+2] = Math.floor(d[i+2]/64)*64
    }

    ctx.putImageData(imgData,0,0)

}

function sobelEdgeDetect(canvas){

    const ctx = canvas.getContext("2d")
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height)

    const data = imgData.data
    const w = canvas.width
    const h = canvas.height

    const gray = new Float32Array(w*h)

    for(let i=0;i<data.length;i+=4){
        const r=data[i]
        const g=data[i+1]
        const b=data[i+2]
        gray[i/4]=(r+g+b)/3
    }

    const output = new Float32Array(w*h)

    for(let y=1;y<h-1;y++){
        for(let x=1;x<w-1;x++){

            const i = y*w+x

            const gx =
                -gray[(y-1)*w+(x-1)] -2*gray[y*w+(x-1)] -gray[(y+1)*w+(x-1)]
                +gray[(y-1)*w+(x+1)] +2*gray[y*w+(x+1)] +gray[(y+1)*w+(x+1)]

            const gy =
                -gray[(y-1)*w+(x-1)] -2*gray[(y-1)*w+x] -gray[(y-1)*w+(x+1)]
                +gray[(y+1)*w+(x-1)] +2*gray[(y+1)*w+x] +gray[(y+1)*w+(x+1)]

            output[i]=Math.sqrt(gx*gx+gy*gy)

        }
    }

    for(let i=0;i<data.length;i+=4){

        const val = output[i/4]

        data[i]=val
        data[i+1]=val
        data[i+2]=val

    }

    ctx.putImageData(imgData,0,0)
}

function colorEdges(canvas){

    const ctx = canvas.getContext("2d")
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height)

    const data = imgData.data

    for(let i=0;i<data.length;i+=4){

        const brightness = data[i]

        if(brightness > 80){

            const c = SAMBA_COLORS[Math.floor(Math.random()*SAMBA_COLORS.length)]

            data[i]=c[0]
            data[i+1]=c[1]
            data[i+2]=c[2]

        }else{

            data[i]=0
            data[i+1]=0
            data[i+2]=0

        }

    }

    ctx.putImageData(imgData,0,0)
}

async function uploadToSupabase(dataURL){

    console.log("Preparing upload")

    const response = await fetch(dataURL)
    const blob = await response.blob()

    const filename = "photo_" + Date.now() + ".jpg"

    const { data, error } = await supabaseClient
        .storage
        .from("photos")
        .upload(filename, blob, {
            contentType: "image/jpeg"
        })

    if(error){
        console.error("Upload error:", error)
        return
    }

    console.log("Upload success:", data)

}

})
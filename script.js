const cameraButton = document.getElementById("cameraButton")
const cameraInput = document.getElementById("cameraInput")
const preview = document.getElementById("preview")
const SUPABASE_URL = "https://fixpfxlnuhwzvbgcykm.supabase.co"

const SUPABASE_KEY = "PASTE_YOUR_PUBLISHABLE_KEY_HERE"

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
)
const SAMBA_COLORS = [
    [252,15,35],   // red
    [34,34,215],   // blue
    [252,222,70]   // yellow
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

            const canvas = processImage(img)

            sobelEdgeDetect(canvas)

            colorEdges(canvas)

            preview.src = canvas.toDataURL("image/jpeg",0.7)

        }

        img.src = e.target.result
    }

    reader.readAsDataURL(file)

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
    } else if(h > MAX_SIZE){
        w = w * MAX_SIZE / h
        h = MAX_SIZE
    }

    canvas.width = w
    canvas.height = h

    ctx.drawImage(img,0,0,w,h)

    return canvas
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
